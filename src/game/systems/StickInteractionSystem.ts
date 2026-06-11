import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getConfiguredAiAssistContext,
} from '../ai/AIAssist'
import { aiConfig } from '../config/aiConfig'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { gatherConfig } from '../config/gatherConfig'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import { stickConfig } from '../config/stickConfig'
import { stickStanceConfig } from '../config/stickStanceConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import type { Point } from '../data/geometry'
import type { StickActionState } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { CradleZone, Player } from '../entities/Player'
import type { HandednessSign } from '../rules/Handedness'
import {
  clampVectorMagnitude,
  normalizeSafe,
} from '../utils/vectorSafety'
import {
  KeeperClearSafetySystem,
  type KeeperClearSafetyResult,
} from './KeeperClearSafetySystem'
import { KeeperShieldSystem } from './KeeperShieldSystem'
import { isNearOwnGoal } from './ClearSafetySystem'

export type CorePossessionState =
  | 'FREE'
  | 'CRADLED_STABLE'
  | 'CRADLED_CHARGING'
  | 'CRADLED_OVERCHARGED'
  | 'FUMBLED'
  | 'RELEASED_COOLDOWN'

export type StickIntent = {
  hold: boolean
  swing?: boolean
  suppressEmptyReleaseSwing?: boolean
  releaseTarget?: Point
  aiReleaseDelayMs?: number
  chargeIntensity?: number
}

export type CradleFailureReason =
  | 'not catch-ready'
  | 'outside cradle zone'
  | 'speed too high'
  | 'outside gather funnel'
  | 'no eligible player'
  | 'cooldown active'
  | 'already cradled'
  | 'deflect fallback'
  | 'ready'

export type GatherMode = 'active' | 'passive' | 'none'

export type GatherDenyReason =
  | 'ready'
  | 'disabled'
  | 'cooldown'
  | 'outside radius'
  | 'outside angle'
  | 'speed too high'
  | 'action state'
  | 'keeper shield'
  | 'cradle zone'
  | 'acquired'

export type GatherDebugState = {
  mode: GatherMode
  eligible: boolean
  funnelAngleError: number
  relativeSpeed: number
  cooldownMs: number
  denyReason: GatherDenyReason
}

export type StickInteractionResult =
  | 'none'
  | 'passive nudge'
  | 'active swing'
  | 'cradle'
  | 'release'
  | 'fumble'

export type StickInteractionEvent = {
  result: StickInteractionResult
  playerId: string
}

type ActionRuntime = {
  state: StickActionState
  elapsedMs: number
  swingCooldownMs: number
}

type CradleTestResult = {
  accepted: boolean
  relativeSpeed: number
  insideZone: boolean
  maxEntrySpeed: number
}

type DeflectHit = {
  closestPoint: Point
  normal: Point
  distance: number
}

type ReleaseVector = {
  start: Point
  end: Point
  msRemaining: number
}

type GatherRipple = {
  position: Point
  msRemaining: number
}

type GatherEvaluation = GatherDebugState & {
  player: Player
  socketDistance: number
  closeRangeForgiveness: boolean
  radius: number
  strength: number
  maxSpeed: number
  snapRadius: number
  snapEnabled: boolean
}

type PendingRelease = {
  playerId: string
  elapsedMs: number
  releaseAimDirection: Point
  releaseImpulseDirection: Point
  startRotation: number
  windupRotation: number
  endRotation: number
  followRotation: number
  swingSign: HandednessSign
  chargeElapsedMs: number
  hardCharge: boolean
  released: boolean
}

export class StickInteractionSystem {
  private coreState: CorePossessionState = 'FREE'
  private carrierId: string | null = null
  private cradleElapsedMs = 0
  private releaseCooldownMsRemaining = 0
  private actionRuntimes = new Map<string, ActionRuntime>()
  private contactCooldowns = new Map<string, number>()
  private releaseRegrabCooldowns = new Map<string, number>()
  private fumbleRegrabCooldowns = new Map<string, number>()
  private gatherAttemptCooldowns = new Map<string, number>()
  private failedGatherGrace = new Map<string, number>()
  private catchReadyHoldMs = new Map<string, number>()
  private catchReadyExitMs = new Map<string, number>()
  private gatherDebug = new Map<string, GatherDebugState>()
  private previousHold = new Map<string, boolean>()
  private previousSwing = new Map<string, boolean>()
  private cradleFailures = new Map<string, CradleFailureReason>()
  private catchAutoOrientActive = new Map<string, boolean>()
  private cradleOpenDirections = new Map<string, number>()
  private debugEnabled = false
  private debugFocusPlayerId: string | null = null
  private debugGraphics: Phaser.GameObjects.Graphics
  private debugText: Phaser.GameObjects.Text
  private releaseGraphics: Phaser.GameObjects.Graphics
  private releaseVector: ReleaseVector | null = null
  private pendingRelease: PendingRelease | null = null
  private lastInteraction: StickInteractionResult = 'none'
  private interactionEvent: StickInteractionEvent | null = null
  private releaseForcePreview: number = stickConfig.releaseForceMin
  private carryPlayer: Player | null = null
  private carrySocket: Point | null = null
  private desiredCarrySocket: Point | null = null
  private carryPoseAngles = new Map<string, number>()
  private loadbackAngles = new Map<string, number>()
  private hardChargeActive = false
  private currentChargeIntensity = 0
  private gatherRipple: GatherRipple | null = null
  private lastReleaseImpulseDirection: Point | null = null
  private readonly keeperClearSafety = new KeeperClearSafetySystem()
  private readonly keeperShield = new KeeperShieldSystem(
    this.keeperClearSafety,
  )
  private stanceIdleMs = new Map<string, number>()

  constructor(scene: Phaser.Scene) {
    this.releaseGraphics = scene.add.graphics().setDepth(19)
    this.debugGraphics = scene.add.graphics()
    this.debugGraphics.setDepth(20)
    this.debugText = scene.add.text(
      stickConfig.debug.textX,
      stickConfig.debug.textY,
      '',
      {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: stickConfig.debug.textColor,
      },
    )
    this.debugText.setDepth(21)
    this.debugText.setVisible(false)
  }

  update(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
    preferredPlayerId: string,
    deltaMs: number,
  ): void {
    this.debugFocusPlayerId = this.carrierId ?? preferredPlayerId
    this.ensurePlayers(players)
    this.updateTimers(deltaMs)
    this.updateActionStates(players, intents, deltaMs)
    const hadPendingRelease = this.pendingRelease !== null

    if (hadPendingRelease) {
      this.advancePendingRelease(deltaMs)
    }

    this.updateStickOrientations(core, players, deltaMs)

    if (hadPendingRelease) {
      this.resolvePendingRelease(core, players, deltaMs)
    } else if (this.isCradled()) {
      this.updateCarrier(core, players, intents, deltaMs)
    } else {
      this.applyCradleAssist(core, players, preferredPlayerId, deltaMs)
      this.tryAcquire(core, players, preferredPlayerId)

      if (!this.isCradled()) {
        this.processContacts(core, players)
      }
    }

    for (const player of players) {
      const intent = intents.get(player.id)
      this.previousHold.set(player.id, intent?.hold ?? false)
      this.previousSwing.set(player.id, intent?.swing ?? false)
      player.setStickState(this.getStickState(player.id))
      const ownsPossessionVisual =
        player.id === this.carrierId ||
        player.id === this.pendingRelease?.playerId

      player.setChargeVisual(
        ownsPossessionVisual ? this.getChargeNormalized() : 0,
        ownsPossessionVisual && this.isHardChargeVisualActive(),
        ownsPossessionVisual &&
          this.coreState === 'CRADLED_OVERCHARGED',
      )
    }

    core.setPossessionVisual(
      this.isCradled() ? this.getChargeNormalized() : 0,
      this.isCradled() && this.isHardChargeVisualActive(),
      this.coreState === 'CRADLED_OVERCHARGED',
    )
    this.drawReleaseSwing(players)
    this.drawDebug(core, players)
  }

  getCarrierId(): string | null {
    return this.carrierId
  }

  getState(): CorePossessionState {
    return this.coreState
  }

  getStickState(playerId: string): StickActionState {
    return this.actionRuntimes.get(playerId)?.state ?? 'IDLE'
  }

  getCradleElapsedMs(): number {
    return this.cradleElapsedMs
  }

  getChargeNormalized(): number {
    return Phaser.Math.Clamp(
      this.cradleElapsedMs / stickConfig.overchargeMs,
      0,
      1,
    )
  }

  getReleaseForcePreview(): number {
    return this.releaseForcePreview
  }

  isHardChargeActive(): boolean {
    return this.hardChargeActive
  }

  private isHardChargeVisualActive(): boolean {
    return (
      this.hardChargeActive &&
      (this.getChargeNormalized() >=
        possessionFeelConfig.hardChargeVisualThreshold ||
        this.currentChargeIntensity >=
          possessionFeelConfig.hardChargePressureThreshold)
    )
  }

  getCarryPoseAngle(playerId: string): number {
    return this.carryPoseAngles.get(playerId) ?? 0
  }

  getLoadbackAngle(playerId: string): number {
    return this.loadbackAngles.get(playerId) ?? 0
  }

  getCurrentCarrySocket(): Point | null {
    return this.carrySocket ? { ...this.carrySocket } : null
  }

  getDesiredCarrySocket(): Point | null {
    return this.desiredCarrySocket
      ? { ...this.desiredCarrySocket }
      : null
  }

  getReleaseImpulseDirection(): Point | null {
    const direction =
      this.pendingRelease?.releaseImpulseDirection ??
      this.lastReleaseImpulseDirection

    return direction ? { ...direction } : null
  }

  getPendingReleaseAimDirection(): Point | null {
    return this.pendingRelease
      ? { ...this.pendingRelease.releaseAimDirection }
      : null
  }

  getKeeperClearSafetyResult(
    side: 'A' | 'B',
  ): KeeperClearSafetyResult | null {
    return this.keeperClearSafety.getLastResult(side)
  }

  getCradlePhase(): string {
    if (this.coreState === 'CRADLED_OVERCHARGED') {
      return 'OVERCHARGED'
    }

    if (this.hardChargeActive) {
      return 'HARD CHARGE'
    }

    if (this.coreState === 'CRADLED_CHARGING') {
      return 'CHARGING'
    }

    if (this.coreState === 'CRADLED_STABLE') {
      return 'STABLE'
    }

    return 'NONE'
  }

  isCatchAutoOrientActive(playerId: string): boolean {
    return this.catchAutoOrientActive.get(playerId) ?? false
  }

  isCoreInCatchAssistRadius(core: Core, player: Player): boolean {
    return this.evaluateGather(core, player).eligible
  }

  getCradleFailureReason(playerId: string): CradleFailureReason {
    return this.cradleFailures.get(playerId) ?? 'not catch-ready'
  }

  getGatherDebugState(playerId: string): GatherDebugState {
    return this.gatherDebug.get(playerId) ?? {
      mode: 'none',
      eligible: false,
      funnelAngleError: 0,
      relativeSpeed: 0,
      cooldownMs: 0,
      denyReason: 'action state',
    }
  }

  getLastInteraction(): StickInteractionResult {
    return this.lastInteraction
  }

  cancelPlayerAction(playerId: string): void {
    if (
      playerId === this.carrierId ||
      playerId === this.pendingRelease?.playerId
    ) {
      return
    }

    const runtime = this.actionRuntimes.get(playerId)
    if (runtime) {
      runtime.state = 'IDLE'
      runtime.elapsedMs = 0
    }
    this.previousHold.set(playerId, false)
    this.previousSwing.set(playerId, false)
    this.catchReadyHoldMs.set(playerId, 0)
    this.catchReadyExitMs.set(playerId, 0)
    this.failedGatherGrace.delete(playerId)
    this.catchAutoOrientActive.set(playerId, false)
  }

  consumeInteractionEvent(): StickInteractionEvent | null {
    const event = this.interactionEvent
    this.interactionEvent = null
    return event
  }

  forceFumble(
    core: Core,
    players: Player[],
    targetPlayerId: string,
    contactDirection?: Point,
    speed: number = stickConfig.fumbleSpeed,
    cradleSideBias: number = 0.35,
  ): boolean {
    if (this.carrierId !== targetPlayerId || !this.isCradled()) {
      return false
    }

    const carrier = players.find((player) => player.id === targetPlayerId)

    if (!carrier) {
      return false
    }

    this.fumble(
      core,
      carrier,
      contactDirection,
      speed,
      cradleSideBias,
    )
    return true
  }

  toggleDebug(): boolean {
    this.setDebugEnabled(!this.debugEnabled)
    return this.debugEnabled
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    if (!this.debugEnabled) {
      this.debugGraphics.clear()
      this.debugText.setVisible(false)
    }
  }

  clearForReset(core: Core): void {
    this.coreState = 'FREE'
    this.carrierId = null
    this.cradleElapsedMs = 0
    this.releaseCooldownMsRemaining = 0
    this.contactCooldowns.clear()
    this.releaseRegrabCooldowns.clear()
    this.fumbleRegrabCooldowns.clear()
    this.gatherAttemptCooldowns.clear()
    this.failedGatherGrace.clear()
    this.catchReadyHoldMs.clear()
    this.catchReadyExitMs.clear()
    this.gatherDebug.clear()
    this.previousHold.clear()
    this.previousSwing.clear()
    this.cradleFailures.clear()
    this.catchAutoOrientActive.clear()
    this.cradleOpenDirections.clear()
    this.carryPoseAngles.clear()
    this.loadbackAngles.clear()
    this.stanceIdleMs.clear()
    this.releaseVector = null
    this.gatherRipple = null
    this.pendingRelease = null
    this.lastReleaseImpulseDirection = null
    this.keeperClearSafety.reset()
    this.keeperShield.reset()
    this.clearCarryControl()
    this.lastInteraction = 'none'
    this.interactionEvent = null
    this.releaseForcePreview = stickConfig.releaseForceMin
    this.releaseGraphics.clear()

    for (const runtime of this.actionRuntimes.values()) {
      runtime.state = 'IDLE'
      runtime.elapsedMs = 0
      runtime.swingCooldownMs = 0
    }

    core.setSensor(false)
    core.setPossessionVisual(0, false, false)
  }

  private ensurePlayers(players: Player[]): void {
    for (const player of players) {
      if (!this.actionRuntimes.has(player.id)) {
        this.actionRuntimes.set(player.id, {
          state: 'IDLE',
          elapsedMs: 0,
          swingCooldownMs: 0,
        })
      }

      if (!this.stanceIdleMs.has(player.id)) {
        this.stanceIdleMs.set(player.id, 0)
      }
      if (!this.catchReadyHoldMs.has(player.id)) {
        this.catchReadyHoldMs.set(player.id, 0)
      }
      if (!this.catchReadyExitMs.has(player.id)) {
        this.catchReadyExitMs.set(player.id, 0)
      }
    }
  }

  private updateTimers(deltaMs: number): void {
    this.releaseCooldownMsRemaining = Math.max(
      0,
      this.releaseCooldownMsRemaining - deltaMs,
    )

    for (const [playerId, cooldown] of this.contactCooldowns) {
      this.contactCooldowns.set(playerId, Math.max(0, cooldown - deltaMs))
    }
    this.tickCooldowns(this.releaseRegrabCooldowns, deltaMs)
    this.tickCooldowns(this.fumbleRegrabCooldowns, deltaMs)
    this.tickCooldowns(this.gatherAttemptCooldowns, deltaMs)
    this.tickCooldowns(this.failedGatherGrace, deltaMs)

    for (const runtime of this.actionRuntimes.values()) {
      runtime.elapsedMs += deltaMs
      runtime.swingCooldownMs = Math.max(0, runtime.swingCooldownMs - deltaMs)
    }

    if (this.releaseVector) {
      this.releaseVector.msRemaining -= deltaMs

      if (this.releaseVector.msRemaining <= 0) {
        this.releaseVector = null
      }
    }

    if (this.gatherRipple) {
      this.gatherRipple.msRemaining -= deltaMs

      if (this.gatherRipple.msRemaining <= 0) {
        this.gatherRipple = null
      }
    }

    if (
      (this.coreState === 'FUMBLED' || this.coreState === 'RELEASED_COOLDOWN') &&
      this.releaseCooldownMsRemaining === 0
    ) {
      this.coreState = 'FREE'
    }
  }

  private tickCooldowns(
    cooldowns: Map<string, number>,
    deltaMs: number,
  ): void {
    for (const [playerId, cooldown] of cooldowns) {
      const next = Math.max(0, cooldown - deltaMs)

      if (next === 0) {
        cooldowns.delete(playerId)
      } else {
        cooldowns.set(playerId, next)
      }
    }
  }

  private updateActionStates(
    players: Player[],
    intents: Map<string, StickIntent>,
    deltaMs: number,
  ): void {
    for (const player of players) {
      if (
        player.id === this.carrierId ||
        player.id === this.pendingRelease?.playerId
      ) {
        continue
      }

      const runtime = this.actionRuntimes.get(player.id)!
      const intent = intents.get(player.id) ?? { hold: false }
      const holdMs = intent.hold
        ? (this.catchReadyHoldMs.get(player.id) ?? 0) + deltaMs
        : 0
      const exitMs = intent.hold
        ? gatherConfig.catchReadyExitDelayMs
        : Math.max(
            0,
            (this.catchReadyExitMs.get(player.id) ?? 0) - deltaMs,
          )
      this.catchReadyHoldMs.set(player.id, holdMs)
      this.catchReadyExitMs.set(player.id, exitMs)

      if (runtime.state === 'SWINGING') {
        if (runtime.elapsedMs >= stickConfig.swingDurationMs) {
          this.setActionState(player.id, 'RELEASE_RECOVERY')
        }
        continue
      }

      if (
        runtime.state === 'RELEASE_RECOVERY' &&
        runtime.elapsedMs < stickConfig.releaseRecoveryMs
      ) {
        continue
      }

      if (
        runtime.state === 'FUMBLED_COOLDOWN' &&
        (this.fumbleRegrabCooldowns.get(player.id) ?? 0) > 0
      ) {
        continue
      }

      if (
        runtime.state === 'RELEASE_COOLDOWN' &&
        (this.releaseRegrabCooldowns.get(player.id) ?? 0) > 0
      ) {
        continue
      }

      const releasedEmpty =
        stickConfig.lightSwingOnEmptyRelease &&
        !intent.suppressEmptyReleaseSwing &&
        (this.previousHold.get(player.id) ?? false) &&
        !intent.hold
      const requestedSwing =
        (intent.swing && !(this.previousSwing.get(player.id) ?? false)) ||
        releasedEmpty

      if (requestedSwing && runtime.swingCooldownMs === 0) {
        runtime.swingCooldownMs =
          player.controllerType === 'ai'
            ? stickConfig.aiSwingCooldownMs
            : stickConfig.swingCooldownMs
        this.setActionState(player.id, 'SWINGING')
      } else if (
        holdMs >= gatherConfig.catchReadyMinHoldMs ||
        exitMs > 0
      ) {
        this.setActionState(player.id, 'CATCH_READY')
      } else {
        this.setActionState(player.id, 'IDLE')
      }
    }
  }

  private updateStickOrientations(
    core: Core,
    players: Player[],
    deltaMs: number,
  ): void {
    const deltaSeconds = Math.max(0, deltaMs / 1000)

    for (const player of players) {
      if (player.id === this.pendingRelease?.playerId) {
        player.setRunningStickStanceActive(false)
        this.stanceIdleMs.set(player.id, 0)
        player.setStickVisualRotation(
          this.getPendingReleaseRotation(this.pendingRelease),
        )
        this.catchAutoOrientActive.set(player.id, false)
        this.cradleOpenDirections.set(
          player.id,
            player.getStickVisualRotation() -
            stickConfig.cradleFacingOffsetRadians *
              player.getPocketFacingSign(),
        )
        continue
      }

      const coreAngle = Phaser.Math.Angle.Between(
        player.position.x,
        player.position.y,
        core.position.x,
        core.position.y,
      )
      const coreDistance = distance(player.position, core.position)
      const autoOrientActive =
        !this.isCradled() &&
        this.getStickState(player.id) === 'CATCH_READY' &&
        coreDistance >= stickConfig.catchAssistMinimumAimDistance &&
        coreDistance <= stickConfig.catchAssistDetectionRadius
      const state = this.getStickState(player.id)
      const isCarrier = this.isCradled() && player.id === this.carrierId
      const usesKeeperShield = this.keeperShield.usesShield(player)
      const idleForStance =
        state === 'IDLE' &&
        !isCarrier &&
        player.getDefenseVisualState() === 'IDLE'
      const idleMs = idleForStance
        ? (this.stanceIdleMs.get(player.id) ?? 0) + deltaMs
        : 0
      const stanceResetActive =
        stickStanceConfig.stanceResetEnabled &&
        idleForStance &&
        !usesKeeperShield &&
        !(
          gatherConfig.gatherOverridesStanceReset &&
          gatherConfig.stanceResetDoesNotCancelGather &&
          this.isPlayerInsideGatherRange(core, player)
        ) &&
        idleMs >= stickStanceConfig.stanceResetDelayMs

      this.stanceIdleMs.set(player.id, idleMs)
      player.setRunningStickStanceActive(stanceResetActive)
      let targetRotation = player.getReleaseAimAngle()
      let loadback = 0

      if (isCarrier) {
        const chargeNormalized = this.getChargeNormalized()
        const bodyAngle = possessionFeelConfig.carryControlEnabled
          ? player.getBodyFacingAngle()
          : player.getReleaseAimAngle()
        const rawCarryDelta = Phaser.Math.Angle.Wrap(
          player.getReleaseAimAngle() - bodyAngle,
        )
        const normalizedCarryDelta = Phaser.Math.Clamp(
          rawCarryDelta /
            Math.max(0.01, possessionFeelConfig.carryPoseMaxArcRadians),
          -1,
          1,
        )
        const carryDelta =
          Math.abs(normalizedCarryDelta) <
          possessionFeelConfig.carryControlDeadzone
            ? 0
            : Phaser.Math.Clamp(
                rawCarryDelta,
                -possessionFeelConfig.carryPoseMaxArcRadians,
                possessionFeelConfig.carryPoseMaxArcRadians,
              ) * possessionFeelConfig.carryAimBlend
        const carryPoseAngle = possessionFeelConfig.carryControlEnabled
          ? bodyAngle +
            carryDelta +
            possessionFeelConfig.carryPoseOffsetRadians *
              player.getPocketFacingSign()
          : player.getReleaseAimAngle()
        loadback = Phaser.Math.Linear(
          stickConfig.chargeLoadbackMinRadians,
          stickConfig.chargeLoadbackMaxRadians,
          chargeNormalized,
        )
        const overchargeJitter =
          this.coreState === 'CRADLED_OVERCHARGED'
            ? Math.sin(
                (this.cradleElapsedMs / 1000) *
                  stickConfig.overchargeJitterSpeed,
              ) * stickConfig.overchargeJitterAmount
            : 0

        targetRotation =
          carryPoseAngle +
          (-loadback + overchargeJitter) *
          player.getPocketFacingSign()
        this.carryPoseAngles.set(player.id, carryPoseAngle)
        this.loadbackAngles.set(player.id, loadback)
      } else if (autoOrientActive) {
        targetRotation =
          coreAngle +
          stickConfig.cradleFacingOffsetRadians *
            player.getPocketFacingSign()
      } else if (usesKeeperShield) {
        targetRotation = player.getReleaseAimAngle()
      } else if (stanceResetActive) {
        targetRotation =
          player.getBodyFacingAngle() +
          stickStanceConfig.runningStanceOffsetRadians *
            player.getHandednessMountSign()
      } else if (
        !isCarrier &&
        state === 'CATCH_READY' &&
        player.getDefenseVisualState() === 'IDLE'
      ) {
        targetRotation +=
          stickConfig.readyStanceOffsetRadians *
          player.getPocketFacingSign()
      } else if (
        state === 'IDLE' &&
        player.getDefenseVisualState() === 'IDLE'
      ) {
        targetRotation = player.getStickVisualRotation()
      }
      const strength = autoOrientActive
        ? stickConfig.catchAutoOrientStrength
        : isCarrier
          ? Math.max(
              possessionFeelConfig.carryPoseSmoothing,
              stickConfig.chargeLoadbackSmoothing,
            )
          : stanceResetActive
            ? stickStanceConfig.stanceReturnSmoothing
          : stickConfig.aimSmoothing
      const smoothing = 1 - Math.exp(-strength * deltaSeconds)
      const angularDelta = Phaser.Math.Angle.Wrap(
        targetRotation - player.getStickVisualRotation(),
      )
      const maximumRotation =
        (isCarrier
          ? possessionFeelConfig.carryPoseRotationLimit
          : stickConfig.maxStickRotationSpeed) * deltaSeconds
      const rotationStep = Phaser.Math.Clamp(
        angularDelta * smoothing,
        -maximumRotation,
        maximumRotation,
      )

      player.setStickVisualRotation(
        player.getStickVisualRotation() + rotationStep,
      )
      this.catchAutoOrientActive.set(player.id, autoOrientActive)
      this.cradleOpenDirections.set(
        player.id,
        autoOrientActive
          ? coreAngle
          : player.getStickVisualRotation() -
              stickConfig.cradleFacingOffsetRadians *
                player.getPocketFacingSign(),
      )
    }
  }

  private updateCarrier(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
    deltaMs: number,
  ): void {
    const carrier = players.find((player) => player.id === this.carrierId)

    if (!carrier) {
      this.clearForReset(core)
      return
    }

    const intent = intents.get(carrier.id) ?? { hold: false }
    const released = (this.previousHold.get(carrier.id) ?? false) && !intent.hold

    this.cradleElapsedMs += deltaMs
    this.currentChargeIntensity = intent.chargeIntensity ?? 0
    this.hardChargeActive =
      possessionFeelConfig.hardChargeEnabled &&
      (this.cradleElapsedMs >= possessionFeelConfig.hardChargeHoldMs ||
        this.currentChargeIntensity >=
          possessionFeelConfig.hardChargePressureThreshold)
    this.syncCradleState(carrier.id)
    this.updateCarrySocket(carrier, deltaMs)
    core.holdAt(carrier.getCradleSocket())
    this.releaseForcePreview = magnitude(
      this.calculateReleaseVelocity(carrier.getReleaseAimForward(), carrier),
    )

    const baseFumbleTime =
      stickConfig.fumbleMs *
      Phaser.Math.Linear(
        0.98,
        1.02,
        Phaser.Math.Clamp(carrier.attributes.ballHandling, 0, 1),
      )
    const fumbleTime = baseFumbleTime

    if (
      intent.releaseTarget &&
      this.cradleElapsedMs >=
        (intent.aiReleaseDelayMs ?? aiConfig.aiReleaseDelayMs)
    ) {
      this.beginReleaseToward(carrier, intent.releaseTarget)
      return
    }

    if (this.cradleElapsedMs >= fumbleTime) {
      this.fumble(core, carrier)
      return
    }

    if (released) {
      this.beginReleaseAlongAim(carrier)
    }
  }

  private updateCarrySocket(
    carrier: Player,
    deltaMs: number,
  ): void {
    const baseSocket = carrier.getBaseCradleSocket()

    if (!possessionFeelConfig.carryControlEnabled) {
      this.carrySocket = { ...baseSocket }
      this.desiredCarrySocket = { ...baseSocket }
      carrier.setCarrySocket(baseSocket)
      return
    }

    const bodyAngle = carrier.getBodyFacingAngle()
    const relativeAim = Phaser.Math.Angle.Wrap(
      carrier.getReleaseAimAngle() - bodyAngle,
    )
    let control = Phaser.Math.Clamp(
      relativeAim /
        Math.max(0.01, possessionFeelConfig.carryPoseMaxArcRadians),
      -1,
      1,
    )

    if (Math.abs(control) < possessionFeelConfig.carryControlDeadzone) {
      control = 0
    }

    const speed = magnitude(carrier.velocity)
    const sway =
      Math.sin(
        (this.cradleElapsedMs / 1000) *
          possessionFeelConfig.carrySwaySmoothing,
      ) *
      possessionFeelConfig.carrySwayAmount *
      Phaser.Math.Clamp(speed / 8, 0, 1)
    const forward = carrier.getStickForward()
    const right = carrier.getStickRight()
    const lateral =
      (control + sway) *
      possessionFeelConfig.carrySocketLateralRange
    const forwardOffset =
      (1 - Math.abs(control)) *
        possessionFeelConfig.carrySocketForwardRange *
        0.25
    const offset = clampVector(
      {
        x: forward.x * forwardOffset + right.x * lateral,
        y: forward.y * forwardOffset + right.y * lateral,
      },
      possessionFeelConfig.carrySocketMaxOffset,
    )

    this.desiredCarrySocket = {
      x: baseSocket.x + offset.x,
      y: baseSocket.y + offset.y,
    }

    const lagSeconds = Math.max(
      0.016,
      possessionFeelConfig.carrySocketLag,
    )
    const response =
      possessionFeelConfig.carryControlResponsiveness *
      (0.12 / lagSeconds)
    const blend =
      1 - Math.exp(-response * Math.max(0, deltaMs / 1000))
    const current = this.carrySocket ?? { ...baseSocket }

    this.carrySocket = {
      x: Phaser.Math.Linear(current.x, this.desiredCarrySocket.x, blend),
      y: Phaser.Math.Linear(current.y, this.desiredCarrySocket.y, blend),
    }
    carrier.setCarrySocket(this.carrySocket)
  }

  private advancePendingRelease(deltaMs: number): void {
    const pending = this.pendingRelease

    if (!pending) {
      return
    }

    pending.elapsedMs += deltaMs

    if (pending.elapsedMs < stickConfig.releaseWindupMs) {
      this.setActionState(pending.playerId, 'RELEASE_WINDUP')
      return
    }

    if (
      pending.elapsedMs <
      stickConfig.releaseWindupMs + stickConfig.releaseSwingMs
    ) {
      this.setActionState(pending.playerId, 'RELEASE_SWING')
      return
    }

    this.setActionState(pending.playerId, 'RELEASE_FOLLOW_THROUGH')
  }

  private resolvePendingRelease(
    core: Core,
    players: Player[],
    deltaMs: number,
  ): void {
    const pending = this.pendingRelease

    if (!pending) {
      return
    }

    const carrier = players.find((player) => player.id === pending.playerId)

    if (!carrier) {
      this.clearForReset(core)
      return
    }

    const releaseAtMs = Math.min(
      20,
      Math.max(0, stickConfig.releaseWindupMs),
    )

    if (!pending.released && pending.elapsedMs >= releaseAtMs) {
      this.executePendingRelease(core, carrier, pending)
    } else if (!pending.released) {
      this.updateCarrySocket(carrier, deltaMs)
      core.holdAt(carrier.getCradleSocket())
    }

    const totalDuration =
      stickConfig.releaseWindupMs +
      stickConfig.releaseSwingMs +
      stickConfig.releaseFollowThroughMs

    if (pending.elapsedMs >= totalDuration) {
      this.pendingRelease = null
      this.clearCarryControl()
      this.setActionState(carrier.id, 'RELEASE_COOLDOWN')
    }
  }

  private applyCradleAssist(
    core: Core,
    players: Player[],
    preferredPlayerId: string,
    deltaMs: number,
  ): void {
    if (!this.isLooseCoreState()) {
      return
    }

    const candidate = players
      .map((player) =>
        this.evaluateGather(core, player, preferredPlayerId),
      )
      .filter((evaluation) => evaluation.eligible)
      .sort((a, b) => {
        if (a.player.id === preferredPlayerId) {
          return -1
        }

        if (b.player.id === preferredPlayerId) {
          return 1
        }

        return a.socketDistance - b.socketDistance
      })[0]

    if (!candidate) {
      return
    }

    const socket = candidate.player.getCradleSocket()
    const direction = normalized({
      x: socket.x - core.position.x,
      y: socket.y - core.position.y,
    })
    const distanceRatio = Phaser.Math.Clamp(
      1 - candidate.socketDistance / candidate.radius,
      0.15,
      1,
    )
    const snapBoost =
      candidate.snapEnabled &&
      candidate.socketDistance <= candidate.snapRadius
        ? 1.45
        : 1
    const targetVelocity = {
      x:
        candidate.player.velocity.x +
        direction.x *
          candidate.maxSpeed *
          distanceRatio *
          snapBoost,
      y:
        candidate.player.velocity.y +
        direction.y *
          candidate.maxSpeed *
          distanceRatio *
          snapBoost,
    }
    const blend =
      1 -
      Math.exp(
        -candidate.strength *
          10 *
          snapBoost *
          Math.max(deltaMs / 1000, 0),
      )

    core.setVelocity({
      x: Phaser.Math.Linear(core.velocity.x, targetVelocity.x, blend),
      y: Phaser.Math.Linear(core.velocity.y, targetVelocity.y, blend),
    })
  }

  private evaluateGather(
    core: Core,
    player: Player,
    preferredPlayerId?: string,
  ): GatherEvaluation {
    const mode = this.getGatherMode(player)
    const shieldDenied =
      this.keeperShield.usesShield(player) &&
      !keeperShieldConfig.keeperShieldCanTrap
    const releaseCooldown =
      this.releaseRegrabCooldowns.get(player.id) ?? 0
    const fumbleCooldown =
      this.fumbleRegrabCooldowns.get(player.id) ?? 0
    const regrabCooldownMs = Math.max(
      releaseCooldown,
      fumbleCooldown,
    )
    const cooldownMs = Math.max(
      regrabCooldownMs,
      this.gatherAttemptCooldowns.get(player.id) ?? 0,
    )
    const active = mode === 'active'
    const socketDistance = distance(
      core.position,
      player.getCradleSocket(),
    )
    const closeRangeForgiveness =
      active &&
      player.controllerType === 'human' &&
      player.id === preferredPlayerId &&
      socketDistance <= gatherConfig.humanCloseGatherRadius
    const enabled = active
      ? gatherConfig.activeGatherEnabled
      : mode === 'passive'
        ? gatherConfig.passiveGatherEnabled
        : false
    const quality = Phaser.Math.Clamp(
      player.attributes.ballHandling * 0.5 +
        player.attributes.control * 0.3 +
        player.attributes.reaction * 0.2,
      0,
      1.1,
    )
    const roleBonus =
      player.role === 'support'
        ? 0.05
        : player.role === 'striker' || player.role === 'keeper'
          ? 0.025
          : -0.025
    const styleBonus =
      player.playStyle === 'technical' || player.playStyle === 'creative'
        ? 0.05
        : player.playStyle === 'direct' ||
            player.playStyle === 'disruptive'
          ? -0.025
          : 0
    const attributeScale = Phaser.Math.Clamp(
      Phaser.Math.Linear(0.84, 1.16, quality) +
        roleBonus +
        styleBonus,
      0.72,
      1.28,
    )
    const graceActive = (this.failedGatherGrace.get(player.id) ?? 0) > 0
    const baseRadius = active
      ? gatherConfig.activeGatherRadius
      : gatherConfig.passiveGatherRadius
    const baseStrength = active
      ? gatherConfig.activeGatherStrength
      : gatherConfig.passiveGatherStrength
    const baseMaxSpeed = active
      ? gatherConfig.activeGatherMaxSpeed
      : gatherConfig.passiveGatherMaxSpeed
    const baseFunnelAngle = active
      ? gatherConfig.activeGatherFunnelAngle
      : gatherConfig.passiveGatherFunnelAngle
    const radius =
      baseRadius * attributeScale + (graceActive ? 8 : 0)
    const strength = baseStrength * attributeScale
    const maxSpeed =
      baseMaxSpeed *
      Phaser.Math.Linear(
        0.9,
        1.14,
        Phaser.Math.Clamp(player.attributes.reaction, 0, 1),
      )
    const funnelAngle =
      baseFunnelAngle *
        Phaser.Math.Linear(
          0.9,
          1.12,
          Phaser.Math.Clamp(player.attributes.control, 0, 1),
        ) +
      (graceActive ? 0.12 : 0)
    const relativeSpeed = distance(core.velocity, player.velocity)
    const legalEntrySpeed = getCradleEntrySpeedLimit(player)
    const axis = this.getGatherAxis(player, mode)
    const toCore = normalized({
      x: core.position.x - player.position.x,
      y: core.position.y - player.position.y,
    })
    const funnelAngleError = Math.abs(
      Phaser.Math.Angle.Wrap(
        Math.atan2(toCore.y, toCore.x) -
          Math.atan2(axis.y, axis.x),
      ),
    )
    let denyReason: GatherDenyReason = 'ready'

    if (!enabled) {
      denyReason = mode === 'none' ? 'action state' : 'disabled'
    } else if (shieldDenied) {
      denyReason = 'keeper shield'
    } else if (regrabCooldownMs > 0) {
      denyReason = 'cooldown'
    } else if (socketDistance > radius) {
      denyReason = 'outside radius'
    } else if (
      !closeRangeForgiveness &&
      funnelAngleError > funnelAngle
    ) {
      denyReason = 'outside angle'
    } else if (
      relativeSpeed >
      (closeRangeForgiveness ? legalEntrySpeed : maxSpeed)
    ) {
      denyReason = 'speed too high'
    }

    const evaluation: GatherEvaluation = {
      player,
      mode,
      eligible: denyReason === 'ready',
      closeRangeForgiveness,
      funnelAngleError,
      relativeSpeed,
      cooldownMs,
      denyReason,
      socketDistance,
      radius,
      strength,
      maxSpeed,
      snapRadius:
        gatherConfig.activeGatherSnapRadius * attributeScale,
      snapEnabled:
        active && gatherConfig.activeGatherSnapEnabled,
    }
    this.gatherDebug.set(player.id, {
      mode: evaluation.mode,
      eligible: evaluation.eligible,
      funnelAngleError: evaluation.funnelAngleError,
      relativeSpeed: evaluation.relativeSpeed,
      cooldownMs: evaluation.cooldownMs,
      denyReason: evaluation.denyReason,
    })
    return evaluation
  }

  private getGatherMode(player: Player): GatherMode {
    const state = this.getStickState(player.id)

    if (state === 'CATCH_READY' && gatherConfig.activeGatherEnabled) {
      return 'active'
    }

    if (
      gatherConfig.passiveGatherEnabled &&
      (state === 'IDLE' || state === 'CATCH_READY')
    ) {
      return 'passive'
    }

    return 'none'
  }

  private getGatherAxis(player: Player, mode: GatherMode): Point {
    const aim = player.getReleaseAimForward()
    const bodyAngle = player.getBodyFacingAngle()
    const body = {
      x: Math.cos(bodyAngle),
      y: Math.sin(bodyAngle),
    }
    const speed = magnitude(player.velocity)
    const movement =
      speed > 0.25 ? normalized(player.velocity) : body
    const pocketSide = player.getCradleSideDirection()
    const active = mode === 'active'

    return normalized({
      x:
        aim.x * (active ? 0.5 : 0.2) +
        body.x * (active ? 0.2 : 0.5) +
        movement.x * 0.2 +
        pocketSide.x * 0.1,
      y:
        aim.y * (active ? 0.5 : 0.2) +
        body.y * (active ? 0.2 : 0.5) +
        movement.y * 0.2 +
        pocketSide.y * 0.1,
    })
  }

  private isPlayerInsideGatherRange(core: Core, player: Player): boolean {
    const mode = this.getGatherMode(player)
    const radius =
      mode === 'active'
        ? gatherConfig.activeGatherRadius
        : gatherConfig.passiveGatherRadius

    return (
      mode !== 'none' &&
      distance(core.position, player.getCradleSocket()) <= radius
    )
  }

  private isLooseCoreState(): boolean {
    return (
      !this.carrierId &&
      (this.coreState === 'FREE' ||
        this.coreState === 'FUMBLED' ||
        this.coreState === 'RELEASED_COOLDOWN')
    )
  }

  private tryAcquire(
    core: Core,
    players: Player[],
    preferredPlayerId: string,
  ): void {
    for (const player of players) {
      this.cradleFailures.set(
        player.id,
        this.getStickState(player.id) === 'CATCH_READY'
          ? 'ready'
          : 'not catch-ready',
      )
    }

    if (this.carrierId) {
      for (const player of players) {
        this.cradleFailures.set(player.id, 'already cradled')
      }
      return
    }

    if (!this.isLooseCoreState()) {
      return
    }

    const candidates = players
      .map((player) => {
        const gather = this.evaluateGather(
          core,
          player,
          preferredPlayerId,
        )
        const attemptCooldown =
          this.gatherAttemptCooldowns.get(player.id) ?? 0

        if (!gather.eligible || attemptCooldown > 0) {
          this.cradleFailures.set(
            player.id,
            gather.cooldownMs > 0 || attemptCooldown > 0
              ? 'cooldown active'
              : gather.denyReason === 'speed too high'
                ? 'speed too high'
                : gather.denyReason === 'action state'
                  ? 'not catch-ready'
                  : 'outside gather funnel',
          )
          if (attemptCooldown > 0) {
            this.gatherDebug.set(player.id, {
              ...gather,
              eligible: false,
              cooldownMs: attemptCooldown,
              denyReason: 'cooldown',
            })
          }
          return null
        }

        const test = testLegalCradle(core, player)
        const accepted =
          test.accepted ||
          (gather.closeRangeForgiveness &&
            test.relativeSpeed <= test.maxEntrySpeed)

        this.cradleFailures.set(
          player.id,
          accepted
            ? 'ready'
            : !test.insideZone
              ? 'outside cradle zone'
              : test.relativeSpeed > test.maxEntrySpeed
                ? 'speed too high'
                : 'ready',
        )

        if (
          !accepted &&
          gather.socketDistance <= stickConfig.cradleCaptureRadius
        ) {
          this.gatherAttemptCooldowns.set(
            player.id,
            gatherConfig.gatherAttemptCooldownMs,
          )
          this.failedGatherGrace.set(
            player.id,
            gatherConfig.failedGatherGraceMs,
          )
          this.gatherDebug.set(player.id, {
            ...gather,
            eligible: false,
            cooldownMs: gatherConfig.gatherAttemptCooldownMs,
            denyReason: 'cradle zone',
          })
        }

        return {
          player,
          test,
          accepted,
          gather,
          socketDistance: distance(core.position, player.getCradleSocket()),
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== null
      )
      .filter((candidate) => candidate.accepted)
      .sort((a, b) => {
        if (a.player.id === preferredPlayerId) {
          return -1
        }

        if (b.player.id === preferredPlayerId) {
          return 1
        }

        return a.socketDistance - b.socketDistance
      })

    const selected = candidates[0]

    if (!selected) {
      return
    }

    this.carrierId = selected.player.id
    this.carryPlayer = selected.player
    this.coreState = 'CRADLED_STABLE'
    this.cradleElapsedMs = 0
    this.lastReleaseImpulseDirection = null
    this.lastInteraction = 'cradle'
    this.interactionEvent = {
      result: 'cradle',
      playerId: selected.player.id,
    }
    this.setActionState(selected.player.id, 'CRADLED_STABLE')
    this.cradleFailures.set(selected.player.id, 'already cradled')
    this.gatherDebug.set(selected.player.id, {
      ...selected.gather,
      eligible: true,
      denyReason: 'acquired',
    })
    core.setSensor(true)
    core.setVelocity({ x: 0, y: 0 })
    const baseSocket = selected.player.getBaseCradleSocket()
    const snappedSocket = baseSocket

    this.carrySocket = { ...snappedSocket }
    this.desiredCarrySocket = { ...baseSocket }
    selected.player.setCarrySocket(snappedSocket)
    core.holdAt(snappedSocket)

    if (selected.gather.snapEnabled) {
      this.gatherRipple = {
        position: { ...snappedSocket },
        msRemaining: 220,
      }
    }
  }

  private processContacts(core: Core, players: Player[]): void {
    const shieldPlayers = players.filter(
      (player) =>
        this.keeperShield.usesShield(player) &&
        (this.contactCooldowns.get(player.id) ?? 0) === 0,
    )

    for (const player of shieldPlayers) {
      const active =
        this.getStickState(player.id) === 'SWINGING' ||
        player.getDefenseVisualState() === 'SLASH_ACTIVE'

      if (!this.keeperShield.tryDeflect(core, player, active)) {
        continue
      }

      this.contactCooldowns.set(
        player.id,
        keeperShieldConfig.contactCooldownMs,
      )
      this.lastInteraction = active ? 'active swing' : 'passive nudge'
      this.interactionEvent = {
        result: this.lastInteraction,
        playerId: player.id,
      }
      return
    }

    const contacts = players
      .filter(
        (player) =>
          !this.keeperShield.usesShield(player) &&
          (this.contactCooldowns.get(player.id) ?? 0) === 0,
      )
      .map((player) => ({
        player,
        hit: testDeflectZone(core, player),
        state: this.getStickState(player.id),
      }))
      .filter(
        (
          contact,
        ): contact is {
          player: Player
          hit: DeflectHit
          state: StickActionState
        } => contact.hit !== null,
      )
      .sort((a, b) => {
        const actionPriority =
          Number(b.state === 'SWINGING') - Number(a.state === 'SWINGING')

        return actionPriority || a.hit.distance - b.hit.distance
      })

    const contact = contacts[0]

    if (!contact) {
      return
    }

    const active = contact.state === 'SWINGING'
    this.applyControlledContact(core, contact.player, contact.hit, active)
    this.contactCooldowns.set(
      contact.player.id,
      stickConfig.contactImpulseCooldownMs,
    )
    this.lastInteraction = active ? 'active swing' : 'passive nudge'
    this.interactionEvent = {
      result: this.lastInteraction,
      playerId: contact.player.id,
    }

    if (contact.state === 'CATCH_READY') {
      this.cradleFailures.set(contact.player.id, 'deflect fallback')
    }
  }

  private syncCradleState(carrierId: string): void {
    if (this.cradleElapsedMs >= stickConfig.overchargeMs) {
      this.coreState = 'CRADLED_OVERCHARGED'
      this.setActionState(carrierId, 'CRADLED_OVERCHARGED')
      return
    }

    if (this.cradleElapsedMs >= stickConfig.stableCradleMs) {
      this.coreState = 'CRADLED_CHARGING'
      this.setActionState(carrierId, 'CRADLED_CHARGING')
      return
    }

    this.coreState = 'CRADLED_STABLE'
    this.setActionState(carrierId, 'CRADLED_STABLE')
  }

  private beginReleaseAlongAim(carrier: Player): void {
    this.beginRelease(carrier, carrier.getReleaseAimForward())
  }

  private beginReleaseToward(carrier: Player, target: Point): void {
    const direction = normalized({
      x: target.x - carrier.position.x,
      y: target.y - carrier.position.y,
    })
    this.beginRelease(carrier, direction)
  }

  private beginRelease(carrier: Player, direction: Point): void {
    const intendedDirection = normalized(direction)
    const releaseAimDirection =
      carrier.role === 'keeper'
        ? this.keeperClearSafety.sanitize(
            intendedDirection,
            carrier.teamSide,
            carrier.position,
          ).direction
        : intendedDirection
    let releaseImpulseDirection =
      possessionFeelConfig.visualStickControlsImpulse
        ? carrier.getStickForward()
        : releaseAimDirection
    const swingSign = carrier.getPocketFacingSign()

    if (possessionFeelConfig.loadbackAffectsAim) {
      releaseImpulseDirection = rotate(
        releaseImpulseDirection,
        -this.getLoadbackAngle(carrier.id) * swingSign,
      )
    }

    releaseImpulseDirection = normalized(releaseImpulseDirection)
    const aimAngle = Math.atan2(
      releaseAimDirection.y,
      releaseAimDirection.x,
    )
    const arc = stickConfig.releaseSwingArcRadians
    const powerTiming = Phaser.Math.Clamp(
      stickConfig.releasePointNormalized,
      0,
      1,
    )

    this.pendingRelease = {
      playerId: carrier.id,
      elapsedMs: 0,
      releaseAimDirection,
      releaseImpulseDirection,
      startRotation: carrier.getStickVisualRotation(),
      windupRotation: aimAngle - swingSign * arc * powerTiming,
      endRotation: aimAngle + swingSign * arc * (1 - powerTiming),
      followRotation:
        aimAngle + swingSign * arc * (1 - powerTiming + 0.28),
      swingSign,
      chargeElapsedMs: this.cradleElapsedMs,
      hardCharge: this.hardChargeActive,
      released: false,
    }
    this.releaseForcePreview = magnitude(
      this.calculateReleaseVelocity(
        releaseImpulseDirection,
        carrier,
        this.cradleElapsedMs,
        this.hardChargeActive,
      ),
    )
    this.setActionState(carrier.id, 'RELEASE_WINDUP')
  }

  private executePendingRelease(
    core: Core,
    carrier: Player,
    pending: PendingRelease,
  ): void {
    const releasePoint = carrier.getCradleSocket()
    const velocity = this.calculateReleaseVelocity(
      pending.releaseImpulseDirection,
      carrier,
      pending.chargeElapsedMs,
      pending.hardCharge,
    )
    const chargeNormalized = Phaser.Math.Clamp(
      pending.chargeElapsedMs / stickConfig.overchargeMs,
      0,
      1,
    )

    core.setSensor(false)
    core.setPosition(releasePoint)
    core.setVelocity(velocity)
    core.setAngularVelocity(
      pending.swingSign *
        magnitude(velocity) *
        stickConfig.releaseSpinInfluence *
        0.08 *
        chargeNormalized,
    )
    core.setReleaseVisualCharge(
      chargeNormalized,
      pending.chargeElapsedMs >= stickConfig.chargeCradleMs,
    )
    pending.released = true
    this.lastReleaseImpulseDirection = {
      ...pending.releaseImpulseDirection,
    }
    this.coreState = 'RELEASED_COOLDOWN'
    this.carrierId = null
    this.cradleElapsedMs = 0
    this.releaseCooldownMsRemaining = Math.min(
      120,
      gatherConfig.releaseRegrabCooldownMs,
    )
    this.releaseRegrabCooldowns.set(
      carrier.id,
      gatherConfig.releaseRegrabCooldownMs,
    )
    this.lastInteraction = 'release'
    this.interactionEvent = {
      result: 'release',
      playerId: carrier.id,
    }
    this.releaseForcePreview = magnitude(velocity)
    this.releaseVector = {
      start: { ...releasePoint },
      end: {
        x: releasePoint.x + velocity.x * stickConfig.releaseVectorScale,
        y: releasePoint.y + velocity.y * stickConfig.releaseVectorScale,
      },
      msRemaining: stickConfig.releaseVectorVisibleMs,
    }
  }

  private fumble(
    core: Core,
    carrier: Player,
    contactDirection?: Point,
    speed: number = stickConfig.fumbleSpeed,
    cradleSideBias: number = 0.35,
  ): void {
    const aim = carrier.getStickForward()
    const right = carrier.getCradleSideDirection()
    const direction = contactDirection
      ? normalized({
          x: contactDirection.x + right.x * cradleSideBias,
          y: contactDirection.y + right.y * cradleSideBias,
        })
      : normalized({
          x: aim.x + right.x * 0.55,
          y: aim.y + right.y * 0.55,
        })

    this.finishPossession(
      core,
      carrier,
      {
        x: direction.x * speed,
        y: direction.y * speed,
      },
      'FUMBLED',
    )
  }

  private finishPossession(
    core: Core,
    carrier: Player,
    velocity: Point,
    nextState: 'FUMBLED' | 'RELEASED_COOLDOWN',
  ): void {
    const releasePoint = carrier.getCradleSocket()

    this.pendingRelease = null
    this.releaseGraphics.clear()
    core.setSensor(false)
    core.setPosition(releasePoint)
    core.setVelocity(velocity)
    if (nextState === 'FUMBLED') {
      core.setReleaseVisualCharge(0.35, true)
    }
    this.coreState = nextState
    this.carrierId = null
    this.cradleElapsedMs = 0
    const regrabCooldownMs =
      nextState === 'FUMBLED'
        ? gatherConfig.fumbleRegrabCooldownMs
        : gatherConfig.releaseRegrabCooldownMs
    this.releaseCooldownMsRemaining = Math.min(120, regrabCooldownMs)
    const cooldowns =
      nextState === 'FUMBLED'
        ? this.fumbleRegrabCooldowns
        : this.releaseRegrabCooldowns
    cooldowns.set(carrier.id, regrabCooldownMs)
    this.lastInteraction = nextState === 'FUMBLED' ? 'fumble' : 'release'
    this.interactionEvent = {
      result: this.lastInteraction,
      playerId: carrier.id,
    }
    this.clearCarryControl()
    this.setActionState(
      carrier.id,
      nextState === 'FUMBLED' ? 'FUMBLED_COOLDOWN' : 'RELEASE_RECOVERY',
    )
    this.releaseVector = {
      start: { ...releasePoint },
      end: {
        x: releasePoint.x + velocity.x * stickConfig.releaseVectorScale,
        y: releasePoint.y + velocity.y * stickConfig.releaseVectorScale,
      },
      msRemaining: stickConfig.releaseVectorVisibleMs,
    }
  }

  private calculateReleaseVelocity(
    direction: Point,
    carrier: Player,
    chargeElapsedMs = this.cradleElapsedMs,
    hardCharge = this.hardChargeActive,
  ): Point {
    const chargeNormalized = Phaser.Math.Clamp(
      chargeElapsedMs / stickConfig.overchargeMs,
      0,
      1,
    )
    const curvedCharge = Math.pow(
      chargeNormalized,
      stickConfig.chargeForceExponent,
    )
    const baseForce = Phaser.Math.Linear(
      stickConfig.releaseForceMin,
      stickConfig.releaseForceMax *
        (possessionFeelConfig.hardChargeEnabled &&
        hardCharge
          ? possessionFeelConfig.hardChargeMultiplier
          : 1),
      curvedCharge,
    )
    const overchargeProgress = Phaser.Math.Clamp(
      (chargeElapsedMs - stickConfig.overchargeMs) /
        Math.max(1, stickConfig.fumbleMs - stickConfig.overchargeMs),
      0,
      1,
    )
    const instabilityWave = Math.sin(chargeElapsedMs * 0.021)
    const handlingInstability = Phaser.Math.Linear(
      1.25,
      0.75,
      Phaser.Math.Clamp(carrier.attributes.ballHandling, 0, 1),
    )
    const releaseDirection = normalized(direction)
    const playerForwardSpeed =
      carrier.velocity.x * releaseDirection.x +
      carrier.velocity.y * releaseDirection.y
    const forceShape =
      stickConfig.releaseForwardForceMultiplier +
      stickConfig.releaseTangentialForceMultiplier * 0.25
    const powerMultiplier = Phaser.Math.Linear(
      0.9,
      1.14,
      Phaser.Math.Clamp(carrier.attributes.power, 0, 1.2),
    )
    const instabilityForce =
      instabilityWave *
      stickConfig.overchargeInstability *
      stickConfig.overchargeAccuracyPenalty *
      handlingInstability *
      overchargeProgress *
      baseForce
    const maximumForce =
      stickConfig.releaseForceMax *
      powerMultiplier *
      (possessionFeelConfig.hardChargeEnabled && hardCharge
        ? possessionFeelConfig.hardChargeMultiplier
        : 1)
    const finalForce = Phaser.Math.Clamp(
      baseForce * forceShape * powerMultiplier +
        playerForwardSpeed *
          stickConfig.playerVelocityReleaseInfluence +
        instabilityForce,
      stickConfig.releaseForceMin,
      maximumForce,
    )

    return {
      x: releaseDirection.x * finalForce,
      y: releaseDirection.y * finalForce,
    }
  }

  private applyControlledContact(
    core: Core,
    player: Player,
    hit: DeflectHit,
    active: boolean,
  ): void {
    const state = this.getStickState(player.id)
    const force = active
      ? stickConfig.activeSwingForce
      : stickConfig.passiveNudgeForce *
        (state === 'CATCH_READY'
          ? stickConfig.catchReadyDeflectMultiplier *
            possessionFeelConfig.gatherDeflectSuppression
          : 1)
    let direction = active
      ? normalized({
          x: player.getStickForward().x * 0.82 + hit.normal.x * 0.42,
          y: player.getStickForward().y * 0.82 + hit.normal.y * 0.42,
        })
      : hit.normal
    const defensiveSafetyActive =
      player.role === 'keeper' ||
      (clearSafetyConfig.defensiveDeflectionSafetyEnabled &&
        isNearOwnGoal(core.position, player.teamSide))

    if (defensiveSafetyActive) {
      const clearAssistBonus = getClearAssistBonus(player)
      direction = this.keeperClearSafety.sanitize(
        direction,
        player.teamSide,
        core.position,
        {
          awayBias:
            player.role === 'keeper'
              ? clearSafetyConfig.keeperShieldAwayBias +
                clearAssistBonus
              : Math.max(
                  clearSafetyConfig.defenderStickAwayBias,
                  clearSafetyConfig.defensiveDeflectionAwayBias,
                ) + clearAssistBonus,
          reason: 'nearGoalDeflection',
        },
      ).direction
    }
    const impulse = clampVector(
      {
        x: direction.x * force + (active ? player.velocity.x * 0.2 : 0),
        y: direction.y * force + (active ? player.velocity.y * 0.2 : 0),
      },
      stickConfig.maxDeflectImpulse,
    )
    const nextVelocity = {
      x: core.velocity.x + impulse.x,
      y: core.velocity.y + impulse.y,
    }

    if (defensiveSafetyActive) {
      const clearAssistBonus = getClearAssistBonus(player)
      const speed = magnitude(nextVelocity)
      const safe = this.keeperClearSafety.sanitize(
        nextVelocity,
        player.teamSide,
        core.position,
        {
          awayBias:
            player.role === 'keeper'
              ? clearSafetyConfig.keeperShieldAwayBias +
                clearAssistBonus
              : Math.max(
                  clearSafetyConfig.defenderStickAwayBias,
                  clearSafetyConfig.defensiveDeflectionAwayBias,
                ) + clearAssistBonus,
          reason: 'nearGoalDeflection',
        },
      )
      core.setVelocity({
        x: safe.direction.x * speed,
        y: safe.direction.y * speed,
      })
      return
    }

    core.setVelocity(nextVelocity)
  }

  private setActionState(playerId: string, state: StickActionState): void {
    const runtime = this.actionRuntimes.get(playerId)

    if (!runtime || runtime.state === state) {
      return
    }

    runtime.state = state
    runtime.elapsedMs = 0
  }

  private clearCarryControl(): void {
    this.carryPlayer?.setCarrySocket(null)
    this.carryPlayer?.setChargeVisual(0, false, false)
    this.carryPlayer = null
    this.carrySocket = null
    this.desiredCarrySocket = null
    this.hardChargeActive = false
    this.currentChargeIntensity = 0
  }

  private isCradled(): boolean {
    return (
      this.coreState === 'CRADLED_STABLE' ||
      this.coreState === 'CRADLED_CHARGING' ||
      this.coreState === 'CRADLED_OVERCHARGED'
    )
  }

  private getPendingReleaseRotation(pending: PendingRelease): number {
    const windupEnd = stickConfig.releaseWindupMs
    const swingEnd = windupEnd + stickConfig.releaseSwingMs

    if (pending.elapsedMs < windupEnd) {
      const progress = smoothStep(
        Phaser.Math.Clamp(
          pending.elapsedMs / Math.max(1, stickConfig.releaseWindupMs),
          0,
          1,
        ),
      )

      return interpolateAngle(
        pending.startRotation,
        pending.windupRotation,
        progress,
      )
    }

    if (pending.elapsedMs < swingEnd) {
      const progress = smoothStep(
        Phaser.Math.Clamp(
          (pending.elapsedMs - windupEnd) /
            Math.max(1, stickConfig.releaseSwingMs),
          0,
          1,
        ),
      )

      return interpolateAngle(
        pending.windupRotation,
        pending.endRotation,
        progress,
      )
    }

    const progress = smoothStep(
      Phaser.Math.Clamp(
        (pending.elapsedMs - swingEnd) /
          Math.max(1, stickConfig.releaseFollowThroughMs),
        0,
        1,
      ),
    )

    return interpolateAngle(
      pending.endRotation,
      pending.followRotation,
      progress,
    )
  }

  private drawReleaseSwing(players: Player[]): void {
    this.releaseGraphics.clear()

    if (this.gatherRipple) {
      const progress = 1 - this.gatherRipple.msRemaining / 220
      this.releaseGraphics.lineStyle(
        4,
        possessionFeelConfig.chargeCoreColorStable,
        0.75 * (1 - progress),
      )
      this.releaseGraphics.strokeCircle(
        this.gatherRipple.position.x,
        this.gatherRipple.position.y,
        10 + progress * 24,
      )
    }

    const pending = this.pendingRelease

    if (!pending) {
      return
    }

    const player = players.find((candidate) => candidate.id === pending.playerId)

    if (!player) {
      return
    }

    const windupEnd = stickConfig.releaseWindupMs
    const swingEnd = windupEnd + stickConfig.releaseSwingMs
    const swingProgress = Phaser.Math.Clamp(
      (pending.elapsedMs - windupEnd) / Math.max(1, stickConfig.releaseSwingMs),
      0,
      1,
    )
    const followProgress = Phaser.Math.Clamp(
      (pending.elapsedMs - swingEnd) /
        Math.max(1, stickConfig.releaseFollowThroughMs),
      0,
      1,
    )
    const visibleProgress =
      pending.elapsedMs < windupEnd ? 0.08 : Math.max(0.12, swingProgress)
    const alpha =
      pending.elapsedMs < windupEnd
        ? 0.18
        : Phaser.Math.Linear(0.72, 0.08, followProgress)
    const radius = stickConfig.visual.length * 0.92
    const endAngle = interpolateAngle(
      pending.windupRotation,
      pending.endRotation,
      visibleProgress,
    )
    const segments = 18

    this.releaseGraphics.lineStyle(
      Math.max(4, stickConfig.visual.width * 0.62),
      stickConfig.feedbackColors.swinging,
      alpha * 0.24,
    )
    this.releaseGraphics.beginPath()

    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments
      const angle = interpolateAngle(
        pending.windupRotation,
        endAngle,
        progress,
      )
      const point = radialPoint(player.position, angle, radius)

      if (index === 0) {
        this.releaseGraphics.moveTo(point.x, point.y)
      } else {
        this.releaseGraphics.lineTo(point.x, point.y)
      }
    }

    this.releaseGraphics.strokePath()
    const tip = radialPoint(
      player.position,
      player.getStickVisualRotation(),
      radius,
    )
    this.releaseGraphics.fillStyle(
      stickConfig.feedbackColors.swinging,
      alpha,
    )
    this.releaseGraphics.fillCircle(tip.x, tip.y, 5)
  }

  private drawDebug(core: Core, players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    const focus = players.find((player) => player.id === this.debugFocusPlayerId)

    this.debugGraphics.clear()

    if (focus) {
      if (this.keeperShield.usesShield(focus)) {
        this.drawKeeperShieldDebug(focus)
      } else {
        this.drawDeflectZone(focus)
        this.drawCradleZone(focus.getCradleZone())
      }
      const mountPoint = focus.getVisualStickMountPoint()
      const socket = focus.getCradleSocket()
      if (stickConfig.debug.showStickLocalFrame) {
        const forward = focus.getStickForward()
        const right = focus.getStickRight()
        this.drawLocalFrame(
          focus.position,
          forward,
          right,
        )
      }
      if (stickConfig.debug.showLeftRightHandednessAxes) {
        this.debugGraphics.fillStyle(stickConfig.debug.anchorColor, 0.98)
        this.debugGraphics.fillCircle(mountPoint.x, mountPoint.y, 5)
        this.debugGraphics.lineStyle(
          2,
          stickConfig.debug.localSideColor,
          0.78,
        )
        this.debugGraphics.lineBetween(
          focus.position.x,
          focus.position.y,
          mountPoint.x,
          mountPoint.y,
        )
      }
      this.debugGraphics.fillStyle(stickConfig.debug.socketColor, 0.95)
      this.debugGraphics.fillCircle(
        socket.x,
        socket.y,
        stickConfig.debug.socketRadius,
      )
      this.debugGraphics.lineStyle(2, stickConfig.debug.assistRadiusColor, 0.85)
      this.debugGraphics.strokeCircle(
        socket.x,
        socket.y,
        gatherConfig.activeGatherRadius,
      )
      this.debugGraphics.lineStyle(2, stickConfig.debug.cradleOpenColor, 0.58)
      this.debugGraphics.strokeCircle(
        socket.x,
        socket.y,
        gatherConfig.passiveGatherRadius,
      )
      const gatherState = this.getGatherDebugState(focus.id)
      const gatherMode =
        gatherState.mode === 'none' ? 'passive' : gatherState.mode
      const gatherAxis = this.getGatherAxis(focus, gatherMode)
      const gatherAxisAngle = Math.atan2(gatherAxis.y, gatherAxis.x)
      const gatherAngle =
        gatherMode === 'active'
          ? gatherConfig.activeGatherFunnelAngle
          : gatherConfig.passiveGatherFunnelAngle
      const gatherRadius =
        gatherMode === 'active'
          ? gatherConfig.activeGatherRadius
          : gatherConfig.passiveGatherRadius
      this.debugGraphics.lineStyle(
        2,
        gatherState.eligible
          ? stickConfig.debug.cradleOpenColor
          : stickConfig.debug.assistRadiusColor,
        0.8,
      )
      for (const sign of [-1, 1]) {
        const edge = radialPoint(
          focus.position,
          gatherAxisAngle + gatherAngle * sign,
          gatherRadius,
        )
        this.debugGraphics.lineBetween(
          focus.position.x,
          focus.position.y,
          edge.x,
          edge.y,
        )
      }
      if (this.desiredCarrySocket && focus.id === this.carrierId) {
        this.debugGraphics.lineStyle(
          3,
          stickConfig.debug.cradleOpenColor,
          0.9,
        )
        this.debugGraphics.strokeCircle(
          this.desiredCarrySocket.x,
          this.desiredCarrySocket.y,
          6,
        )
        this.debugGraphics.lineBetween(
          socket.x,
          socket.y,
          this.desiredCarrySocket.x,
          this.desiredCarrySocket.y,
        )
      }
      this.drawDirectionVector(
        focus.position,
        this.getPendingReleaseAimDirection() ??
          focus.getReleaseAimForward(),
        stickConfig.debug.releaseAimColor,
      )
      this.drawDirectionVector(
        focus.position,
        focus.getStickForward(),
        stickConfig.debug.visualStickColor,
      )
      const releaseImpulseDirection = this.getReleaseImpulseDirection()

      if (releaseImpulseDirection) {
        this.drawDirectionVector(
          focus.position,
          releaseImpulseDirection,
          stickConfig.debug.releaseImpulseColor,
        )
      }
      const cradleOpenAngle =
        this.cradleOpenDirections.get(focus.id) ??
        focus.getStickVisualRotation() -
          stickConfig.cradleFacingOffsetRadians *
            focus.getPocketFacingSign()
      this.drawDirectionVector(
        focus.position,
        {
          x: Math.cos(cradleOpenAngle),
          y: Math.sin(cradleOpenAngle),
        },
        stickConfig.debug.cradleOpenColor,
      )
    }

    if (this.releaseVector) {
      this.debugGraphics.lineStyle(4, stickConfig.debug.releaseVectorColor, 0.95)
      this.debugGraphics.lineBetween(
        this.releaseVector.start.x,
        this.releaseVector.start.y,
        this.releaseVector.end.x,
        this.releaseVector.end.y,
      )
    }

    this.debugText.setVisible(true)
    this.debugText.setText(
        `STICK ${focus ? this.getStickState(focus.id) : 'IDLE'}\n` +
        `EQUIPMENT ${
          focus && this.keeperShield.usesShield(focus)
            ? 'KEEPER SHIELD'
            : 'CESTA-BAT'
        }\n` +
        `STANCE ${
          focus && focus.isRunningStickStanceActive()
            ? 'RUNNING RESET'
            : 'ACTION / HELD'
        }\n` +
        `CORE ${this.coreState}\n` +
        `PHASE ${this.getCradlePhase()}\n` +
        `RELEASE ${this.getPendingReleasePhase()}\n` +
        `CHARGE ${Math.round(this.cradleElapsedMs)}ms / ${this
          .getChargeNormalized()
          .toFixed(2)}\n` +
        `HARD ${this.hardChargeActive ? 'ACTIVE' : 'INACTIVE'} / ${this.currentChargeIntensity.toFixed(2)}\n` +
        `FORCE ${this.releaseForcePreview.toFixed(2)}\n` +
        `POSSESSION ${this.carrierId ?? 'LOOSE'}\n` +
        `HAND ${focus ? focus.handedness.toUpperCase() : 'n/a'}\n` +
        `MOUNT ${
          focus
            ? signedNumber(focus.getHandednessMountSign())
            : 'n/a'
        }\n` +
        `POCKET ${
          focus
            ? signedNumber(focus.getPocketFacingSign())
            : 'n/a'
        }\n` +
        `MIRROR ${
          focus
            ? signedNumber(focus.getVisualMirrorSign())
            : 'n/a'
        }\n` +
        `SOCKET ${
          focus
            ? signedNumber(focus.getCradleSocketSign())
            : 'n/a'
        }\n` +
        `VISUAL ${focus ? focus.getStickVisualRotation().toFixed(2) : 'n/a'}\n` +
        `RELEASE AIM ${focus ? focus.getReleaseAimAngle().toFixed(2) : 'n/a'}\n` +
        `IMPULSE ${formatPoint(this.getReleaseImpulseDirection())}\n` +
        `CARRY POSE ${
          focus ? this.getCarryPoseAngle(focus.id).toFixed(2) : 'n/a'
        }\n` +
        `LOADBACK ${
          focus ? this.getLoadbackAngle(focus.id).toFixed(2) : 'n/a'
        }\n` +
        `CARRY SOCKET ${formatPoint(this.carrySocket)}\n` +
        `DESIRED SOCKET ${formatPoint(this.desiredCarrySocket)}\n` +
        `READY ${
          focus
            ? signedNumber(
                stickConfig.readyStanceOffsetRadians *
                  focus.getPocketFacingSign(),
              )
            : 'n/a'
        }\n` +
        `CRADLE ${
          focus
            ? signedNumber(
                stickConfig.cradleFacingOffsetRadians *
                  focus.getPocketFacingSign(),
              )
            : 'n/a'
        }\n` +
        `AUTO ORIENT ${
          focus && this.isCatchAutoOrientActive(focus.id) ? 'ACTIVE' : 'INACTIVE'
        }\n` +
        `GATHER ${
          focus
            ? `${this.getGatherDebugState(focus.id).mode.toUpperCase()} / ${
                this.getGatherDebugState(focus.id).eligible
                  ? 'ELIGIBLE'
                  : this.getGatherDebugState(focus.id).denyReason
              }`
            : 'n/a'
        }\n` +
        `G ANGLE ${
          focus
            ? this.getGatherDebugState(focus.id).funnelAngleError.toFixed(2)
            : 'n/a'
        }\n` +
        `G SPEED ${
          focus
            ? this.getGatherDebugState(focus.id).relativeSpeed.toFixed(2)
            : 'n/a'
        }\n` +
        `G COOLDOWN ${
          focus
            ? Math.ceil(this.getGatherDebugState(focus.id).cooldownMs)
            : 0
        }ms\n` +
        `CATCH ${focus ? this.getCradleFailureReason(focus.id) : 'n/a'}\n` +
        `CONTACT ${this.lastInteraction}\n` +
        `SPEED ${Math.hypot(core.velocity.x, core.velocity.y).toFixed(2)}`,
    )
  }

  private drawKeeperShieldDebug(player: Player): void {
    const state = this.keeperShield.getDebugState(player.teamSide)
    const forward = player.getStickForward()
    const right = player.getStickRight()
    const side =
      keeperShieldConfig.keeperShieldSideOffset *
      player.getHandednessMountSign()
    const center = state?.center ?? {
      x:
        player.position.x +
        forward.x * keeperShieldConfig.keeperShieldForwardOffset +
        right.x * side,
      y:
        player.position.y +
        forward.y * keeperShieldConfig.keeperShieldForwardOffset +
        right.y * side,
    }

    this.debugGraphics.lineStyle(
      keeperShieldConfig.keeperShieldDepth,
      state?.contacted
        ? keeperShieldConfig.debug.contactColor
        : keeperShieldConfig.debug.faceColor,
      0.24,
    )
    this.debugGraphics.lineBetween(
      center.x - right.x * keeperShieldConfig.keeperShieldWidth / 2,
      center.y - right.y * keeperShieldConfig.keeperShieldWidth / 2,
      center.x + right.x * keeperShieldConfig.keeperShieldWidth / 2,
      center.y + right.y * keeperShieldConfig.keeperShieldWidth / 2,
    )
    this.drawDirectionVector(
      center,
      state?.normal ?? forward,
      keeperShieldConfig.debug.faceColor,
    )

    if (state) {
      this.drawDirectionVector(
        center,
        state.clearDirection,
        keeperShieldConfig.debug.safeClearColor,
      )
    }
  }

  private getPendingReleasePhase(): string {
    const pending = this.pendingRelease

    if (!pending) {
      return 'NONE'
    }

    if (pending.elapsedMs < stickConfig.releaseWindupMs) {
      return 'WINDUP'
    }

    if (
      pending.elapsedMs <
      stickConfig.releaseWindupMs + stickConfig.releaseSwingMs
    ) {
      return pending.released ? 'SWING / RELEASED' : 'SWING'
    }

    return 'FOLLOW THROUGH'
  }

  private drawCradleZone(zone: CradleZone): void {
    const startAngle = zone.aimAngle + zone.minAngle
    const endAngle = zone.aimAngle + zone.maxAngle

    this.debugGraphics.fillStyle(
      stickConfig.debug.zoneFillColor,
      stickConfig.debug.zoneFillAlpha,
    )
    this.debugGraphics.lineStyle(
      2,
      stickConfig.debug.zoneStrokeColor,
      stickConfig.debug.zoneStrokeAlpha,
    )
    this.debugGraphics.beginPath()

    for (let index = 0; index <= stickConfig.debug.debugSegments; index += 1) {
      const t = index / stickConfig.debug.debugSegments
      const point = radialPoint(
        zone.center,
        Phaser.Math.Linear(startAngle, endAngle, t),
        zone.maxRadius,
      )

      if (index === 0) {
        this.debugGraphics.moveTo(point.x, point.y)
      } else {
        this.debugGraphics.lineTo(point.x, point.y)
      }
    }

    for (let index = stickConfig.debug.debugSegments; index >= 0; index -= 1) {
      const t = index / stickConfig.debug.debugSegments
      const point = radialPoint(
        zone.center,
        Phaser.Math.Linear(startAngle, endAngle, t),
        zone.minRadius,
      )
      this.debugGraphics.lineTo(point.x, point.y)
    }

    this.debugGraphics.closePath()
    this.debugGraphics.fillPath()
    this.debugGraphics.strokePath()
  }

  private drawDeflectZone(player: Player): void {
    const points = player.getStickSamplePoints()

    if (points.length < 2) {
      return
    }

    this.debugGraphics.lineStyle(
      stickConfig.deflectRadius * 2,
      stickConfig.debug.deflectZoneColor,
      stickConfig.debug.deflectZoneAlpha,
    )
    this.debugGraphics.beginPath()
    this.debugGraphics.moveTo(points[0].x, points[0].y)

    for (let index = 1; index < points.length; index += 1) {
      this.debugGraphics.lineTo(points[index].x, points[index].y)
    }

    this.debugGraphics.strokePath()
  }

  private drawDirectionVector(
    start: Point,
    direction: Point,
    color: number,
  ): void {
    this.debugGraphics.lineStyle(3, color, 0.95)
    this.debugGraphics.lineBetween(
      start.x,
      start.y,
      start.x + direction.x * stickConfig.debug.directionVectorLength,
      start.y + direction.y * stickConfig.debug.directionVectorLength,
    )
  }

  private drawLocalFrame(
    origin: Point,
    forward: Point,
    handedSide: Point,
  ): void {
    const length = 54

    this.debugGraphics.lineStyle(
      3,
      stickConfig.debug.localForwardColor,
      0.92,
    )
    this.debugGraphics.lineBetween(
      origin.x,
      origin.y,
      origin.x + forward.x * length,
      origin.y + forward.y * length,
    )
    this.debugGraphics.lineStyle(
      3,
      stickConfig.debug.localSideColor,
      0.92,
    )
    this.debugGraphics.lineBetween(
      origin.x,
      origin.y,
      origin.x + handedSide.x * length,
      origin.y + handedSide.y * length,
    )
  }
}

function testLegalCradle(core: Core, player: Player): CradleTestResult {
  const localPoint = player.worldToStickLocal(core.position)
  const radius = Math.hypot(localPoint.x, localPoint.y)
  const angle = Math.atan2(localPoint.y, localPoint.x)
  const relativeSpeed = distance(core.velocity, player.velocity)
  const socketDistance = distance(core.position, player.getCradleSocket())
  const zone = player.getCradleZone()
  const insideZone =
    localPoint.y * player.getPocketFacingSign() > 0 &&
    radius >= zone.minRadius &&
    radius <= zone.maxRadius &&
    angle >= zone.minAngle &&
    angle <= zone.maxAngle &&
    socketDistance <= stickConfig.cradleCaptureRadius

  const maxEntrySpeed = getCradleEntrySpeedLimit(player)

  return {
    accepted: insideZone && relativeSpeed <= maxEntrySpeed,
    relativeSpeed,
    insideZone,
    maxEntrySpeed,
  }
}

function getCradleEntrySpeedLimit(player: Player): number {
  return (
    stickConfig.maxCradleEntrySpeed *
    Phaser.Math.Linear(
      0.94,
      1.08,
      Phaser.Math.Clamp(player.attributes.ballHandling, 0, 1),
    )
  )
}

function testDeflectZone(core: Core, player: Player): DeflectHit | null {
  const closest = findClosestPointOnPolyline(core.position, player.getStickSamplePoints())

  if (!closest || closest.distance > stickConfig.deflectRadius) {
    return null
  }

  const localPoint = player.worldToStickLocal(core.position)
  const delta = {
    x: core.position.x - closest.point.x,
    y: core.position.y - closest.point.y,
  }
  const length = Math.hypot(delta.x, delta.y)
  const right = player.getStickRight()
  const normal =
    length === 0
      ? {
          x: right.x * (localPoint.y >= 0 ? 1 : -1),
          y: right.y * (localPoint.y >= 0 ? 1 : -1),
        }
      : {
          x: delta.x / length,
          y: delta.y / length,
        }

  return {
    closestPoint: closest.point,
    normal,
    distance: closest.distance,
  }
}

function findClosestPointOnPolyline(
  point: Point,
  polyline: Point[],
): { point: Point; distance: number } | null {
  let closest: { point: Point; distance: number } | null = null

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const candidate = closestPointOnSegment(point, polyline[index], polyline[index + 1])

    if (!closest || candidate.distance < closest.distance) {
      closest = candidate
    }
  }

  return closest
}

function closestPointOnSegment(
  point: Point,
  start: Point,
  end: Point,
): { point: Point; distance: number } {
  const segment = {
    x: end.x - start.x,
    y: end.y - start.y,
  }
  const lengthSq = segment.x * segment.x + segment.y * segment.y
  const t =
    lengthSq === 0
      ? 0
      : Phaser.Math.Clamp(
          ((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) /
            lengthSq,
          0,
          1,
        )
  const closest = {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  }

  return {
    point: closest,
    distance: distance(point, closest),
  }
}

function radialPoint(center: Point, angle: number, radius: number): Point {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  }
}

function normalized(vector: Point): Point {
  return normalizeSafe(vector, { x: 0, y: 0 })
}

function clampVector(vector: Point, maximumLength: number): Point {
  return clampVectorMagnitude(vector, maximumLength)
}

function rotate(vector: Point, angle: number): Point {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)

  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  }
}

function interpolateAngle(start: number, end: number, progress: number): number {
  return start + Phaser.Math.Angle.Wrap(end - start) * progress
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value)
}

function magnitude(vector: Point): number {
  return Math.hypot(vector.x, vector.y)
}

function getClearAssistBonus(player: Player): number {
  return getAiClearSafetyBonus(
    player,
    getConfiguredAiAssistContext(player, 1),
  )
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function signedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function formatPoint(point: Point | null): string {
  return point ? `${point.x.toFixed(1)},${point.y.toFixed(1)}` : 'n/a'
}
