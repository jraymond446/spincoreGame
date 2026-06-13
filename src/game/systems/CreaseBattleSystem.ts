import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getConfiguredAiAssistContext,
} from '../ai/AIAssist'
import { creaseBattleConfig } from '../config/creaseBattleConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'
import {
  getOwnGoalSafetyPowerScale,
  sanitizeClearDirection,
} from './ClearSafetySystem'
import type { StickInteractionEvent } from './StickInteractionSystem'

export type CreaseBattleDebugState = {
  side: TeamSide | null
  timerMs: number
  contactCount: number
  cooldownMs: number
  triggered: boolean
  clearDirection: Point | null
}

export class CreaseBattleSystem {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private side: TeamSide | null = null
  private timerMs = 0
  private contactCount = 0
  private cooldownMs = 0
  private sampleCooldownMs = 0
  private recentContactMs = 0
  private triggerDisplayMs = 0
  private lastVelocity: Point = { x: 0, y: 0 }
  private clearDirection: Point | null = null
  private debugEnabled = false

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(19)
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: '#10243ddd',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)
  }

  update(
    core: Core,
    players: Player[],
    carrierId: string | null,
    interaction: StickInteractionEvent | null,
    deltaMs: number,
  ): boolean {
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs)
    this.sampleCooldownMs = Math.max(0, this.sampleCooldownMs - deltaMs)
    this.recentContactMs = Math.max(0, this.recentContactMs - deltaMs)
    this.triggerDisplayMs = Math.max(0, this.triggerDisplayMs - deltaMs)

    if (
      !creaseBattleConfig.creaseBattleBreakerEnabled ||
      carrierId !== null
    ) {
      this.clearBattle()
      this.drawDebug()
      return false
    }

    const activeSide = closestCrease(core.position)
    if (!activeSide) {
      this.clearBattle()
      this.drawDebug()
      return false
    }

    if (activeSide !== this.side) {
      this.side = activeSide
      this.timerMs = 0
      this.contactCount = 0
      this.lastVelocity = { ...core.velocity }
    }

    if (interaction) {
      const player = players.find(
        (candidate) => candidate.id === interaction.playerId,
      )
      if (
        player?.role === 'keeper' &&
        player.teamSide === activeSide &&
        (interaction.result === 'passive nudge' ||
          interaction.result === 'active swing')
      ) {
        this.contactCount += 1
        this.recentContactMs = 280
      }
    }

    const speed = magnitude(core.velocity)
    const directionChanged =
      speed > 0.25 &&
      magnitude(this.lastVelocity) > 0.25 &&
      dot(normalized(core.velocity), normalized(this.lastVelocity)) <
        creaseBattleConfig.directionChangeDotThreshold

    if (directionChanged && this.sampleCooldownMs === 0) {
      this.contactCount += 1
      this.sampleCooldownMs =
        creaseBattleConfig.directionSampleCooldownMs
    }
    this.lastVelocity = { ...core.velocity }

    const battleActive =
      speed <= creaseBattleConfig.creaseBattleLowSpeedThreshold ||
      directionChanged ||
      this.recentContactMs > 0
    this.timerMs = battleActive
      ? this.timerMs + deltaMs
      : Math.max(0, this.timerMs - deltaMs * 1.6)

    const battlePlayer = players
      .filter(
        (player) =>
          player.teamSide === activeSide &&
          player.role !== 'keeper',
      )
      .sort(
        (a, b) =>
          b.attributes.toughness +
          b.attributes.defense -
          (a.attributes.toughness + a.attributes.defense),
      )[0]
    const scrumSkill = battlePlayer
      ? Phaser.Math.Clamp(
          battlePlayer.attributes.toughness * 0.58 +
            battlePlayer.attributes.defense * 0.3 +
            battlePlayer.attributes.power * 0.12,
          0,
          1.2,
        )
      : 0.5
    const effectiveBattleTime =
      creaseBattleConfig.creaseBattleTimeMs *
      Phaser.Math.Linear(1.12, 0.78, Math.min(1, scrumSkill))
    const effectiveContactThreshold = Math.max(
      2,
      Math.round(
        creaseBattleConfig.creaseBattleContactThreshold *
          Phaser.Math.Linear(1.12, 0.78, Math.min(1, scrumSkill)),
      ),
    )
    const shouldBreak =
      this.cooldownMs === 0 &&
      this.timerMs >= effectiveBattleTime &&
      this.contactCount >= effectiveContactThreshold

    if (!shouldBreak) {
      this.drawDebug()
      return false
    }

    const center = keeperAreaConfig.areas[activeSide]
    const away = getKeeperHomeDirection(activeSide)
    const sideSign =
      core.position.x < center.x
        ? -1
        : core.position.x > center.x
          ? 1
          : this.contactCount % 2 === 0
            ? 1
            : -1
    const desired = normalized({
      x: sideSign * creaseBattleConfig.creaseBattleSideBias,
      y: away.y,
    })
    const clearSafetyBonus =
      battlePlayer
        ? getAiClearSafetyBonus(
            battlePlayer,
            getConfiguredAiAssistContext(battlePlayer, 1),
          )
        : 0
    const safe = sanitizeClearDirection(
      desired,
      activeSide,
      core.position,
      {
        awayBias: 0.55 + clearSafetyBonus,
      },
    )
    const clearPowerMultiplier = battlePlayer
      ? Phaser.Math.Clamp(
          Phaser.Math.Linear(
            0.88,
            1.18,
            battlePlayer.attributes.power * 0.6 +
              battlePlayer.attributes.toughness * 0.4,
          ),
          0.8,
          1.25,
        )
      : 1
    const safePowerMultiplier =
      getOwnGoalSafetyPowerScale(safe)

    core.setVelocity({
      x:
        safe.direction.x *
        creaseBattleConfig.creaseBattleClearImpulse *
        clearPowerMultiplier *
        safePowerMultiplier,
      y:
        safe.direction.y *
        creaseBattleConfig.creaseBattleClearImpulse *
        clearPowerMultiplier *
        safePowerMultiplier,
    })
    this.clearDirection = { ...safe.direction }
    this.triggerDisplayMs = 650
    this.cooldownMs = creaseBattleConfig.creaseBattleCooldownMs
    this.timerMs = 0
    this.contactCount = 0
    this.drawDebug()
    return true
  }

  getDebugState(): CreaseBattleDebugState {
    return {
      side: this.side,
      timerMs: this.timerMs,
      contactCount: this.contactCount,
      cooldownMs: this.cooldownMs,
      triggered: this.triggerDisplayMs > 0,
      clearDirection: this.clearDirection
        ? { ...this.clearDirection }
        : null,
    }
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.graphics.setVisible(enabled)
    this.label.setVisible(enabled && this.side !== null)
    if (!enabled) {
      this.graphics.clear()
    }
  }

  reset(): void {
    this.side = null
    this.timerMs = 0
    this.contactCount = 0
    this.cooldownMs = 0
    this.sampleCooldownMs = 0
    this.recentContactMs = 0
    this.triggerDisplayMs = 0
    this.lastVelocity = { x: 0, y: 0 }
    this.clearDirection = null
    this.graphics.clear()
    this.label.setVisible(false)
  }

  private clearBattle(): void {
    this.side = null
    this.timerMs = 0
    this.contactCount = 0
    this.recentContactMs = 0
    this.lastVelocity = { x: 0, y: 0 }
  }

  private drawDebug(): void {
    if (!this.debugEnabled) {
      return
    }

    this.graphics.clear()
    if (!this.side) {
      this.label.setVisible(false)
      return
    }

    const center = keeperAreaConfig.areas[this.side]
    const progress = Phaser.Math.Clamp(
      this.timerMs / creaseBattleConfig.creaseBattleTimeMs,
      0,
      1,
    )
    this.graphics.lineStyle(
      4,
      this.triggerDisplayMs > 0 ? 0xffd76a : 0xff9f6a,
      0.35 + progress * 0.55,
    )
    this.graphics.strokeCircle(
      center.x,
      center.y,
      keeperAreaConfig.keeperZoneRadius + 12,
    )

    if (this.clearDirection) {
      this.graphics.lineStyle(3, 0x8fffc8, 0.85)
      this.graphics.lineBetween(
        center.x,
        center.y,
        center.x + this.clearDirection.x * 95,
        center.y + this.clearDirection.y * 95,
      )
    }

    this.label
      .setPosition(
        center.x,
        center.y + (this.side === 'A' ? -1 : 1) * 265,
      )
      .setText(
        `CREASE ${Math.round(this.timerMs)}ms | CONTACTS ${this.contactCount}\n` +
          `${this.triggerDisplayMs > 0 ? 'BREAKER TRIGGERED' : `COOLDOWN ${Math.round(this.cooldownMs)}ms`}`,
      )
      .setVisible(true)
  }
}

function closestCrease(point: Point): TeamSide | null {
  let closest: { side: TeamSide; distance: number } | null = null

  for (const side of ['A', 'B'] as const) {
    const currentDistance = Math.hypot(
      point.x - keeperAreaConfig.areas[side].x,
      point.y - keeperAreaConfig.areas[side].y,
    )
    if (
      currentDistance <=
        keeperAreaConfig.keeperZoneRadius *
          creaseBattleConfig.creaseBattleZoneScale &&
      (!closest || currentDistance < closest.distance)
    ) {
      closest = { side, distance: currentDistance }
    }
  }

  return closest?.side ?? null
}

function normalized(vector: Point): Point {
  const length = magnitude(vector)
  return length === 0
    ? { x: 0, y: 0 }
    : { x: vector.x / length, y: vector.y / length }
}

function magnitude(vector: Point): number {
  return Math.hypot(vector.x, vector.y)
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
