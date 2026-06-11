import Phaser from 'phaser'
import { aiCarrierConfig } from '../config/aiCarrierConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'
import { getHandlingAdjustedFumbleMs } from '../utils/possessionTiming'

export type CarrierIntentType =
  | 'shootDirect'
  | 'shootBank'
  | 'passToTeammate'
  | 'carryToAngle'
  | 'clearSafe'
  | 'holdBriefly'

export type CarrierIntent = {
  intentType: CarrierIntentType
  targetPoint: Point
  targetPlayerId: string | null
  chosenAtTime: number
  minCommitMs: number
  maxCommitMs: number
  releaseAfterChargeMs: number
  reason: string
  qualityScore: number
  carrySide: 'left' | 'right' | null
}

export type AICarrierIntentDebugState = {
  intentType: CarrierIntentType
  intentAgeMs: number
  targetPoint: Point
  targetPlayerId: string | null
  reason: string
  aimAngle: number
  desiredAimAngle: number
  angleDelta: number
  carryDurationMs: number
  releaseAfterChargeMs: number
  forcedReleaseInMs: number
  spinDetected: boolean
}

type CarrierRuntimeState = {
  playerId: string
  intent: CarrierIntent
  currentAimAngle: number
  desiredAimAngle: number
  lastBodyAngle: number
  spinDurationMs: number
  spinRotationRadians: number
  spinDetected: boolean
  stuckDurationMs: number
  forceReleaseReason: string | null
  releaseDeadlineMs: number
  changeTimes: number[]
  lastChurnWarningAt: number
  lastAimTurnSign: number
}

export type CarrierIntentSelection = {
  changed: boolean
  intent: CarrierIntent
}

export class AICarrierIntentSystem {
  private state: CarrierRuntimeState | null = null

  reset(): void {
    this.state = null
  }

  clearPlayer(playerId: string): void {
    if (this.state?.playerId === playerId) {
      this.state = null
    }
  }

  forceRelease(playerId: string, reason: string): void {
    if (this.state?.playerId === playerId) {
      this.state.forceReleaseReason = reason
    }
  }

  getLatestReleaseStartMs(player: Player): number {
    const baseFumbleMs = getHandlingAdjustedFumbleMs(
      player.attributes.ballHandling,
    )
    return Math.max(
      0,
      Math.min(
        aiCarrierConfig.aiMaxCarryMs,
        baseFumbleMs -
          aiCarrierConfig.aiReleaseSafetyLeadMs,
      ),
    )
  }

  select(
    player: Player,
    candidate: CarrierIntent,
    possessionMs: number,
    pressure: number,
    currentTargetValid: boolean,
  ): CarrierIntentSelection {
    if (!this.state || this.state.playerId !== player.id) {
      return this.commit(player, candidate, possessionMs)
    }

    const current = this.state.intent
    const ageMs = possessionMs - current.chosenAtTime
    const releaseLocked =
      isReleaseIntent(current.intentType) &&
      ageMs >= Math.max(0, current.releaseAfterChargeMs - 50)
    const forced = this.state.forceReleaseReason !== null

    if (releaseLocked && !forced) {
      return { changed: false, intent: current }
    }

    if (!currentTargetValid) {
      return this.commit(player, candidate, possessionMs)
    }

    if (
      forced &&
      isReleaseIntent(candidate.intentType) &&
      (!isReleaseIntent(current.intentType) ||
        current.reason !== this.state.forceReleaseReason)
    ) {
      return this.commit(player, candidate, possessionMs)
    }

    if (
      pressure >= 0.82 &&
      isReleaseIntent(candidate.intentType) &&
      (current.intentType === 'carryToAngle' ||
        current.intentType === 'holdBriefly')
    ) {
      return this.commit(player, candidate, possessionMs)
    }

    if (ageMs < current.minCommitMs) {
      return { changed: false, intent: current }
    }

    const targetDistance = distance(
      current.targetPoint,
      candidate.targetPoint,
    )
    const angleChange = Math.abs(
      Phaser.Math.Angle.Wrap(
        angleTo(player.position, candidate.targetPoint) -
          angleTo(player.position, current.targetPoint),
      ),
    )
    const targetChanged =
      targetDistance >= aiCarrierConfig.aiCarrierTargetChangeThreshold ||
      angleChange >=
        aiCarrierConfig.aiCarrierAngleChangeThresholdRadians ||
      current.intentType !== candidate.intentType ||
      current.targetPlayerId !== candidate.targetPlayerId
    const significantlyBetter =
      candidate.qualityScore >= current.qualityScore + 0.12
    const reevaluationReady =
      ageMs >=
      Math.max(
        aiCarrierConfig.aiCarrierReevaluateAfterMs,
        aiCarrierConfig.freezeCarrierTacticalJob
          ? aiCarrierConfig.carrierTacticReevalMs
          : 0,
      )
    const maxCommitExpired = ageMs >= current.maxCommitMs
    const releaseUpgrade =
      !isReleaseIntent(current.intentType) &&
      isReleaseIntent(candidate.intentType)
    const carrySideFlip =
      current.intentType === 'carryToAngle' &&
      candidate.intentType === 'carryToAngle' &&
      current.carrySide !== null &&
      candidate.carrySide !== null &&
      current.carrySide !== candidate.carrySide
    const carrySideChangeAllowed =
      !carrySideFlip || significantlyBetter

    if (
      targetChanged &&
      carrySideChangeAllowed &&
      ((reevaluationReady && significantlyBetter) ||
        (maxCommitExpired &&
          (releaseUpgrade || significantlyBetter)))
    ) {
      return this.commit(player, candidate, possessionMs)
    }

    return { changed: false, intent: current }
  }

  update(
    player: Player,
    possessionMs: number,
    deltaMs: number,
    moveTarget: Point,
  ): AICarrierIntentDebugState | null {
    const state = this.state

    if (!state || state.playerId !== player.id) {
      return null
    }

    state.releaseDeadlineMs = this.getLatestReleaseStartMs(player)
    const deltaSeconds = Math.max(0.001, deltaMs / 1000)
    state.desiredAimAngle = angleTo(
      player.position,
      state.intent.targetPoint,
    )
    const rawAngleDelta = Phaser.Math.Angle.Wrap(
      state.desiredAimAngle - state.currentAimAngle,
    )
    let angleDelta =
      Math.abs(rawAngleDelta) <= aiCarrierConfig.aiAimDeadzoneRadians
        ? 0
        : rawAngleDelta
    if (
      aiCarrierConfig.aiPreventAimFlipFlop &&
      Math.abs(angleDelta) >= Math.PI - 0.12 &&
      state.lastAimTurnSign !== 0
    ) {
      angleDelta =
        Math.abs(angleDelta) * state.lastAimTurnSign
    }
    const maximumTurn =
      aiCarrierConfig.aiAimTurnRateRadiansPerSec * deltaSeconds
    const turn = aiCarrierConfig.aiAimSmoothingEnabled
      ? Phaser.Math.Clamp(angleDelta, -maximumTurn, maximumTurn)
      : angleDelta

    state.currentAimAngle = Phaser.Math.Angle.Wrap(
      state.currentAimAngle + turn,
    )
    if (Math.abs(turn) > 0.0001) {
      state.lastAimTurnSign = Math.sign(turn)
    }

    const bodyDelta = Phaser.Math.Angle.Wrap(
      player.getBodyFacingAngle() - state.lastBodyAngle,
    )
    const angularVelocity = Math.abs(bodyDelta) / deltaSeconds
    state.lastBodyAngle = player.getBodyFacingAngle()

    if (
      aiCarrierConfig.aiSpinDetectionEnabled &&
      angularVelocity >=
        aiCarrierConfig.aiSpinAngularVelocityThreshold
    ) {
      if (
        state.spinRotationRadians !== 0 &&
        Math.sign(state.spinRotationRadians) !== Math.sign(bodyDelta)
      ) {
        state.spinDurationMs *= 0.35
        state.spinRotationRadians *= 0.35
      }
      state.spinDurationMs += deltaMs
      state.spinRotationRadians += bodyDelta
    } else {
      state.spinDurationMs = Math.max(
        0,
        state.spinDurationMs - deltaMs * 1.5,
      )
      const decayedRotation = Math.max(
        0,
        Math.abs(state.spinRotationRadians) -
          Math.abs(bodyDelta) * 1.5,
      )
      state.spinRotationRadians =
        decayedRotation * Math.sign(state.spinRotationRadians)
    }

    if (
      !state.spinDetected &&
      state.spinDurationMs >= aiCarrierConfig.aiSpinDurationMs &&
      Math.abs(state.spinRotationRadians) >=
        aiCarrierConfig.aiSpinMinimumRotationRadians
    ) {
      state.spinDetected = true
      console.warn('[AI Carrier Spin Detected]', {
        playerId: player.id,
        intentType: state.intent.intentType,
        angularVelocity,
        rotationRadians: Math.abs(state.spinRotationRadians),
      })
      if (aiCarrierConfig.aiSpinForceRelease) {
        state.forceReleaseReason = 'spinDetected'
      }
    }

    const carryingToAngle =
      state.intent.intentType === 'carryToAngle'
    const farFromMoveTarget =
      distance(player.position, moveTarget) > 32
    const stuck =
      carryingToAngle &&
      farFromMoveTarget &&
      magnitude(player.velocity) <=
        aiCarrierConfig.aiCarryStuckSpeedThreshold

    state.stuckDurationMs = stuck
      ? state.stuckDurationMs + deltaMs
      : Math.max(0, state.stuckDurationMs - deltaMs)

    if (
      aiCarrierConfig.aiForceReleaseWhenStuck &&
      state.stuckDurationMs >= aiCarrierConfig.aiCarryStuckTimeMs
    ) {
      state.forceReleaseReason = 'stuck'
    }

    if (possessionMs >= state.releaseDeadlineMs) {
      state.forceReleaseReason = 'maxCarry'
    }

    return this.getDebugState(possessionMs)
  }

  getAimAngle(playerId: string): number | null {
    return this.state?.playerId === playerId
      ? this.state.currentAimAngle
      : null
  }

  getForceReleaseReason(playerId: string): string | null {
    return this.state?.playerId === playerId
      ? this.state.forceReleaseReason
      : null
  }

  getIntent(playerId: string): CarrierIntent | null {
    if (this.state?.playerId !== playerId) {
      return null
    }

    return cloneIntent(this.state.intent)
  }

  getDebugState(
    possessionMs: number,
  ): AICarrierIntentDebugState | null {
    const state = this.state

    if (!state) {
      return null
    }

    return {
      intentType: state.intent.intentType,
      intentAgeMs: Math.max(
        0,
        possessionMs - state.intent.chosenAtTime,
      ),
      targetPoint: { ...state.intent.targetPoint },
      targetPlayerId: state.intent.targetPlayerId,
      reason: state.intent.reason,
      aimAngle: state.currentAimAngle,
      desiredAimAngle: state.desiredAimAngle,
      angleDelta: Phaser.Math.Angle.Wrap(
        state.desiredAimAngle - state.currentAimAngle,
      ),
      carryDurationMs: possessionMs,
      releaseAfterChargeMs: state.intent.releaseAfterChargeMs,
      forcedReleaseInMs: Math.max(
        0,
        state.releaseDeadlineMs - possessionMs,
      ),
      spinDetected: state.spinDetected,
    }
  }

  private commit(
    player: Player,
    candidate: CarrierIntent,
    possessionMs: number,
  ): CarrierIntentSelection {
    const previous = this.state
    const changeTimes = previous
      ? previous.changeTimes.filter(
          (time) => possessionMs - time <= 2000,
        )
      : []

    if (previous) {
      changeTimes.push(possessionMs)
    }

    const intent: CarrierIntent = {
      ...candidate,
      chosenAtTime: possessionMs,
      targetPoint: { ...candidate.targetPoint },
    }
    const currentAimAngle =
      previous?.currentAimAngle ?? player.getReleaseAimAngle()
    this.state = {
      playerId: player.id,
      intent,
      currentAimAngle,
      desiredAimAngle: angleTo(player.position, intent.targetPoint),
      lastBodyAngle: player.getBodyFacingAngle(),
      spinDurationMs: previous?.spinDurationMs ?? 0,
      spinRotationRadians: previous?.spinRotationRadians ?? 0,
      spinDetected: previous?.spinDetected ?? false,
      stuckDurationMs: 0,
      forceReleaseReason: previous?.forceReleaseReason ?? null,
      releaseDeadlineMs: this.getLatestReleaseStartMs(player),
      changeTimes,
      lastChurnWarningAt: previous?.lastChurnWarningAt ?? -Infinity,
      lastAimTurnSign: previous?.lastAimTurnSign ?? 0,
    }

    if (
      changeTimes.length > 4 &&
      possessionMs - this.state.lastChurnWarningAt >= 2000
    ) {
      this.state.lastChurnWarningAt = possessionMs
      console.warn('[AI Carrier Intent Churn]', {
        playerId: player.id,
        changesInTwoSeconds: changeTimes.length,
      })
    }

    return { changed: true, intent: cloneIntent(intent) }
  }
}

function isReleaseIntent(intentType: CarrierIntentType): boolean {
  return (
    intentType === 'shootDirect' ||
    intentType === 'shootBank' ||
    intentType === 'passToTeammate' ||
    intentType === 'clearSafe'
  )
}

function cloneIntent(intent: CarrierIntent): CarrierIntent {
  return {
    ...intent,
    targetPoint: { ...intent.targetPoint },
  }
}

function angleTo(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

function magnitude(point: Point): number {
  return Math.hypot(point.x, point.y)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
