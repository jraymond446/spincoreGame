import type { Point } from '../data/geometry'
import type { StickActionState } from '../data/matchTypes'
import type { DefensiveVisualState } from './AnimationState'

export type ArenaProceduralAnimationTuning = {
  enabled: boolean
  footShuffle: boolean
  playerScaleMultiplier: number
  idleBobAmount: number
  movementBobAmount: number
  movementBobSpeed: number
  squashStretchAmount: number
  leanAmount: number
  lateralSwayAmount: number
  shadowPulseAmount: number
  stickLagAmount: number
  actionSnapAmount: number
  animationSpeedMultiplier: number
}

export type ArenaProceduralAnimationFrame = {
  animationTime: number
  movementSpeedVisual: number
  normalizedMovementDirection: Point
  currentVisualLean: number
  currentVisualForwardLean: number
  currentVisualBob: number
  currentVisualSway: number
  currentVisualSquash: number
  currentStrideImpact: number
  currentVisualFootPhase: number
  currentStickLagAngle: number
  currentActionPulse: number
  footStride: number
  footSpread: number
  shadowScaleX: number
  shadowScaleY: number
  stickActionAngle: number
  enabled: boolean
  footShuffleEnabled: boolean
}

export const arenaProceduralAnimationDefaults = {
  enabled: true,
  footShuffle: false,
  playerScaleMultiplier: 0.92,
  idleBobAmount: 0.65,
  movementBobAmount: 2.2,
  movementBobSpeed: 1.05,
  squashStretchAmount: 0.035,
  leanAmount: 4,
  lateralSwayAmount: 0.05,
  shadowPulseAmount: 0.12,
  stickLagAmount: 0.16,
  actionSnapAmount: 0.7,
  animationSpeedMultiplier: 1,
} as const satisfies ArenaProceduralAnimationTuning

export const arenaProceduralAnimationRanges = {
  playerScaleMultiplier: { min: 0.8, max: 1, step: 0.01 },
  idleBobAmount: { min: 0, max: 2, step: 0.05 },
  movementBobAmount: { min: 0, max: 4, step: 0.05 },
  movementBobSpeed: { min: 0.5, max: 2, step: 0.05 },
  squashStretchAmount: { min: 0, max: 0.15, step: 0.005 },
  leanAmount: { min: 0, max: 10, step: 0.25 },
  lateralSwayAmount: { min: 0, max: 2, step: 0.05 },
  shadowPulseAmount: { min: 0, max: 0.3, step: 0.01 },
  stickLagAmount: { min: 0, max: 0.35, step: 0.01 },
  actionSnapAmount: { min: 0, max: 1, step: 0.05 },
  animationSpeedMultiplier: { min: 0.5, max: 2, step: 0.05 },
} as const

type ArenaProceduralAnimationInput = {
  deltaMs: number
  velocity: Point
  bodyRotation: number
  aimAngle: number
  mountSign: -1 | 1
  stickState: StickActionState
  defenseState: DefensiveVisualState
  charge: number
  reducedMotion: boolean
  tuning: ArenaProceduralAnimationTuning
}

const maxStickLagRadians = 0.11

export class ArenaProceduralAnimationController {
  private animationTime: number
  private movementSpeedVisual = 0
  private normalizedMovementDirection: Point = { x: 1, y: 0 }
  private currentVisualLean = 0
  private currentVisualForwardLean = 0
  private currentVisualBob = 0
  private currentVisualSway = 0
  private currentVisualSquash = 0
  private currentStrideImpact = 0.5
  private currentVisualFootPhase = 0
  private currentStickLagAngle = 0
  private currentActionPulse = 0
  private visualAimAngle = 0
  private aimInitialized = false
  private lastActionKey = ''
  private stickActionDirection = 0
  private readonly frame: ArenaProceduralAnimationFrame

  constructor(phase = 0) {
    this.animationTime = phase
    this.frame = {
      animationTime: phase,
      movementSpeedVisual: 0,
      normalizedMovementDirection: this.normalizedMovementDirection,
      currentVisualLean: 0,
      currentVisualForwardLean: 0,
      currentVisualBob: 0,
      currentVisualSway: 0,
      currentVisualSquash: 0,
      currentStrideImpact: 0.5,
      currentVisualFootPhase: 0,
      currentStickLagAngle: 0,
      currentActionPulse: 0,
      footStride: 0,
      footSpread: 0,
      shadowScaleX: 1,
      shadowScaleY: 1,
      stickActionAngle: 0,
      enabled: true,
      footShuffleEnabled: true,
    }
  }

  update(input: ArenaProceduralAnimationInput): ArenaProceduralAnimationFrame {
    const deltaSeconds = clamp(input.deltaMs / 1000, 0, 0.05)
    const speed = Math.hypot(input.velocity.x, input.velocity.y)
    const targetMovement = clamp(speed / 9, 0, 1)
    this.movementSpeedVisual = damp(
      this.movementSpeedVisual,
      targetMovement,
      11,
      deltaSeconds,
    )
    this.updateMovementDirection(input.velocity, speed, deltaSeconds)

    if (!this.aimInitialized) {
      this.visualAimAngle = input.aimAngle
      this.aimInitialized = true
    }

    if (!input.tuning.enabled || input.reducedMotion) {
      this.resetMotion(input.aimAngle, deltaSeconds)
      return this.writeFrame(input, 0, 0)
    }

    const animationRate =
      (2.2 + this.movementSpeedVisual * 7.8) *
      input.tuning.movementBobSpeed *
      input.tuning.animationSpeedMultiplier
    this.animationTime += deltaSeconds * animationRate

    const charging = isCharging(input.stickState, input.charge)
    const truckActive = input.defenseState === 'TRUCK_ACTIVE'
    const lateralMovement =
      -Math.sin(input.bodyRotation) * this.normalizedMovementDirection.x +
      Math.cos(input.bodyRotation) * this.normalizedMovementDirection.y
    const turnLeanDegrees = truckActive
      ? Math.min(8, input.tuning.leanAmount * 1.5)
      : Math.min(3.5, input.tuning.leanAmount)
    const targetLean =
      lateralMovement *
      this.movementSpeedVisual *
      degreesToRadians(turnLeanDegrees) *
      (charging ? 0.2 : 1)
    this.currentVisualLean = damp(
      this.currentVisualLean,
      targetLean,
      charging ? 14 : 10,
      deltaSeconds,
    )
    const targetForwardLean = charging
      ? 0.3
      : truckActive
        ? 3.2
        : this.movementSpeedVisual * 1.25
    this.currentVisualForwardLean = damp(
      this.currentVisualForwardLean,
      targetForwardLean,
      truckActive ? 18 : 12,
      deltaSeconds,
    )

    this.currentStrideImpact =
      (1 + Math.cos(this.animationTime * 2)) * 0.5
    const idleBob =
      Math.sin(this.animationTime * 0.65) * input.tuning.idleBobAmount
    const runBob =
      -(1 - this.currentStrideImpact) * input.tuning.movementBobAmount
    const targetBob =
      lerp(idleBob, runBob, this.movementSpeedVisual) *
      (charging ? 0.28 : 1)
    this.currentVisualBob = damp(
      this.currentVisualBob,
      targetBob,
      19,
      deltaSeconds,
    )
    const targetSway = charging
      ? 0
      : Math.sin(this.animationTime) *
        input.tuning.lateralSwayAmount *
        this.movementSpeedVisual
    this.currentVisualSway = damp(
      this.currentVisualSway,
      targetSway,
      18,
      deltaSeconds,
    )

    const footWave = Math.sin(this.animationTime)
    const targetFootPhase =
      this.movementSpeedVisual > 0.04 ? footWave : 0
    this.currentVisualFootPhase = damp(
      this.currentVisualFootPhase,
      targetFootPhase,
      22,
      deltaSeconds,
    )
    const movingSquash =
      (this.currentStrideImpact * 2 - 1) *
      input.tuning.squashStretchAmount *
      this.movementSpeedVisual
    const targetSquash =
      movingSquash + (charging ? 0.018 + input.charge * 0.012 : 0)
    this.currentVisualSquash = damp(
      this.currentVisualSquash,
      targetSquash,
      20,
      deltaSeconds,
    )

    this.updateActionPulse(input, deltaSeconds)
    this.updateStickLag(input, deltaSeconds)

    const footStride =
      this.currentVisualFootPhase * 2.7 * this.movementSpeedVisual
    const footSpread = charging
      ? 2.4 + input.charge * 1.2
      : 0.45 + this.movementSpeedVisual * 0.55
    return this.writeFrame(input, footStride, footSpread)
  }

  private updateMovementDirection(
    velocity: Point,
    speed: number,
    deltaSeconds: number,
  ): void {
    if (speed <= 0.08) {
      return
    }

    const targetX = velocity.x / speed
    const targetY = velocity.y / speed
    const x = damp(
      this.normalizedMovementDirection.x,
      targetX,
      14,
      deltaSeconds,
    )
    const y = damp(
      this.normalizedMovementDirection.y,
      targetY,
      14,
      deltaSeconds,
    )
    const length = Math.hypot(x, y)

    if (length > 0.001) {
      this.normalizedMovementDirection.x = x / length
      this.normalizedMovementDirection.y = y / length
    }
  }

  private updateStickLag(
    input: ArenaProceduralAnimationInput,
    deltaSeconds: number,
  ): void {
    if (input.tuning.stickLagAmount <= 0) {
      this.visualAimAngle = input.aimAngle
      this.currentStickLagAngle = 0
      return
    }

    const lagRatio = clamp(input.tuning.stickLagAmount / 0.35, 0, 1)
    const response = lerp(25, 8, lagRatio)
    const aimError = shortestAngle(this.visualAimAngle, input.aimAngle)
    this.visualAimAngle += aimError * (1 - Math.exp(-response * deltaSeconds))
    this.visualAimAngle = wrapAngle(this.visualAimAngle)
    this.currentStickLagAngle = clamp(
      shortestAngle(input.aimAngle, this.visualAimAngle),
      -maxStickLagRadians,
      maxStickLagRadians,
    )
  }

  private updateActionPulse(
    input: ArenaProceduralAnimationInput,
    deltaSeconds: number,
  ): void {
    const key = `${input.stickState}:${input.defenseState}`

    if (key !== this.lastActionKey) {
      const action = resolveActionPulse(
        input.stickState,
        input.defenseState,
        input.mountSign,
      )
      if (action.magnitude > 0) {
        this.currentActionPulse = action.magnitude
        this.stickActionDirection = action.stickDirection
      }
      this.lastActionKey = key
    }

    const decayRate = lerp(10, 19, input.tuning.actionSnapAmount)
    this.currentActionPulse *= Math.exp(-decayRate * deltaSeconds)
    if (this.currentActionPulse < 0.002) {
      this.currentActionPulse = 0
      this.stickActionDirection = 0
    }
  }

  private resetMotion(aimAngle: number, deltaSeconds: number): void {
    this.visualAimAngle = aimAngle
    this.currentStickLagAngle = 0
    this.currentActionPulse = 0
    this.stickActionDirection = 0
    this.currentVisualLean = damp(
      this.currentVisualLean,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualForwardLean = damp(
      this.currentVisualForwardLean,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualBob = damp(
      this.currentVisualBob,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualSway = damp(
      this.currentVisualSway,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualSquash = damp(
      this.currentVisualSquash,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualFootPhase = damp(
      this.currentVisualFootPhase,
      0,
      24,
      deltaSeconds,
    )
  }

  private writeFrame(
    input: ArenaProceduralAnimationInput,
    footStride: number,
    footSpread: number,
  ): ArenaProceduralAnimationFrame {
    const active = input.tuning.enabled && !input.reducedMotion
    const stridePulse =
      (this.currentStrideImpact * 2 - 1) *
      input.tuning.shadowPulseAmount *
      this.movementSpeedVisual
    const charging = isCharging(input.stickState, input.charge)
    const truck = input.defenseState === 'TRUCK_ACTIVE'
    const release =
      input.stickState === 'RELEASE_SWING' ||
      input.stickState === 'RELEASE_FOLLOW_THROUGH'
    const actionStretch = active
      ? this.currentActionPulse * input.tuning.shadowPulseAmount
      : 0

    this.frame.animationTime = this.animationTime
    this.frame.movementSpeedVisual = this.movementSpeedVisual
    this.frame.currentVisualLean = active ? this.currentVisualLean : 0
    this.frame.currentVisualForwardLean = active
      ? this.currentVisualForwardLean
      : 0
    this.frame.currentVisualBob = active ? this.currentVisualBob : 0
    this.frame.currentVisualSway = active ? this.currentVisualSway : 0
    this.frame.currentVisualSquash = active
      ? this.currentVisualSquash
      : 0
    this.frame.currentStrideImpact = active
      ? this.currentStrideImpact
      : 0.5
    this.frame.currentVisualFootPhase = active
      ? this.currentVisualFootPhase
      : 0
    this.frame.currentStickLagAngle = active
      ? this.currentStickLagAngle
      : 0
    this.frame.currentActionPulse = active
      ? this.currentActionPulse
      : 0
    this.frame.footStride = active ? footStride : 0
    this.frame.footSpread = active ? footSpread : 0
    this.frame.shadowScaleX = active
      ? 1 + stridePulse + (charging ? input.tuning.shadowPulseAmount * 0.42 : 0) +
        (truck ? input.tuning.shadowPulseAmount * 0.72 : 0) +
        (release ? actionStretch * 0.35 : 0)
      : 1
    this.frame.shadowScaleY = active
      ? 1 - stridePulse * 0.32 + (charging ? 0.035 : 0) -
        (truck ? input.tuning.shadowPulseAmount * 0.2 : 0)
      : 1
    this.frame.stickActionAngle = active
      ? this.currentActionPulse *
        this.stickActionDirection *
        input.tuning.actionSnapAmount *
        0.12
      : 0
    this.frame.enabled = input.tuning.enabled
    this.frame.footShuffleEnabled =
      active && input.tuning.footShuffle
    return this.frame
  }
}

function resolveActionPulse(
  stickState: StickActionState,
  defenseState: DefensiveVisualState,
  mountSign: -1 | 1,
): { magnitude: number; stickDirection: number } {
  if (stickState === 'RELEASE_SWING') {
    return { magnitude: 1, stickDirection: mountSign }
  }
  if (defenseState === 'SLASH_ACTIVE') {
    return { magnitude: 0.86, stickDirection: mountSign }
  }
  if (defenseState === 'TRUCK_ACTIVE') {
    return { magnitude: 1, stickDirection: 0 }
  }
  if (stickState === 'FUMBLED_COOLDOWN') {
    return { magnitude: 0.72, stickDirection: -mountSign }
  }
  if (defenseState === 'KNOCKED_DOWN') {
    return { magnitude: 0.9, stickDirection: -mountSign }
  }
  return { magnitude: 0, stickDirection: 0 }
}

function isCharging(state: StickActionState, charge: number): boolean {
  return (
    charge > 0.01 ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED'
  )
}

function damp(
  current: number,
  target: number,
  response: number,
  deltaSeconds: number,
): number {
  return lerp(current, target, 1 - Math.exp(-response * deltaSeconds))
}

function shortestAngle(from: number, to: number): number {
  return wrapAngle(to - from)
}

function wrapAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value))
}

function degreesToRadians(value: number): number {
  return value * (Math.PI / 180)
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
