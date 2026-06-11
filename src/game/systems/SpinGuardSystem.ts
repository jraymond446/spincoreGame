import Phaser from 'phaser'
import { spinGuardConfig } from '../config/spinGuardConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'
import {
  isValidVector,
  sanitizeAngle,
} from '../utils/vectorSafety'
import type { PlayerActionLock } from './PlayerActionStateSystem'

type SpinSample = {
  windowMs: number
  windowStart: Point
  lastAimAngle: number
  lastFacingAngle: number
  lastStickAngle: number
  lastMovementAngle: number | null
  aimDelta: number
  facingDelta: number
  stickDelta: number
  movementDelta: number
  lastStableAimAngle: number
  lastStableFacingAngle: number
  lastAction: PlayerActionLock
  lastTacticalJob: string | null
  lastCarrierIntent: string | null
  jukeDurationMs: number
  carrierIntentChanges: number
  tacticalJobChanges: number
  stateTransitions: string[]
}

export type SpinGuardContext = {
  hasCore: boolean
  currentAction: PlayerActionLock
  tacticalJob: string | null
  carrierIntent: string | null
}

export type SpinGuardTrigger = {
  playerId: string
  hasCore: boolean
  reason: string
}

export class SpinGuardSystem {
  private readonly samples = new Map<string, SpinSample>()
  private readonly recoveryMs = new Map<string, number>()

  prepareFrame(deltaMs: number): void {
    for (const [playerId, remaining] of this.recoveryMs) {
      const next = Math.max(0, remaining - deltaMs)
      if (next === 0) {
        this.recoveryMs.delete(playerId)
      } else {
        this.recoveryMs.set(playerId, next)
      }
    }
  }

  isRecovering(playerId: string): boolean {
    return (this.recoveryMs.get(playerId) ?? 0) > 0
  }

  update(
    players: Player[],
    deltaMs: number,
    getContext: (player: Player) => SpinGuardContext,
  ): SpinGuardTrigger[] {
    const triggers: SpinGuardTrigger[] = []

    for (const player of players) {
      const trigger = this.inspectPlayer(
        player,
        deltaMs,
        getContext(player),
      )
      if (trigger) {
        triggers.push(trigger)
      }
    }

    return triggers
  }

  reset(): void {
    this.samples.clear()
    this.recoveryMs.clear()
  }

  private inspectPlayer(
    player: Player,
    deltaMs: number,
    context: SpinGuardContext,
  ): SpinGuardTrigger | null {
    const aimAngle = player.getReleaseAimAngle()
    const facingAngle = player.getBodyFacingAngle()
    const stickAngle = player.getStickVisualRotation()
    const velocity = player.velocity
    const movementAngle =
      isValidVector(velocity) &&
      Math.hypot(velocity.x, velocity.y) > 0.25
        ? Math.atan2(velocity.y, velocity.x)
        : null
    const bodyAngularVelocity = Number.isFinite(player.body.angularVelocity)
      ? player.body.angularVelocity
      : Infinity
    const invalidState =
      !isValidVector(player.position) ||
      !isValidVector(velocity) ||
      !Number.isFinite(aimAngle) ||
      !Number.isFinite(facingAngle) ||
      !Number.isFinite(stickAngle)
    const bodyRotationExceeded =
      Math.abs(bodyAngularVelocity) >
      spinGuardConfig.maxAllowedPlayerAngularVelocity
    const runawayBodySpin =
      Math.abs(bodyAngularVelocity) >
      spinGuardConfig.triggerPlayerAngularVelocity

    if (
      spinGuardConfig.lockPlayerBodyRotation &&
      (bodyRotationExceeded || bodyAngularVelocity !== 0)
    ) {
      player.lockPhysicsRotation()
    }

    let sample = this.samples.get(player.id)
    if (!sample) {
      sample = createSample(player, movementAngle, context)
      this.samples.set(player.id, sample)
    }

    recordContext(sample, context, deltaMs)
    sample.windowMs += deltaMs
    sample.aimDelta += angleDistance(aimAngle, sample.lastAimAngle)
    sample.facingDelta += angleDistance(
      facingAngle,
      sample.lastFacingAngle,
    )
    sample.stickDelta += angleDistance(
      stickAngle,
      sample.lastStickAngle,
    )
    if (
      movementAngle !== null &&
      sample.lastMovementAngle !== null
    ) {
      sample.movementDelta += angleDistance(
        movementAngle,
        sample.lastMovementAngle,
      )
    }
    sample.lastAimAngle = sanitizeAngle(
      aimAngle,
      sample.lastAimAngle,
    )
    sample.lastFacingAngle = sanitizeAngle(
      facingAngle,
      sample.lastFacingAngle,
    )
    sample.lastStickAngle = sanitizeAngle(
      stickAngle,
      sample.lastStickAngle,
    )
    sample.lastMovementAngle = movementAngle

    const displacement = distance(
      player.position,
      sample.windowStart,
    )
    const visualSpinActionAllowed =
      context.currentAction !== 'carrier' &&
      context.currentAction !== 'juke' &&
      context.currentAction !== 'slash'
    const visualSpinning =
      sample.windowMs >= spinGuardConfig.windowMs &&
      displacement <= spinGuardConfig.orbitMaxDisplacement &&
      visualSpinActionAllowed &&
      (sample.aimDelta >= spinGuardConfig.aimDeltaThreshold ||
        sample.stickDelta >= spinGuardConfig.stickDeltaThreshold)
    const orbiting =
      sample.windowMs >= spinGuardConfig.windowMs &&
      displacement <= spinGuardConfig.orbitMaxDisplacement &&
      sample.facingDelta >= spinGuardConfig.facingDeltaThreshold &&
      (sample.aimDelta >= spinGuardConfig.aimDeltaThreshold ||
        sample.movementDelta >=
          spinGuardConfig.movementDeltaThreshold ||
        sample.carrierIntentChanges >= 3 ||
        sample.tacticalJobChanges >= 3)
    const shouldTrigger =
      spinGuardConfig.enabled &&
      (invalidState || runawayBodySpin || visualSpinning || orbiting)

    if (shouldTrigger) {
      const reason = invalidState
        ? 'invalidVectorOrAngle'
        : runawayBodySpin
          ? 'bodyAngularVelocity'
          : visualSpinning
            ? 'stationaryAimOrStickSpin'
          : sample.carrierIntentChanges >= 3 ||
              sample.tacticalJobChanges >= 3
            ? 'intentChurnOrbit'
            : 'facingMovementOrbit'
      this.recover(player, sample)
      console.warn('[SpinGuard Triggered]', {
        playerId: player.id,
        team: player.teamSide,
        role: player.role,
        hasCore: context.hasCore,
        currentAction: context.currentAction,
        currentTacticalJob: context.tacticalJob,
        jukeState:
          context.currentAction === 'juke' ? 'active' : 'idle',
        carrierIntent: context.carrierIntent,
        angularVelocity: bodyAngularVelocity,
        aimDelta: sample.aimDelta,
        facingDelta: sample.facingDelta,
        stickDelta: sample.stickDelta,
        movementDelta: sample.movementDelta,
        jukeDurationMs: sample.jukeDurationMs,
        carrierIntentChanges: sample.carrierIntentChanges,
        tacticalJobChanges: sample.tacticalJobChanges,
        lastStateTransitions: [...sample.stateTransitions],
        reason,
      })
      this.resetWindow(sample, player, movementAngle)
      return { playerId: player.id, hasCore: context.hasCore, reason }
    }

    if (sample.windowMs >= spinGuardConfig.windowMs) {
      if (!orbiting && !visualSpinning && !invalidState) {
        sample.lastStableAimAngle = aimAngle
        sample.lastStableFacingAngle = facingAngle
      }
      this.resetWindow(sample, player, movementAngle)
    }

    return null
  }

  private recover(player: Player, sample: SpinSample): void {
    player.recoverPhysicsState()

    if (!spinGuardConfig.autoRecover) {
      return
    }

    player.restoreFacing(
      sample.lastStableAimAngle,
      sample.lastStableFacingAngle,
    )
    player.stopMovement()
    this.recoveryMs.set(player.id, spinGuardConfig.recoveryMs)
  }

  private resetWindow(
    sample: SpinSample,
    player: Player,
    movementAngle: number | null,
  ): void {
    sample.windowMs = 0
    sample.windowStart = player.position
    sample.aimDelta = 0
    sample.facingDelta = 0
    sample.stickDelta = 0
    sample.movementDelta = 0
    sample.carrierIntentChanges = 0
    sample.tacticalJobChanges = 0
    sample.lastMovementAngle = movementAngle
  }
}

function createSample(
  player: Player,
  movementAngle: number | null,
  context: SpinGuardContext,
): SpinSample {
  const aimAngle = sanitizeAngle(player.getReleaseAimAngle(), 0)
  const facingAngle = sanitizeAngle(
    player.getBodyFacingAngle(),
    aimAngle,
  )
  const stickAngle = sanitizeAngle(
    player.getStickVisualRotation(),
    aimAngle,
  )

  return {
    windowMs: 0,
    windowStart: player.position,
    lastAimAngle: aimAngle,
    lastFacingAngle: facingAngle,
    lastStickAngle: stickAngle,
    lastMovementAngle: movementAngle,
    aimDelta: 0,
    facingDelta: 0,
    stickDelta: 0,
    movementDelta: 0,
    lastStableAimAngle: aimAngle,
    lastStableFacingAngle: facingAngle,
    lastAction: context.currentAction,
    lastTacticalJob: context.tacticalJob,
    lastCarrierIntent: context.carrierIntent,
    jukeDurationMs: 0,
    carrierIntentChanges: 0,
    tacticalJobChanges: 0,
    stateTransitions: [],
  }
}

function recordContext(
  sample: SpinSample,
  context: SpinGuardContext,
  deltaMs: number,
): void {
  if (context.currentAction === 'juke') {
    sample.jukeDurationMs += deltaMs
  } else {
    sample.jukeDurationMs = 0
  }

  if (context.currentAction !== sample.lastAction) {
    addTransition(
      sample,
      `action:${sample.lastAction}->${context.currentAction}`,
    )
    sample.lastAction = context.currentAction
  }

  if (context.tacticalJob !== sample.lastTacticalJob) {
    addTransition(
      sample,
      `job:${sample.lastTacticalJob ?? 'none'}->${context.tacticalJob ?? 'none'}`,
    )
    sample.lastTacticalJob = context.tacticalJob
    sample.tacticalJobChanges += 1
  }

  if (context.carrierIntent !== sample.lastCarrierIntent) {
    addTransition(
      sample,
      `intent:${sample.lastCarrierIntent ?? 'none'}->${context.carrierIntent ?? 'none'}`,
    )
    sample.lastCarrierIntent = context.carrierIntent
    sample.carrierIntentChanges += 1
  }
}

function addTransition(sample: SpinSample, transition: string): void {
  sample.stateTransitions.push(transition)
  if (sample.stateTransitions.length > 8) {
    sample.stateTransitions.shift()
  }
}

function angleDistance(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return spinGuardConfig.facingDeltaThreshold
  }

  return Math.abs(Phaser.Math.Angle.Wrap(current - previous))
}

function distance(a: Point, b: Point): number {
  if (!isValidVector(a) || !isValidVector(b)) {
    return Infinity
  }

  return Math.hypot(a.x - b.x, a.y - b.y)
}
