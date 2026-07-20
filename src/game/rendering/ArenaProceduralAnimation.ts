import type { Point } from '../data/geometry'
import type { StickActionState } from '../data/matchTypes'
import type {
  ArenaAnimationClipState,
  DefensiveVisualState,
} from './AnimationState'

export type StickVisualActionState =
  | 'releaseSnap'
  | 'releaseFollowThrough'
  | 'releaseRecover'
  | 'slashWindup'
  | 'slashSweep'
  | 'slashRecover'
  | 'truckCarry'
  | 'fullyCharged'
  | 'chargeLoad'
  | 'cradleHold'
  | 'gatherReach'
  | 'targetBias'
  | 'disrupted'
  | 'readyCarry'

export type ReleaseVisualTier = 0 | 1 | 2 | 3

export type ArenaProceduralAnimationTuning = {
  enabled: boolean
  hoverRunEnabled: boolean
  playerScaleMultiplier: number
  idleBobAmount: number
  movementBobAmount: number
  movementBobSpeed: number
  squashStretchAmount: number
  leanAmount: number
  lateralSwayAmount: number
  shadowPulseAmount: number
  coreTrackingEnabled: boolean
  naturalHoldMode: boolean
  legacyCoreMagnetMode: boolean
  frontArcDegrees: number
  sideReachArcDegrees: number
  readyCarriageAngle: number
  stickBiasStrength: number
  stickClampAmount: number
  stickFollowStrength: number
  stickMaxTurnRate: number
  stickLagClamp: number
  slashWindupMs: number
  slashSweepMs: number
  slashRecoverMs: number
  slashArcDegrees: number
  slashAnimationSpeed: number
  chargeLoadAngleMax: number
  releaseSnapAmount: number
  releaseRecoilAmount: number
  quickPassThreshold: number
  firmPassThreshold: number
  heavyShotThreshold: number
  fullChargeThreshold: number
  slashTrailEnabled: boolean
  releaseTrailEnabled: boolean
  fullChargeBurstEnabled: boolean
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
  visualStickAimAngle: number
  currentStickLagAngle: number
  currentActionPulse: number
  currentReleaseRecoil: number
  shadowScaleX: number
  shadowScaleY: number
  stickActionAngle: number
  stickActionState: StickVisualActionState
  stickActionProgress: number
  releaseTier: ReleaseVisualTier
  releaseCharge: number
  slashTrailAlpha: number
  releaseTrailAlpha: number
  fullChargeBurstAlpha: number
  animationClipState: ArenaAnimationClipState
  enabled: boolean
}

export const arenaProceduralAnimationDefaults = {
  enabled: true,
  hoverRunEnabled: false,
  playerScaleMultiplier: 0.9,
  idleBobAmount: 0.6,
  movementBobAmount: 1.8,
  movementBobSpeed: 1.05,
  squashStretchAmount: 0.05,
  leanAmount: 5,
  lateralSwayAmount: 0,
  shadowPulseAmount: 0.12,
  coreTrackingEnabled: true,
  naturalHoldMode: true,
  legacyCoreMagnetMode: false,
  frontArcDegrees: 170,
  sideReachArcDegrees: 220,
  readyCarriageAngle: 28,
  stickBiasStrength: 0.38,
  stickClampAmount: 82,
  stickFollowStrength: 0.28,
  stickMaxTurnRate: 540,
  stickLagClamp: 5,
  slashWindupMs: 90,
  slashSweepMs: 115,
  slashRecoverMs: 170,
  slashArcDegrees: 92,
  slashAnimationSpeed: 1,
  chargeLoadAngleMax: 22,
  releaseSnapAmount: 0.78,
  releaseRecoilAmount: 0.68,
  quickPassThreshold: 0,
  firmPassThreshold: 0.25,
  heavyShotThreshold: 0.6,
  fullChargeThreshold: 0.95,
  slashTrailEnabled: true,
  releaseTrailEnabled: true,
  fullChargeBurstEnabled: true,
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
  frontArcDegrees: { min: 100, max: 200, step: 5 },
  sideReachArcDegrees: { min: 160, max: 260, step: 5 },
  readyCarriageAngle: { min: 5, max: 65, step: 1 },
  stickBiasStrength: { min: 0, max: 1, step: 0.02 },
  stickClampAmount: { min: 30, max: 120, step: 2 },
  stickFollowStrength: { min: 0.05, max: 0.6, step: 0.01 },
  stickMaxTurnRate: { min: 90, max: 1080, step: 15 },
  stickLagClamp: { min: 0, max: 12, step: 0.25 },
  slashWindupMs: { min: 40, max: 180, step: 5 },
  slashSweepMs: { min: 60, max: 220, step: 5 },
  slashRecoverMs: { min: 80, max: 320, step: 5 },
  slashArcDegrees: { min: 35, max: 140, step: 1 },
  slashAnimationSpeed: { min: 0.5, max: 2, step: 0.05 },
  chargeLoadAngleMax: { min: 8, max: 32, step: 1 },
  releaseSnapAmount: { min: 0.2, max: 1, step: 0.02 },
  releaseRecoilAmount: { min: 0, max: 1, step: 0.02 },
  quickPassThreshold: { min: 0, max: 0.2, step: 0.01 },
  firmPassThreshold: { min: 0.1, max: 0.5, step: 0.01 },
  heavyShotThreshold: { min: 0.4, max: 0.85, step: 0.01 },
  fullChargeThreshold: { min: 0.9, max: 1, step: 0.005 },
  animationSpeedMultiplier: { min: 0.5, max: 2, step: 0.05 },
} as const

export type ArenaProceduralAnimationInput = {
  deltaMs: number
  velocity: Point
  bodyRotation: number
  aimAngle: number
  trackingTargetAngle: number | null
  trackingTargetDistance: number
  possessesCore: boolean
  mountSign: -1 | 1
  stickState: StickActionState
  defenseState: DefensiveVisualState
  charge: number
  reducedMotion: boolean
  tuning: ArenaProceduralAnimationTuning
}

type TimedAction = {
  elapsedMs: number
  active: boolean
}

type StickActionPose = {
  state: StickVisualActionState
  progress: number
  angle: number
  pulse: number
  releaseRecoil: number
  slashTrailAlpha: number
  releaseTrailAlpha: number
  fullChargeBurstAlpha: number
}

const relaxedReturnStrength = 0.08
const visualLeanBodyRadius = 16

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
  private visualStickAimAngle = 0
  private currentStickLagAngle = 0
  private aimInitialized = false
  private previousStickState: StickActionState = 'IDLE'
  private previousDefenseState: DefensiveVisualState = 'IDLE'
  private rememberedCharge = 0
  private releaseCharge = 0
  private releaseTier: ReleaseVisualTier = 0
  private readonly releaseAction: TimedAction = { elapsedMs: 0, active: false }
  private readonly slashAction: TimedAction = { elapsedMs: 0, active: false }
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
      visualStickAimAngle: 0,
      currentStickLagAngle: 0,
      currentActionPulse: 0,
      currentReleaseRecoil: 0,
      shadowScaleX: 1,
      shadowScaleY: 1,
      stickActionAngle: 0,
      stickActionState: 'readyCarry',
      stickActionProgress: 0,
      releaseTier: 0,
      releaseCharge: 0,
      slashTrailAlpha: 0,
      releaseTrailAlpha: 0,
      fullChargeBurstAlpha: 0,
      animationClipState: 'idle',
      enabled: true,
    }
  }

  update(input: ArenaProceduralAnimationInput): ArenaProceduralAnimationFrame {
    const deltaSeconds = clamp(input.deltaMs / 1000, 0, 0.05)
    const actionDeltaMs = input.deltaMs * input.tuning.animationSpeedMultiplier
    const speed = Math.hypot(input.velocity.x, input.velocity.y)
    const targetMovement = clamp(speed / 9, 0, 1)
    this.movementSpeedVisual = damp(
      this.movementSpeedVisual,
      targetMovement,
      11,
      deltaSeconds,
    )
    this.updateMovementDirection(input.velocity, speed, deltaSeconds)
    this.captureActions(input, actionDeltaMs)

    const stickPose = input.tuning.enabled
      ? this.resolveStickActionPose(input)
      : idleStickPose()
    this.updateStickAim(input, stickPose.state, deltaSeconds)

    if (
      !input.tuning.enabled ||
      !input.tuning.hoverRunEnabled ||
      input.reducedMotion
    ) {
      this.resetMovement(deltaSeconds)
    } else {
      this.updateHoverRun(input, deltaSeconds)
    }

    this.previousStickState = input.stickState
    this.previousDefenseState = input.defenseState
    return this.writeFrame(input, stickPose)
  }

  private updateHoverRun(
    input: ArenaProceduralAnimationInput,
    deltaSeconds: number,
  ): void {
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
    const steeringLean =
      lateralMovement *
      this.movementSpeedVisual *
      degreesToRadians(Math.min(1.5, input.tuning.leanAmount * 0.3)) *
      (charging ? 0.2 : 1)
    this.currentVisualLean = damp(
      this.currentVisualLean,
      steeringLean,
      charging ? 14 : 10,
      deltaSeconds,
    )

    const moveLeanOffset =
      Math.sin(degreesToRadians(input.tuning.leanAmount)) *
      visualLeanBodyRadius *
      this.movementSpeedVisual
    const targetForwardLean = charging
      ? 0.25
      : truckActive
        ? 3.2
        : moveLeanOffset
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
    const moveBob =
      -(1 - this.currentStrideImpact) * input.tuning.movementBobAmount
    const targetBob =
      lerp(idleBob, moveBob, this.movementSpeedVisual) *
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
  }

  private captureActions(
    input: ArenaProceduralAnimationInput,
    deltaMs: number,
  ): void {
    if (input.charge > 0.001) {
      this.rememberedCharge = Math.max(this.rememberedCharge, input.charge)
    }

    const releaseState = isReleaseState(input.stickState)
    const previousReleaseState = isReleaseState(this.previousStickState)
    if (releaseState && !previousReleaseState) {
      this.releaseCharge = clamp(
        Math.max(input.charge, this.rememberedCharge),
        0,
        1,
      )
      this.releaseTier = resolveReleaseTier(
        this.releaseCharge,
        input.tuning,
      )
      this.releaseAction.elapsedMs = 0
      this.releaseAction.active = true
    } else if (this.releaseAction.active) {
      this.releaseAction.elapsedMs += deltaMs
      const timing = releaseTiming(this.releaseTier)
      if (this.releaseAction.elapsedMs >= timing.total) {
        this.releaseAction.active = false
        this.rememberedCharge = 0
      }
    }

    const slashState = isSlashState(input.defenseState)
    const previousSlashState = isSlashState(this.previousDefenseState)
    if (slashState && !previousSlashState) {
      this.slashAction.elapsedMs = 0
      this.slashAction.active = true
    } else if (this.slashAction.active) {
      this.slashAction.elapsedMs +=
        deltaMs * input.tuning.slashAnimationSpeed
      const total =
        input.tuning.slashWindupMs +
        input.tuning.slashSweepMs +
        input.tuning.slashRecoverMs
      if (this.slashAction.elapsedMs >= total) {
        this.slashAction.active = false
      }
    }

    if (!isPossessionState(input.stickState) && !releaseState &&
        !this.releaseAction.active) {
      this.rememberedCharge = 0
    }
  }

  private resolveStickActionPose(
    input: ArenaProceduralAnimationInput,
  ): StickActionPose {
    if (this.releaseAction.active || isReleaseState(input.stickState)) {
      return this.resolveReleasePose(input)
    }
    if (this.slashAction.active || isSlashState(input.defenseState)) {
      return this.resolveSlashPose(input)
    }
    if (isTruckState(input.defenseState)) {
      return {
        ...idleStickPose(),
        state: 'truckCarry',
        angle: -0.1 * input.mountSign,
        pulse: input.defenseState === 'TRUCK_ACTIVE' ? 1 : 0.55,
      }
    }
    if (
      input.charge >= input.tuning.fullChargeThreshold ||
      input.stickState === 'CRADLED_OVERCHARGED'
    ) {
      const vibration = input.reducedMotion
        ? 0
        : Math.sin(this.animationTime * 5.2) * 0.008
      return {
        ...idleStickPose(),
        state: 'fullyCharged',
        progress: 1,
        angle:
          (-degreesToRadians(input.tuning.chargeLoadAngleMax) + vibration) *
          input.mountSign,
        pulse: 1,
      }
    }
    if (isCharging(input.stickState, input.charge)) {
      return {
        ...idleStickPose(),
        state: 'chargeLoad',
        progress: input.charge,
        angle:
          -degreesToRadians(input.tuning.chargeLoadAngleMax) *
          input.charge *
          input.mountSign,
        pulse: 0.45 + input.charge * 0.35,
      }
    }
    if (input.possessesCore || input.stickState === 'CRADLED_STABLE') {
      return { ...idleStickPose(), state: 'cradleHold', pulse: 0.25 }
    }
    if (input.stickState === 'CATCH_READY') {
      return { ...idleStickPose(), state: 'gatherReach', pulse: 0.4 }
    }
    if (
      input.stickState === 'FUMBLED_COOLDOWN' ||
      input.defenseState === 'KNOCKED_DOWN' ||
      input.defenseState === 'GETTING_UP'
    ) {
      return {
        ...idleStickPose(),
        state: 'disrupted',
        angle: -0.16 * input.mountSign,
        pulse: 0.72,
      }
    }
    if (
      input.tuning.coreTrackingEnabled &&
      input.trackingTargetAngle !== null
    ) {
      return { ...idleStickPose(), state: 'targetBias' }
    }
    return idleStickPose()
  }

  private resolveSlashPose(
    input: ArenaProceduralAnimationInput,
  ): StickActionPose {
    const elapsed = this.slashAction.elapsedMs
    const windupEnd = input.tuning.slashWindupMs
    const sweepEnd = windupEnd + input.tuning.slashSweepMs
    const total = sweepEnd + input.tuning.slashRecoverMs
    const arc = degreesToRadians(input.tuning.slashArcDegrees)
    let angle = 0
    let progress = clamp(elapsed / Math.max(1, total), 0, 1)
    let state: StickVisualActionState = 'slashWindup'
    let pulse = 0.45
    let slashTrailAlpha = 0

    if (elapsed < windupEnd) {
      const phase = smoothStep(elapsed / Math.max(1, windupEnd))
      angle = lerp(0, -arc * 0.35, phase) * input.mountSign
      pulse = 0.35 + phase * 0.25
    } else if (elapsed < sweepEnd) {
      state = 'slashSweep'
      const phase = smoothStep(
        (elapsed - windupEnd) / Math.max(1, input.tuning.slashSweepMs),
      )
      angle = lerp(-arc * 0.35, arc * 0.65, phase) * input.mountSign
      pulse = 0.7 + Math.sin(phase * Math.PI) * 0.3
      slashTrailAlpha =
        input.tuning.slashTrailEnabled && !input.reducedMotion
          ? Math.sin(phase * Math.PI) * 0.62
          : 0
    } else {
      state = 'slashRecover'
      const phase = smoothStep(
        (elapsed - sweepEnd) / Math.max(1, input.tuning.slashRecoverMs),
      )
      angle = lerp(arc * 0.65, 0, phase) * input.mountSign
      pulse = lerp(0.45, 0, phase)
    }

    return {
      ...idleStickPose(),
      state,
      progress,
      angle,
      pulse,
      slashTrailAlpha,
    }
  }

  private resolveReleasePose(
    input: ArenaProceduralAnimationInput,
  ): StickActionPose {
    const timing = releaseTiming(this.releaseTier)
    const elapsed = this.releaseAction.elapsedMs
    const windupEnd = timing.windup
    const snapEnd = windupEnd + timing.snap
    const tierStrength = [0.34, 0.56, 0.82, 1][this.releaseTier]
    const loadAngle =
      -degreesToRadians(input.tuning.chargeLoadAngleMax) *
      lerp(0.18, 1, this.releaseCharge) *
      input.mountSign
    const snapAngle =
      0.72 *
      input.tuning.releaseSnapAmount *
      tierStrength *
      input.mountSign
    let angle = 0
    let pulse = 0.45
    let releaseRecoil = 0
    let releaseTrailAlpha = 0
    let fullChargeBurstAlpha = 0
    let state: StickVisualActionState = 'releaseSnap'

    if (elapsed < windupEnd) {
      const phase = smoothStep(elapsed / Math.max(1, timing.windup))
      angle = lerp(0, loadAngle, phase)
      pulse = 0.35 + phase * tierStrength * 0.35
    } else if (elapsed < snapEnd) {
      state = 'releaseFollowThrough'
      const phase = smoothStep(
        (elapsed - windupEnd) / Math.max(1, timing.snap),
      )
      angle = lerp(loadAngle, snapAngle, phase)
      pulse = 0.7 + Math.sin(phase * Math.PI) * 0.3
      releaseRecoil =
        Math.sin(phase * Math.PI) *
        tierStrength *
        input.tuning.releaseRecoilAmount
      releaseTrailAlpha =
        input.tuning.releaseTrailEnabled && !input.reducedMotion
          ? Math.sin(phase * Math.PI) * (0.25 + tierStrength * 0.42)
          : 0
      fullChargeBurstAlpha =
        this.releaseTier === 3 &&
        input.tuning.fullChargeBurstEnabled &&
        !input.reducedMotion
          ? Math.sin(Math.min(1, phase * 1.6) * Math.PI) * 0.9
          : 0
    } else {
      state = 'releaseRecover'
      const phase = smoothStep(
        (elapsed - snapEnd) / Math.max(1, timing.recover),
      )
      angle = lerp(snapAngle, 0, phase)
      pulse = lerp(0.5 * tierStrength, 0, phase)
      releaseRecoil =
        (1 - phase) * tierStrength * input.tuning.releaseRecoilAmount * 0.28
    }

    return {
      ...idleStickPose(),
      state,
      progress: clamp(elapsed / Math.max(1, timing.total), 0, 1),
      angle,
      pulse,
      releaseRecoil,
      releaseTrailAlpha,
      fullChargeBurstAlpha,
    }
  }

  private updateStickAim(
    input: ArenaProceduralAnimationInput,
    actionState: StickVisualActionState,
    deltaSeconds: number,
  ): void {
    if (!this.aimInitialized) {
      this.visualStickAimAngle = input.aimAngle
      this.aimInitialized = true
    }

    if (!input.tuning.enabled) {
      this.visualStickAimAngle = input.aimAngle
      this.currentStickLagAngle = 0
      return
    }

    const tracksCore =
      input.tuning.coreTrackingEnabled &&
      input.trackingTargetAngle !== null &&
      !input.possessesCore
    const movementAngle = Math.atan2(
      this.normalizedMovementDirection.y,
      this.normalizedMovementDirection.x,
    )
    const facingAngle = this.movementSpeedVisual > 0.12
      ? blendAngles(input.bodyRotation, movementAngle, 0.72)
      : input.bodyRotation
    const readyAngle = wrapAngle(
      facingAngle +
      degreesToRadians(input.tuning.readyCarriageAngle) * input.mountSign,
    )
    let targetAngle = readyAngle
    let followStrength = input.tuning.stickFollowStrength

    if (
      actionState === 'releaseSnap' ||
      actionState === 'releaseFollowThrough' ||
      actionState === 'releaseRecover' ||
      actionState === 'chargeLoad' ||
      actionState === 'fullyCharged' ||
      actionState === 'cradleHold'
    ) {
      targetAngle = input.aimAngle
      followStrength = Math.min(0.6, followStrength * 1.35)
    } else if (input.tuning.legacyCoreMagnetMode && tracksCore) {
      targetAngle = input.trackingTargetAngle ?? readyAngle
      followStrength = Math.min(0.6, followStrength * 1.25)
    } else if (input.tuning.naturalHoldMode) {
      const reachesTarget =
        actionState === 'gatherReach' ||
        actionState === 'slashWindup' ||
        actionState === 'slashSweep' ||
        actionState === 'slashRecover'
      targetAngle = tracksCore
        ? this.resolveNaturalTargetAngle(
            input,
            readyAngle,
            reachesTarget,
          )
        : readyAngle
      followStrength = actionState === 'readyCarry'
        ? relaxedReturnStrength
        : Math.min(0.6, followStrength * 1.15)
    } else if (tracksCore) {
      targetAngle = input.trackingTargetAngle ?? input.aimAngle
    }

    const error = shortestAngle(this.visualStickAimAngle, targetAngle)
    const frameStrength =
      1 - Math.pow(1 - clamp(followStrength, 0.01, 0.95), deltaSeconds * 60)
    const maxTurn =
      degreesToRadians(input.tuning.stickMaxTurnRate) * deltaSeconds
    const turn = clamp(error * frameStrength, -maxTurn, maxTurn)
    this.visualStickAimAngle = wrapAngle(this.visualStickAimAngle + turn)
    const residual = shortestAngle(targetAngle, this.visualStickAimAngle)
    const lagClamp = degreesToRadians(input.tuning.stickLagClamp)
    this.currentStickLagAngle = clamp(residual, -lagClamp, lagClamp)
  }

  private resolveNaturalTargetAngle(
    input: ArenaProceduralAnimationInput,
    readyAngle: number,
    reachesTarget: boolean,
  ): number {
    const targetAngle = input.trackingTargetAngle
    if (targetAngle === null) {
      return readyAngle
    }

    const facingDelta = Math.abs(
      shortestAngle(input.bodyRotation, targetAngle),
    )
    const frontHalf = degreesToRadians(input.tuning.frontArcDegrees * 0.5)
    const sideHalf = degreesToRadians(input.tuning.sideReachArcDegrees * 0.5)
    if (facingDelta > sideHalf) {
      return readyAngle
    }

    const distanceBias = clamp(
      1 - input.trackingTargetDistance / 900,
      0.28,
      1,
    )
    const targetBias = facingDelta <= frontHalf
      ? input.tuning.stickBiasStrength
      : input.tuning.stickBiasStrength * 0.35
    const reachMultiplier = reachesTarget ? 1.75 : 1
    const biasedAngle = blendAngles(
      readyAngle,
      targetAngle,
      clamp(targetBias * distanceBias * reachMultiplier, 0, 0.94),
    )
    const clampRadians = degreesToRadians(input.tuning.stickClampAmount)
    const offsetFromReady = clamp(
      shortestAngle(readyAngle, biasedAngle),
      -clampRadians,
      clampRadians,
    )
    return wrapAngle(readyAngle + offsetFromReady)
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

  private resetMovement(deltaSeconds: number): void {
    this.currentVisualLean = damp(this.currentVisualLean, 0, 24, deltaSeconds)
    this.currentVisualForwardLean = damp(
      this.currentVisualForwardLean,
      0,
      24,
      deltaSeconds,
    )
    this.currentVisualBob = damp(this.currentVisualBob, 0, 24, deltaSeconds)
    this.currentVisualSway = damp(this.currentVisualSway, 0, 24, deltaSeconds)
    this.currentVisualSquash = damp(
      this.currentVisualSquash,
      0,
      24,
      deltaSeconds,
    )
  }

  private writeFrame(
    input: ArenaProceduralAnimationInput,
    stickPose: StickActionPose,
  ): ArenaProceduralAnimationFrame {
    const active = input.tuning.enabled
    const hoverActive =
      active && input.tuning.hoverRunEnabled && !input.reducedMotion
    const stridePulse =
      (this.currentStrideImpact * 2 - 1) *
      input.tuning.shadowPulseAmount *
      this.movementSpeedVisual
    const charging = isCharging(input.stickState, input.charge)
    const truck = isTruckState(input.defenseState)
    const actionStretch = stickPose.pulse * input.tuning.shadowPulseAmount

    this.frame.animationTime = this.animationTime
    this.frame.movementSpeedVisual = this.movementSpeedVisual
    this.frame.currentVisualLean = hoverActive ? this.currentVisualLean : 0
    this.frame.currentVisualForwardLean = hoverActive
      ? this.currentVisualForwardLean
      : 0
    this.frame.currentVisualBob = hoverActive ? this.currentVisualBob : 0
    this.frame.currentVisualSway = hoverActive ? this.currentVisualSway : 0
    this.frame.currentVisualSquash = hoverActive
      ? this.currentVisualSquash
      : 0
    this.frame.currentStrideImpact = hoverActive
      ? this.currentStrideImpact
      : 0.5
    this.frame.visualStickAimAngle = this.visualStickAimAngle
    this.frame.currentStickLagAngle = active
      ? this.currentStickLagAngle
      : 0
    this.frame.currentActionPulse = active ? stickPose.pulse : 0
    this.frame.currentReleaseRecoil = active
      ? stickPose.releaseRecoil
      : 0
    this.frame.shadowScaleX = hoverActive
      ? 1 + stridePulse +
        (charging ? input.tuning.shadowPulseAmount * 0.42 : 0) +
        (truck ? input.tuning.shadowPulseAmount * 0.72 : 0) +
        (isReleaseVisualState(stickPose.state) ? actionStretch * 0.35 : 0)
      : 1 + (charging ? 0.04 : 0)
    this.frame.shadowScaleY = hoverActive
      ? 1 - stridePulse * 0.32 + (charging ? 0.035 : 0) -
        (truck ? input.tuning.shadowPulseAmount * 0.2 : 0)
      : 1
    this.frame.stickActionAngle = active
      ? stickPose.angle * (input.reducedMotion ? 0.55 : 1)
      : 0
    this.frame.stickActionState = active
      ? stickPose.state
      : 'readyCarry'
    this.frame.stickActionProgress = active ? stickPose.progress : 0
    this.frame.releaseTier = this.releaseTier
    this.frame.releaseCharge = this.releaseCharge
    this.frame.slashTrailAlpha = active ? stickPose.slashTrailAlpha : 0
    this.frame.releaseTrailAlpha = active ? stickPose.releaseTrailAlpha : 0
    this.frame.fullChargeBurstAlpha = active
      ? stickPose.fullChargeBurstAlpha
      : 0
    this.frame.animationClipState = resolveAnimationClipState(
      stickPose.state,
      this.movementSpeedVisual,
    )
    this.frame.enabled = active
    return this.frame
  }
}

function idleStickPose(): StickActionPose {
  return {
    state: 'readyCarry',
    progress: 0,
    angle: 0,
    pulse: 0,
    releaseRecoil: 0,
    slashTrailAlpha: 0,
    releaseTrailAlpha: 0,
    fullChargeBurstAlpha: 0,
  }
}

function resolveAnimationClipState(
  stickState: StickVisualActionState,
  movementSpeed: number,
): ArenaAnimationClipState {
  if (isReleaseVisualState(stickState)) {
    return 'release'
  }
  if (
    stickState === 'slashWindup' ||
    stickState === 'slashSweep' ||
    stickState === 'slashRecover'
  ) {
    return 'slash'
  }
  if (stickState === 'chargeLoad' || stickState === 'fullyCharged') {
    return 'charge'
  }
  if (stickState === 'truckCarry') {
    return 'truck'
  }
  if (stickState === 'disrupted') {
    return 'fumble'
  }
  return movementSpeed > 0.12 ? 'move' : 'idle'
}

function isReleaseVisualState(state: StickVisualActionState): boolean {
  return (
    state === 'releaseSnap' ||
    state === 'releaseFollowThrough' ||
    state === 'releaseRecover'
  )
}

function releaseTiming(tier: ReleaseVisualTier): {
  windup: number
  snap: number
  recover: number
  total: number
} {
  const timings = [
    { windup: 28, snap: 62, recover: 90 },
    { windup: 45, snap: 72, recover: 115 },
    { windup: 72, snap: 88, recover: 145 },
    { windup: 90, snap: 96, recover: 165 },
  ] as const
  const timing = timings[tier]
  return { ...timing, total: timing.windup + timing.snap + timing.recover }
}

function resolveReleaseTier(
  charge: number,
  tuning: ArenaProceduralAnimationTuning,
): ReleaseVisualTier {
  if (charge < tuning.quickPassThreshold) {
    return 0
  }
  if (charge >= tuning.fullChargeThreshold) {
    return 3
  }
  if (charge >= tuning.heavyShotThreshold) {
    return 2
  }
  if (charge >= tuning.firmPassThreshold) {
    return 1
  }
  return 0
}

function isReleaseState(state: StickActionState): boolean {
  return (
    state === 'RELEASE_WINDUP' ||
    state === 'RELEASE_SWING' ||
    state === 'RELEASE_FOLLOW_THROUGH'
  )
}

function isPossessionState(state: StickActionState): boolean {
  return (
    state === 'CRADLED_STABLE' ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED' ||
    state === 'RELEASE_WINDUP'
  )
}

function isCharging(state: StickActionState, charge: number): boolean {
  return (
    charge > 0.01 ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED'
  )
}

function isSlashState(state: DefensiveVisualState): boolean {
  return (
    state === 'SLASH_STARTUP' ||
    state === 'SLASH_ACTIVE' ||
    state === 'SLASH_RECOVERY'
  )
}

function isTruckState(state: DefensiveVisualState): boolean {
  return (
    state === 'TRUCK_STARTUP' ||
    state === 'TRUCK_ACTIVE' ||
    state === 'TRUCK_RECOVERY'
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

function blendAngles(from: number, to: number, amount: number): number {
  return wrapAngle(from + shortestAngle(from, to) * amount)
}

function wrapAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value))
}

function degreesToRadians(value: number): number {
  return value * (Math.PI / 180)
}

function smoothStep(value: number): number {
  const amount = clamp(value, 0, 1)
  return amount * amount * (3 - 2 * amount)
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
