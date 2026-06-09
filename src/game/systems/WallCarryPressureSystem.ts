import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { wallConfig } from '../config/wallConfig'
import type { Point } from '../data/geometry'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import {
  clampPointInsideArena,
  getNearestWall,
  getWallInwardNormal,
  parseWallLabel,
  type WallSide,
} from '../rules/WallGeometry'
import type { FumbleSystem } from './FumbleSystem'
import type {
  CorePossessionState,
  StickInteractionSystem,
} from './StickInteractionSystem'

type PendingCarrierImpact = {
  playerId: string
  side: WallSide
  speed: number
}

export type WallCarryDebugState = {
  event: string
  impactSpeed: number
  pressureAdded: number
  pinnedMs: number
}

export class WallCarryPressureSystem {
  private readonly scene: Phaser.Scene
  private previousVelocities = new Map<string, Point>()
  private pendingImpacts: PendingCarrierImpact[] = []
  private carrierId: string | null = null
  private pinnedMs = 0
  private impactCooldownMs = 0
  private event = 'CLEAR'
  private impactSpeed = 0
  private pressureAdded = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.matter.world.on('collisionstart', this.handleCollisionStart)
  }

  update(
    core: Core,
    players: Player[],
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    deltaMs: number,
  ): void {
    this.impactCooldownMs = Math.max(
      0,
      this.impactCooldownMs - deltaMs,
    )
    this.pressureAdded = 0
    const carrierId = stickSystem.getCarrierId()
    const coreState = stickSystem.getState()
    const carrier = carrierId
      ? players.find((player) => player.id === carrierId) ?? null
      : null

    if (
      !wallConfig.wallCarryFumbleEnabled ||
      !carrier ||
      !isCradledState(coreState)
    ) {
      this.clearCarrierState()
      this.captureVelocities(players)
      this.pendingImpacts = []
      return
    }

    if (this.carrierId !== carrier.id) {
      this.carrierId = carrier.id
      this.pinnedMs = 0
      this.event = 'CLEAR'
    }

    const carrierImpacts = this.pendingImpacts.filter(
      (impact) => impact.playerId === carrier.id,
    )
    this.pendingImpacts = []

    for (const impact of carrierImpacts) {
      if (
        impact.speed <= wallConfig.wallCarryBrushGraceSpeed ||
        impact.speed < wallConfig.wallCarryImpactSpeedThreshold ||
        this.impactCooldownMs > 0
      ) {
        if (impact.speed > 0.1) {
          this.event = `BRUSH ${impact.side.toUpperCase()}`
          this.impactSpeed = impact.speed
        }
        continue
      }

      const impactScale = Phaser.Math.Clamp(
        impact.speed / wallConfig.wallCarryImpactSpeedThreshold,
        1,
        3,
      )
      const amount =
        wallConfig.wallCarryFumblePressure * impactScale

      this.impactSpeed = impact.speed
      this.event = `HARD ${impact.side.toUpperCase()}`
      this.impactCooldownMs = 180

      if (
        this.addPressureAndMaybeFumble(
          amount,
          impact.side,
          core,
          carrier,
          players,
          coreState,
          stickSystem,
          fumbleSystem,
        )
      ) {
        this.captureVelocities(players)
        return
      }
    }

    const nearestWall = getNearestWall(
      carrier.position,
      playerRuntimeConfig.radius,
    )
    const nearWall =
      nearestWall.distance <= wallConfig.wallPinDetectionDistance
    const carrierSpeed = Math.hypot(
      carrier.velocity.x,
      carrier.velocity.y,
    )
    const pinned =
      nearWall &&
      carrierSpeed <= wallConfig.wallPinVelocityThreshold

    if (pinned) {
      this.pinnedMs += deltaMs

      if (this.pinnedMs >= wallConfig.wallCarryPinnedTimeMs) {
        this.event = `PINNED ${nearestWall.side.toUpperCase()}`
        const amount =
          wallConfig.wallCarryPinnedFumblePressure *
          (deltaMs / 1000)

        this.addPressureAndMaybeFumble(
          amount,
          nearestWall.side,
          core,
          carrier,
          players,
          coreState,
          stickSystem,
          fumbleSystem,
        )
      }
    } else {
      this.pinnedMs = 0

      if (this.event.startsWith('PINNED')) {
        this.event = 'CLEAR'
      }
    }

    this.captureVelocities(players)
  }

  reset(): void {
    this.previousVelocities.clear()
    this.pendingImpacts = []
    this.clearCarrierState()
    this.impactCooldownMs = 0
    this.event = 'CLEAR'
    this.impactSpeed = 0
    this.pressureAdded = 0
  }

  destroy(): void {
    this.scene.matter.world.off(
      'collisionstart',
      this.handleCollisionStart,
    )
  }

  getDebugState(): WallCarryDebugState {
    return {
      event: this.event,
      impactSpeed: this.impactSpeed,
      pressureAdded: this.pressureAdded,
      pinnedMs: this.pinnedMs,
    }
  }

  private handleCollisionStart = (
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void => {
    for (const pair of event.pairs) {
      const bodyAPlayerId = getPlayerId(pair.bodyA.label)
      const bodyBPlayerId = getPlayerId(pair.bodyB.label)
      const playerId = bodyAPlayerId ?? bodyBPlayerId

      if (!playerId) {
        continue
      }

      const wallBody = bodyAPlayerId ? pair.bodyB : pair.bodyA
      const wall = parseWallLabel(wallBody.label)

      if (!wall || wall.safety) {
        continue
      }

      const inward = getWallInwardNormal(wall.side)
      const previousVelocity =
        this.previousVelocities.get(playerId) ??
        (bodyAPlayerId ? pair.bodyA.velocity : pair.bodyB.velocity)
      const speed = Math.max(
        0,
        -dot(previousVelocity, inward),
      )

      this.pendingImpacts.push({
        playerId,
        side: wall.side,
        speed,
      })
    }
  }

  private addPressureAndMaybeFumble(
    amount: number,
    side: WallSide,
    core: Core,
    carrier: Player,
    players: Player[],
    coreState: CorePossessionState,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
  ): boolean {
    this.pressureAdded += amount
    const shouldFumble = fumbleSystem.addWallPressure(
      amount,
      coreState,
      carrier,
      wallConfig.wallCarryOverchargeMultiplier,
    )

    if (!shouldFumble) {
      return false
    }

    const inward = getWallInwardNormal(side)
    const fumbled = stickSystem.forceFumble(
      core,
      players,
      carrier.id,
      inward,
      wallConfig.wallFumblePopInwardImpulse,
      0.08,
    )

    if (!fumbled) {
      return false
    }

    const releasePosition = clampPointInsideArena(
      {
        x:
          carrier.position.x +
          inward.x *
            (playerRuntimeConfig.radius + coreConfig.radius + 6),
        y:
          carrier.position.y +
          inward.y *
            (playerRuntimeConfig.radius + coreConfig.radius + 6),
      },
      coreConfig.radius + 2,
    )

    core.setPosition(releasePosition)
    core.setVelocity({
      x: inward.x * wallConfig.wallFumblePopInwardImpulse,
      y: inward.y * wallConfig.wallFumblePopInwardImpulse,
    })
    fumbleSystem.clear()
    this.event = `FUMBLED ${side.toUpperCase()}`
    this.pinnedMs = 0
    return true
  }

  private clearCarrierState(): void {
    this.carrierId = null
    this.pinnedMs = 0
  }

  private captureVelocities(players: Player[]): void {
    this.previousVelocities = new Map(
      players.map((player) => [player.id, player.velocity]),
    )
  }
}

function getPlayerId(label: string): string | null {
  return label.startsWith('player:') ? label.slice('player:'.length) : null
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

function isCradledState(state: CorePossessionState): boolean {
  return (
    state === 'CRADLED_STABLE' ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED'
  )
}
