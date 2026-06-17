import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getConfiguredAiAssistContext,
} from '../ai/AIAssist'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { defenseConfig } from '../config/defenseConfig'
import { goalConfigs } from '../config/goalConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import type { DefensiveVisualState } from '../rendering/AnimationState'
import type { FumbleSystem } from './FumbleSystem'
import type {
  CorePossessionState,
  StickInteractionSystem,
} from './StickInteractionSystem'
import {
  getOwnGoalSafetyPowerScale,
  isNearOwnGoal,
  sanitizeClearDirection,
  type ClearSafetyResult,
} from './ClearSafetySystem'
import {
  normalizeSafe,
  sanitizeVector,
} from '../utils/vectorSafety'

export type DefenseIntent = {
  truck: boolean
  slash: boolean
  aimDirection?: Point
}

export type DefensiveActionState = DefensiveVisualState

export type DefenseEvent = {
  type: 'truckConnected'
  attackerId: string
  targetId: string
  teamSide: TeamSide
  knockedDown: boolean
}

export type DefenseTargetDebug = {
  playerId: string
  action: 'TRUCK' | 'SLASH'
  toughness: number
  ballHandling: number
}

export type SlashChargeDebug = {
  carrierPossessionState: CorePossessionState
  chargingTimeMs: number
  slashHitCarrier: boolean
  slashHitCore: boolean
  slashAppliedToCharging: boolean
  fumblePressureBefore: number
  fumblePressureAfter: number
  vulnerabilityMultiplier: number
  stealDeniedReason: string | null
}

type DefenseRuntime = {
  state: DefensiveActionState
  elapsedMs: number
  truckCooldownMs: number
  slashCooldownMs: number
  knockdownImmunityMs: number
  connected: boolean
  actionDirection: Point
}

type Burst = {
  position: Point
  remainingMs: number
  kind: 'truck' | 'slash' | 'fumble'
}

type Shove = {
  velocity: Point
  remainingMs: number
}

export class DefenseSystem {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly runtimes = new Map<string, DefenseRuntime>()
  private readonly bursts: Burst[] = []
  private readonly shoves = new Map<string, Shove>()
  private readonly pendingEvents: DefenseEvent[] = []
  private debugEnabled = false
  private focusPlayerId: string | null = null
  private lastTargetDebug: DefenseTargetDebug | null = null
  private lastClearSafety: ClearSafetyResult | null = null
  private lastClearSafetyPoint: Point | null = null
  private lastSlashChargeDebug: SlashChargeDebug | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(19)
  }

  update(
    core: Core,
    players: Player[],
    intents: Map<string, DefenseIntent>,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    focusPlayerId: string,
    deltaMs: number,
  ): void {
    this.focusPlayerId = focusPlayerId
    fumbleSystem.update(
      stickSystem.getCarrierId(),
      stickSystem.getState(),
      deltaMs,
    )

    for (const player of players) {
      const runtime = this.getRuntime(player.id)
      const intent = intents.get(player.id) ?? {
        truck: false,
        slash: false,
      }

      this.updateCooldowns(runtime, deltaMs)
      this.advanceState(runtime, player, deltaMs)

      if (isKnockdownState(runtime.state)) {
        if (player.id === stickSystem.getCarrierId()) {
          if (
            stickSystem.forceFumble(
              core,
              players,
              player.id,
              runtime.actionDirection,
              defenseConfig.truckKnockdownFumbleSpeed,
              0.18,
            )
          ) {
            fumbleSystem.clear()
            this.addBurst(core.position, 'fumble')
          }
        }
        player.setDefenseVisualState(runtime.state)
        continue
      }

      if (player.id === stickSystem.getCarrierId()) {
        if (runtime.state !== 'IDLE') {
          this.cancelAction(player.id)
        }
        player.setDefenseVisualState('IDLE')
        continue
      }

      if (
        runtime.state === 'IDLE'
      ) {
        if (
          defenseConfig.truckEnabled &&
          intent.truck &&
          runtime.truckCooldownMs === 0
        ) {
          this.startTruck(runtime)
        } else if (
          defenseConfig.slashEnabled &&
          intent.slash &&
          runtime.slashCooldownMs === 0
        ) {
          this.startSlash(
            runtime,
            player,
            intent.aimDirection ?? player.getReleaseAimForward(),
          )
        }
      }

      if (runtime.state === 'TRUCK_ACTIVE') {
        this.applyTruck(
          player,
          players,
          core,
          stickSystem,
          fumbleSystem,
          runtime,
        )
      } else if (runtime.state === 'SLASH_ACTIVE') {
        this.applySlash(
          player,
          players,
          core,
          stickSystem,
          fumbleSystem,
          runtime,
        )
      } else if (
        runtime.state === 'TRUCK_RECOVERY' &&
        !runtime.connected
      ) {
        const safeVelocity = sanitizeVector(
          player.velocity,
          { x: 0, y: 0 },
          {
            label: '[Invalid Movement Vector]',
            playerId: player.id,
            system: 'DefenseSystem.truckRecovery',
          },
        )
        this.scene.matter.body.setVelocity(player.body, {
          x:
            safeVelocity.x *
            recoveryMovementMultiplier(player),
          y:
            safeVelocity.y *
            recoveryMovementMultiplier(player),
        })
      }

      player.setDefenseVisualState(runtime.state)
    }

    this.applyShoves(players, deltaMs)
    this.updateBursts(deltaMs)
    this.draw(players)
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    if (!enabled && this.bursts.length === 0) {
      this.graphics.clear()
    }
  }

  clear(): void {
    this.runtimes.clear()
    this.bursts.length = 0
    this.shoves.clear()
    this.pendingEvents.length = 0
    this.lastTargetDebug = null
    this.lastClearSafety = null
    this.lastClearSafetyPoint = null
    this.lastSlashChargeDebug = null
    this.graphics.clear()
  }

  consumeEvents(): DefenseEvent[] {
    return this.pendingEvents.splice(0)
  }

  getState(playerId: string): DefensiveActionState {
    return this.runtimes.get(playerId)?.state ?? 'IDLE'
  }

  getCooldowns(playerId: string): {
    truckMs: number
    slashMs: number
  } {
    const runtime = this.runtimes.get(playerId)

    return {
      truckMs: runtime?.truckCooldownMs ?? 0,
      slashMs: runtime?.slashCooldownMs ?? 0,
    }
  }

  getActionLabel(playerId: string): string {
    return this.getState(playerId).replaceAll('_', ' ')
  }

  isMovementLocked(playerId: string): boolean {
    return isKnockdownState(this.getState(playerId))
  }

  cancelAction(playerId: string): void {
    const runtime = this.runtimes.get(playerId)
    if (runtime && !isKnockdownState(runtime.state)) {
      runtime.state = 'IDLE'
      runtime.elapsedMs = 0
      runtime.connected = false
    }
    this.shoves.delete(playerId)
  }

  getTargetDebug(): DefenseTargetDebug | null {
    return this.lastTargetDebug ? { ...this.lastTargetDebug } : null
  }

  getSlashChargeDebug(): SlashChargeDebug | null {
    return this.lastSlashChargeDebug
      ? { ...this.lastSlashChargeDebug }
      : null
  }

  private getRuntime(playerId: string): DefenseRuntime {
    const existing = this.runtimes.get(playerId)

    if (existing) {
      return existing
    }

    const runtime: DefenseRuntime = {
      state: 'IDLE',
      elapsedMs: 0,
      truckCooldownMs: 0,
      slashCooldownMs: 0,
      knockdownImmunityMs: 0,
      connected: false,
      actionDirection: { x: 1, y: 0 },
    }
    this.runtimes.set(playerId, runtime)
    return runtime
  }

  private updateCooldowns(
    runtime: DefenseRuntime,
    deltaMs: number,
  ): void {
    runtime.truckCooldownMs = Math.max(
      0,
      runtime.truckCooldownMs - deltaMs,
    )
    runtime.slashCooldownMs = Math.max(
      0,
      runtime.slashCooldownMs - deltaMs,
    )
    runtime.knockdownImmunityMs = Math.max(
      0,
      runtime.knockdownImmunityMs - deltaMs,
    )
  }

  private advanceState(
    runtime: DefenseRuntime,
    player: Player,
    deltaMs: number,
  ): void {
    if (runtime.state === 'IDLE') {
      return
    }

    runtime.elapsedMs += deltaMs
    const duration = stateDuration(runtime.state, player)

    if (runtime.elapsedMs < duration) {
      return
    }

    const completedState = runtime.state
    const nextState = nextDefenseState(completedState)
    runtime.state = nextState
    runtime.elapsedMs = 0

    if (completedState === 'GETTING_UP' && nextState === 'IDLE') {
      runtime.knockdownImmunityMs =
        defenseConfig.truckKnockdownImmunityMs
    }

    if (nextState === 'IDLE') {
      runtime.connected = false
    }
  }

  private startTruck(runtime: DefenseRuntime): void {
    runtime.state = 'TRUCK_STARTUP'
    runtime.elapsedMs = 0
    runtime.connected = false
    runtime.truckCooldownMs = defenseConfig.truckCooldownMs
  }

  private startSlash(
    runtime: DefenseRuntime,
    player: Player,
    direction: Point,
  ): void {
    runtime.state = 'SLASH_STARTUP'
    runtime.elapsedMs = 0
    runtime.connected = false
    const clearAssistBonus = getAiClearSafetyBonus(
      player,
      getConfiguredAiAssistContext(player, 1),
    )
    runtime.actionDirection =
      player.role === 'keeper'
        ? sanitizeClearDirection(
            direction,
            player.teamSide,
            undefined,
            {
              awayBias:
                clearSafetyConfig.keeperShieldAwayBias +
                clearAssistBonus,
            },
          ).direction
        : normalizeSafe(
            sanitizeVector(
              direction,
              player.getReleaseAimForward(),
              {
                label: '[Invalid Aim Vector]',
                playerId: player.id,
                system: 'DefenseSystem.startSlash',
              },
            ),
            player.getReleaseAimForward(),
          )
    runtime.slashCooldownMs = defenseConfig.slashCooldownMs
  }

  private applyTruck(
    attacker: Player,
    players: Player[],
    core: Core,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    runtime: DefenseRuntime,
  ): void {
    const direction = actionDirection(attacker, true)
    const lungeSpeed =
      defenseConfig.truckLungeImpulse + attacker.attributes.speed * 3.2

    this.scene.matter.body.setVelocity(attacker.body, {
      x: direction.x * lungeSpeed,
      y: direction.y * lungeSpeed,
    })

    if (runtime.connected) {
      return
    }

    const target = nearestTargetInSector(
      attacker,
      players.filter(
        (player) => player.teamSide !== attacker.teamSide,
      ),
      direction,
      defenseConfig.truckRange,
      defenseConfig.truckArcRadians,
    )

    if (!target) {
      return
    }

    runtime.connected = true
    const roleMultiplier =
      attacker.role === 'brute'
        ? defenseConfig.bruteTruckMultiplier
        : defenseConfig.nonBruteTruckMultiplier
    const receivedImpulseMultiplier = Phaser.Math.Linear(
      1.2,
      0.65,
      normalizedAttribute(target.attributes.toughness),
    )
    const impulse =
      defenseConfig.truckBodyImpulse *
      attacker.attributes.power *
      roleMultiplier *
      receivedImpulseMultiplier
    const targetRuntime = this.getRuntime(target.id)
    const knockedDown =
      targetRuntime.knockdownImmunityMs === 0 &&
      truckKnockdownMargin(attacker, target) >=
        defenseConfig.truckKnockdownThreshold

    this.pendingEvents.push({
      type: 'truckConnected',
      attackerId: attacker.id,
      targetId: target.id,
      teamSide: attacker.teamSide,
      knockedDown,
    })

    this.shoves.set(target.id, {
      velocity: {
        x: direction.x * impulse,
        y: direction.y * impulse,
      },
      remainingMs:
        (knockedDown
          ? defenseConfig.truckActiveMs + 220
          : defenseConfig.truckActiveMs + 120) *
        Phaser.Math.Linear(
          1.15,
          0.75,
          normalizedAttribute(target.attributes.toughness),
        ),
    })
    this.recordTargetDebug(attacker, target, 'TRUCK')
    this.addBurst(target.position, 'truck')

    if (knockedDown) {
      this.startKnockdown(targetRuntime, target, direction)
      if (
        stickSystem.forceFumble(
          core,
          players,
          target.id,
          direction,
          defenseConfig.truckKnockdownFumbleSpeed,
          0.18,
        )
      ) {
        fumbleSystem.clear()
        this.addBurst(core.position, 'fumble')
      }
      return
    }

    if (stickSystem.getCarrierId() === target.id) {
      const pressure =
        defenseConfig.truckFumblePressure *
        attacker.attributes.defense *
        roleMultiplier *
        attacker.defenseTendencies.fumblePressurePreference *
        stylePressureMultiplier(attacker)
      const shouldFumble = fumbleSystem.addPressure(
        pressure,
        attacker.role,
        'truck',
        stickSystem.getState(),
        target,
      )

      if (
        shouldFumble &&
        stickSystem.forceFumble(core, players, target.id, direction)
      ) {
        fumbleSystem.clear()
        this.addBurst(core.position, 'fumble')
      }
    }
  }

  private startKnockdown(
    runtime: DefenseRuntime,
    target: Player,
    direction: Point,
  ): void {
    runtime.state = 'KNOCKED_DOWN'
    runtime.elapsedMs = 0
    runtime.connected = false
    runtime.actionDirection = { ...direction }
    target.setDefenseVisualState('KNOCKED_DOWN')
    target.stopMovement()
  }

  private applySlash(
    attacker: Player,
    players: Player[],
    core: Core,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    runtime: DefenseRuntime,
  ): void {
    if (runtime.connected) {
      return
    }

    const direction = runtime.actionDirection
    const precisionMultiplier =
      attacker.role === 'support'
        ? defenseConfig.supportSlashPrecisionMultiplier
        : 1
    const range =
      defenseConfig.slashRange *
      Phaser.Math.Linear(
        0.86,
        precisionMultiplier,
        attacker.attributes.accuracy,
      )

    const carrierId = stickSystem.getCarrierId()
    const carrier = players.find((player) => player.id === carrierId)
    const targetPoints =
      carrier && carrier.teamSide !== attacker.teamSide
        ? [
            core.position,
            carrier.getCradleSocket(),
            ...carrier.getStickSamplePoints(),
          ]
        : carrier
          ? []
          : [core.position]
    const hitPoint = targetPoints.find((point) =>
      pointInSector(
        attacker.position,
        point,
        direction,
        range,
        defenseConfig.slashArcRadians,
      ),
    )

    if (!hitPoint) {
      return
    }

    runtime.connected = true
    this.addBurst(hitPoint, 'slash')

    if (carrier && carrier.teamSide !== attacker.teamSide) {
      const possessionState = stickSystem.getState()
      const charging =
        possessionState === 'CRADLED_CHARGING' ||
        possessionState === 'CRADLED_OVERCHARGED'
      const releaseWindup = stickSystem.isReleaseWindup(carrier.id)
      const fumblePressureBefore = fumbleSystem.getPressure()
      const chargingTimeMs = stickSystem.getCradleElapsedMs()
      const vulnerabilityMultiplier =
        releaseWindup
          ? defenseConfig.releaseWindupSlashVulnerability
          : possessionState === 'CRADLED_OVERCHARGED'
          ? defenseConfig.overchargedSlashVulnerability
          : possessionState === 'CRADLED_CHARGING'
            ? defenseConfig.chargingSlashVulnerability
            : defenseConfig.stableSlashVulnerability

      if (
        stickSystem.isReleaseProtected(
          carrier.id,
          defenseConfig.releaseFrameProtectionMs,
        )
      ) {
        this.recordSlashChargeDebug({
          carrierPossessionState: possessionState,
          chargingTimeMs,
          slashHitCarrier: true,
          slashHitCore: hitPoint === targetPoints[0],
          slashAppliedToCharging: false,
          fumblePressureBefore,
          fumblePressureAfter: fumblePressureBefore,
          vulnerabilityMultiplier,
          stealDeniedReason: 'releaseProtected',
        })
        return
      }

      if (charging && !defenseConfig.chargingStealEnabled) {
        this.recordSlashChargeDebug({
          carrierPossessionState: possessionState,
          chargingTimeMs,
          slashHitCarrier: true,
          slashHitCore: hitPoint === targetPoints[0],
          slashAppliedToCharging: false,
          fumblePressureBefore,
          fumblePressureAfter: fumblePressureBefore,
          vulnerabilityMultiplier,
          stealDeniedReason: 'chargingStealDisabled',
        })
        return
      }

      const roleMultiplier =
        attacker.role === 'support'
          ? defenseConfig.supportSlashPrecisionMultiplier
          : attacker.role === 'brute'
            ? defenseConfig.bruteSlashPowerMultiplier
            : 1
      const pressure =
        defenseConfig.slashFumblePressure *
        attacker.attributes.defense *
        Phaser.Math.Linear(0.8, 1.15, attacker.attributes.accuracy) *
        Phaser.Math.Linear(0.86, 1.12, attacker.attributes.control) *
        roleMultiplier *
        stickSlashMultiplier(attacker) *
        attacker.defenseTendencies.fumblePressurePreference *
        stylePressureMultiplier(attacker)
      this.recordTargetDebug(attacker, carrier, 'SLASH')
      const pressureFumble = fumbleSystem.addPressure(
        pressure,
        attacker.role,
        'slash',
        possessionState,
        carrier,
        releaseWindup
          ? defenseConfig.releaseWindupSlashVulnerability
          : undefined,
      )
      const baseFumbleChance =
        possessionState === 'CRADLED_OVERCHARGED'
          ? defenseConfig.slashOverchargeFumbleBaseChance
          : possessionState === 'CRADLED_CHARGING'
            ? defenseConfig.slashChargeFumbleBaseChance
            : 0
      const carrierResistance = Phaser.Math.Linear(
        1.15,
        0.65,
        Phaser.Math.Clamp(
          (carrier.attributes.toughness +
            carrier.attributes.ballHandling) *
            0.5,
          0,
          1,
        ),
      )
      const chanceFumble =
        baseFumbleChance > 0 &&
        Math.random() <
          Phaser.Math.Clamp(
            baseFumbleChance *
              Phaser.Math.Linear(
                0.72,
                1.12,
                normalizedAttribute(attacker.attributes.defense),
              ) *
              carrierResistance *
              roleMultiplier,
            0,
            0.95,
          )
      const shouldFumble = pressureFumble || chanceFumble

      if (
        charging &&
        defenseConfig.slashCanInterruptCharge &&
        !shouldFumble
      ) {
        stickSystem.interruptCharge(carrier.id)
      }

      this.recordSlashChargeDebug({
        carrierPossessionState: possessionState,
        chargingTimeMs,
        slashHitCarrier: true,
        slashHitCore: hitPoint === targetPoints[0],
        slashAppliedToCharging: charging,
        fumblePressureBefore,
        fumblePressureAfter: fumbleSystem.getPressure(),
        vulnerabilityMultiplier,
        stealDeniedReason: null,
      })

      if (
        shouldFumble &&
        stickSystem.forceFumble(core, players, carrier.id, direction)
      ) {
        fumbleSystem.clear()
        this.addBurst(core.position, 'fumble')
      }
      return
    }

    if (!carrier) {
      const powerMultiplier =
        attacker.role === 'brute'
          ? defenseConfig.bruteSlashPowerMultiplier
          : 1
      const impulse =
        defenseConfig.slashFreeCoreImpulse *
        attacker.attributes.power *
        powerMultiplier *
        stickSlashMultiplier(attacker)

      const nextVelocity = {
        x: core.velocity.x + direction.x * impulse,
        y: core.velocity.y + direction.y * impulse,
      }

      if (
        attacker.role === 'keeper' ||
        (clearSafetyConfig.defensiveDeflectionSafetyEnabled &&
          isNearOwnGoal(core.position, attacker.teamSide))
      ) {
        const clearAssistBonus = getAiClearSafetyBonus(
          attacker,
          getConfiguredAiAssistContext(attacker, 1),
        )
        const speed = Math.hypot(nextVelocity.x, nextVelocity.y)
        const safe = sanitizeClearDirection(
          nextVelocity,
          attacker.teamSide,
          core.position,
          {
            awayBias:
              attacker.role === 'keeper'
                ? clearSafetyConfig.keeperShieldAwayBias +
                  clearAssistBonus
                : Math.max(
                    clearSafetyConfig.defenderStickAwayBias,
                    clearSafetyConfig.defensiveDeflectionAwayBias,
                  ) + clearAssistBonus,
            reason: 'nearGoalDeflection',
          },
        )
        this.lastClearSafety = safe
        this.lastClearSafetyPoint = { ...core.position }
        const safeSpeed =
          speed * getOwnGoalSafetyPowerScale(safe)
        core.setVelocity({
          x: safe.direction.x * safeSpeed,
          y: safe.direction.y * safeSpeed,
        })
      } else {
        core.setVelocity(nextVelocity)
      }
    }
  }

  getClearSafetyDebug(): ClearSafetyResult | null {
    return this.lastClearSafety
      ? {
          ...this.lastClearSafety,
          direction: { ...this.lastClearSafety.direction },
          rawDirection: { ...this.lastClearSafety.rawDirection },
        }
      : null
  }

  private addBurst(
    position: Point,
    kind: Burst['kind'],
  ): void {
    this.bursts.push({
      position: { ...position },
      remainingMs: 260,
      kind,
    })
  }

  private recordTargetDebug(
    attacker: Player,
    target: Player,
    action: DefenseTargetDebug['action'],
  ): void {
    if (attacker.id === this.focusPlayerId) {
      this.lastTargetDebug = targetDebug(target, action)
    }
  }

  private recordSlashChargeDebug(debug: SlashChargeDebug): void {
    this.lastSlashChargeDebug = debug
    if (this.debugEnabled) {
      console.info('[Slash Charge Interaction]', debug)
    }
  }

  private applyShoves(players: Player[], deltaMs: number): void {
    for (const [playerId, shove] of this.shoves) {
      const player = players.find((candidate) => candidate.id === playerId)

      if (!player) {
        this.shoves.delete(playerId)
        continue
      }

      const strength = Phaser.Math.Clamp(shove.remainingMs / 250, 0, 1)
      const safeVelocity = sanitizeVector(
        player.velocity,
        { x: 0, y: 0 },
        {
          label: '[Invalid Movement Vector]',
          playerId,
          system: 'DefenseSystem.applyShoves',
        },
      )
      this.scene.matter.body.setVelocity(player.body, {
        x: safeVelocity.x + shove.velocity.x * strength,
        y: safeVelocity.y + shove.velocity.y * strength,
      })
      shove.remainingMs -= deltaMs

      if (shove.remainingMs <= 0) {
        this.shoves.delete(playerId)
      }
    }
  }

  private updateBursts(deltaMs: number): void {
    for (const burst of this.bursts) {
      burst.remainingMs -= deltaMs
    }

    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      if (this.bursts[index].remainingMs <= 0) {
        this.bursts.splice(index, 1)
      }
    }
  }

  private draw(players: Player[]): void {
    this.graphics.clear()

    for (const player of players) {
      const runtime = this.runtimes.get(player.id)

      if (!runtime) {
        continue
      }

      if (runtime.state === 'TRUCK_ACTIVE') {
        this.drawActionArc(
          player,
          actionDirection(player, true),
          defenseConfig.truckRange,
          defenseConfig.truckArcRadians,
          defenseConfig.debug.truckColor,
          0.72,
        )
      } else if (runtime.state === 'SLASH_ACTIVE') {
        this.drawActionArc(
          player,
          runtime.actionDirection,
          defenseConfig.slashRange,
          defenseConfig.slashArcRadians,
          defenseConfig.debug.slashColor,
          0.76,
        )
      }
    }

    if (this.debugEnabled) {
      const focus = players.find(
        (player) => player.id === this.focusPlayerId,
      )

      if (focus) {
        this.drawActionArc(
          focus,
          actionDirection(focus, true),
          defenseConfig.truckRange,
          defenseConfig.truckArcRadians,
          defenseConfig.debug.truckColor,
          defenseConfig.debug.rangeAlpha,
        )
        this.drawActionArc(
          focus,
          actionDirection(focus, false),
          defenseConfig.slashRange,
          defenseConfig.slashArcRadians,
          defenseConfig.debug.slashColor,
          defenseConfig.debug.rangeAlpha,
        )
      }

      this.drawClearSafetyDebug()
    }

    for (const burst of this.bursts) {
      const progress = 1 - burst.remainingMs / 260
      const color =
        burst.kind === 'fumble'
          ? defenseConfig.debug.fumbleColor
          : burst.kind === 'slash'
            ? defenseConfig.debug.slashColor
            : defenseConfig.debug.contactColor
      this.graphics.lineStyle(
        4,
        color,
        1 - progress,
      )
      this.graphics.strokeCircle(
        burst.position.x,
        burst.position.y,
        18 + progress * 32,
      )
    }
  }

  private drawClearSafetyDebug(): void {
    for (const side of ['A', 'B'] as const) {
      const goal = goalConfigs.find((candidate) =>
        side === 'A'
          ? candidate.id === 'bottom-goal'
          : candidate.id === 'top-goal',
      )

      if (!goal) {
        continue
      }

      const awayAngle = side === 'A' ? -Math.PI / 2 : Math.PI / 2
      const towardAngle = awayAngle + Math.PI
      const half = clearSafetyConfig.ownGoalDangerConeRadians / 2
      const radius = clearSafetyConfig.nearOwnGoalSafetyRadius
      const left = {
        x: goal.x + Math.cos(towardAngle - half) * radius,
        y: goal.y + Math.sin(towardAngle - half) * radius,
      }
      const right = {
        x: goal.x + Math.cos(towardAngle + half) * radius,
        y: goal.y + Math.sin(towardAngle + half) * radius,
      }

      this.graphics.lineStyle(2, 0xff7088, 0.22)
      this.graphics.lineBetween(goal.x, goal.y, left.x, left.y)
      this.graphics.lineBetween(goal.x, goal.y, right.x, right.y)
    }

    if (!this.lastClearSafety || !this.lastClearSafetyPoint) {
      return
    }

    const point = this.lastClearSafetyPoint
    this.graphics.lineStyle(3, 0xff7088, 0.7)
    this.graphics.lineBetween(
      point.x,
      point.y,
      point.x + this.lastClearSafety.rawDirection.x * 90,
      point.y + this.lastClearSafety.rawDirection.y * 90,
    )
    this.graphics.lineStyle(4, 0x69ecff, 0.9)
    this.graphics.lineBetween(
      point.x,
      point.y,
      point.x + this.lastClearSafety.direction.x * 105,
      point.y + this.lastClearSafety.direction.y * 105,
    )
  }

  private drawActionArc(
    player: Player,
    direction: Point,
    range: number,
    arc: number,
    color: number,
    alpha: number,
  ): void {
    const centerAngle = Math.atan2(direction.y, direction.x)
    const start = centerAngle - arc / 2
    const end = centerAngle + arc / 2
    const segments = 14

    this.graphics.lineStyle(4, color, alpha)
    this.graphics.beginPath()

    for (let index = 0; index <= segments; index += 1) {
      const angle = Phaser.Math.Linear(start, end, index / segments)
      const point = {
        x: player.position.x + Math.cos(angle) * range,
        y: player.position.y + Math.sin(angle) * range,
      }

      if (index === 0) {
        this.graphics.moveTo(point.x, point.y)
      } else {
        this.graphics.lineTo(point.x, point.y)
      }
    }

    this.graphics.strokePath()
  }
}

function stateDuration(
  state: DefensiveActionState,
  player: Player,
): number {
  const controlRecoveryMultiplier = Phaser.Math.Linear(
    1.15,
    0.72,
    player.attributes.control,
  )

  switch (state) {
    case 'TRUCK_STARTUP':
      return defenseConfig.truckStartupMs
    case 'TRUCK_ACTIVE':
      return defenseConfig.truckActiveMs
    case 'TRUCK_RECOVERY':
      return (
        defenseConfig.truckRecoveryMs *
        Phaser.Math.Linear(
          1.15,
          0.75,
          normalizedAttribute(player.attributes.toughness),
        ) *
        (player.role === 'brute' ? 1.12 : 1)
      )
    case 'KNOCKED_DOWN':
      return (
        defenseConfig.truckKnockdownMs *
        Phaser.Math.Linear(
          1.18,
          0.78,
          normalizedAttribute(player.attributes.toughness),
        )
      )
    case 'GETTING_UP':
      return (
        defenseConfig.truckGetUpMs *
        Phaser.Math.Linear(
          1.12,
          0.84,
          normalizedAttribute(player.attributes.control),
        )
      )
    case 'SLASH_STARTUP':
      return defenseConfig.slashStartupMs
    case 'SLASH_ACTIVE':
      return defenseConfig.slashActiveMs
    case 'SLASH_RECOVERY':
      return (
        defenseConfig.slashRecoveryMs *
        controlRecoveryMultiplier
      )
    default:
      return 0
  }
}

function nextDefenseState(
  state: DefensiveActionState,
): DefensiveActionState {
  switch (state) {
    case 'TRUCK_STARTUP':
      return 'TRUCK_ACTIVE'
    case 'TRUCK_ACTIVE':
      return 'TRUCK_RECOVERY'
    case 'TRUCK_RECOVERY':
      return 'IDLE'
    case 'KNOCKED_DOWN':
      return 'GETTING_UP'
    case 'GETTING_UP':
      return 'IDLE'
    case 'SLASH_STARTUP':
      return 'SLASH_ACTIVE'
    case 'SLASH_ACTIVE':
      return 'SLASH_RECOVERY'
    case 'SLASH_RECOVERY':
      return 'IDLE'
    default:
      return 'IDLE'
  }
}

function isKnockdownState(state: DefensiveActionState): boolean {
  return state === 'KNOCKED_DOWN' || state === 'GETTING_UP'
}

function truckKnockdownMargin(
  attacker: Player,
  target: Player,
): number {
  const roleBonus = attacker.role === 'brute' ? 0.2 : 0
  const attackingForce =
    normalizedAttribute(attacker.attributes.power) * 0.72 +
    normalizedAttribute(attacker.attributes.defense) * 0.28 +
    roleBonus
  const targetResistance =
    normalizedAttribute(target.attributes.toughness) * 0.78 +
    normalizedAttribute(target.attributes.control) * 0.22

  return attackingForce - targetResistance
}

function nearestTargetInSector(
  attacker: Player,
  targets: Player[],
  direction: Point,
  range: number,
  arc: number,
): Player | null {
  return (
    targets
      .filter((target) =>
        pointInSector(
          attacker.position,
          target.position,
          direction,
          range,
          arc,
        ),
      )
      .sort(
        (a, b) =>
          distance(attacker.position, a.position) -
          distance(attacker.position, b.position),
      )[0] ?? null
  )
}

function pointInSector(
  origin: Point,
  point: Point,
  direction: Point,
  range: number,
  arc: number,
): boolean {
  const offset = {
    x: point.x - origin.x,
    y: point.y - origin.y,
  }
  const pointDistance = Math.hypot(offset.x, offset.y)

  if (pointDistance > range || pointDistance === 0) {
    return false
  }

  const angle = Math.acos(
    Phaser.Math.Clamp(
      (offset.x * direction.x + offset.y * direction.y) /
        pointDistance,
      -1,
      1,
    ),
  )

  return angle <= arc / 2
}

function actionDirection(player: Player, preferMovement: boolean): Point {
  const speed = Math.hypot(player.velocity.x, player.velocity.y)

  if (preferMovement && Number.isFinite(speed) && speed > 1.2) {
    return normalizeSafe(
      player.velocity,
      player.getReleaseAimForward(),
    )
  }

  return normalizeSafe(
    player.getReleaseAimForward(),
    { x: 1, y: 0 },
  )
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function recoveryMovementMultiplier(player: Player): number {
  return Phaser.Math.Linear(
    defenseConfig.truckMissRecoveryMovement,
    0.94,
    player.attributes.control,
  )
}

function targetDebug(
  player: Player,
  action: DefenseTargetDebug['action'],
): DefenseTargetDebug {
  return {
    playerId: player.id,
    action,
    toughness: player.attributes.toughness,
    ballHandling: player.attributes.ballHandling,
  }
}

function normalizedAttribute(value: number): number {
  return Phaser.Math.Clamp(value, 0, 1.6)
}

function stickSlashMultiplier(player: Player): number {
  switch (player.stickStyle) {
    case 'whip':
      return 1.12
    case 'fork':
      return 1.1
    case 'hook':
      return 1.08
    case 'cradle':
      return 1.05
    default:
      return 1
  }
}

function stylePressureMultiplier(player: Player): number {
  if (player.playStyle === 'disruptive') {
    return 1.15
  }

  if (
    player.playStyle === 'conservative' ||
    player.playStyle === 'bodyguard'
  ) {
    return 0.92
  }

  return 1
}
