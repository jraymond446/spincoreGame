import Phaser from 'phaser'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { coreConfig } from '../config/entityConfig'
import { goalConfigs } from '../config/goalConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'
import {
  isNearOwnGoal,
  sanitizeClearDirection,
} from './ClearSafetySystem'

export class AIOwnGoalSafetySystem {
  private readonly world: Phaser.Physics.Matter.World
  private readonly core: Core
  private readonly pendingPlayerIds = new Set<string>()
  private destroyed = false

  constructor(scene: Phaser.Scene, core: Core) {
    this.world = scene.matter.world
    this.core = core
    this.world.on('collisionstart', this.handleCollision)
    this.world.on('collisionactive', this.handleCollision)
  }

  update(
    players: Player[],
    controlledPlayerId: string,
    isPossessed: boolean,
  ): void {
    if (
      isPossessed ||
      !clearSafetyConfig.ownGoalPreventionEnabled ||
      !clearSafetyConfig.defensiveDeflectionSafetyEnabled
    ) {
      this.pendingPlayerIds.clear()
      return
    }

    for (const playerId of this.pendingPlayerIds) {
      const player = players.find(
        (candidate) => candidate.id === playerId,
      )

      if (
        !player ||
        player.id === controlledPlayerId ||
        !isNearOwnGoal(this.core.position, player.teamSide)
      ) {
        continue
      }

      this.protectFromBodyDeflection(player.teamSide)
    }

    this.pendingPlayerIds.clear()
  }

  reset(): void {
    this.pendingPlayerIds.clear()
  }

  destroy(): void {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    this.world.off('collisionstart', this.handleCollision)
    this.world.off('collisionactive', this.handleCollision)
  }

  private handleCollision = (
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void => {
    for (const pair of event.pairs) {
      const coreIsBodyA = isSameBody(pair.bodyA, this.core.body)
      const coreIsBodyB = isSameBody(pair.bodyB, this.core.body)

      if (!coreIsBodyA && !coreIsBodyB) {
        continue
      }

      const playerBody = coreIsBodyA ? pair.bodyB : pair.bodyA
      const playerId = getPlayerId(playerBody.label)

      if (playerId) {
        this.pendingPlayerIds.add(playerId)
      }
    }
  }

  private protectFromBodyDeflection(side: TeamSide): void {
    const velocity = this.core.velocity
    const speed = Math.hypot(velocity.x, velocity.y)
    const safe = sanitizeClearDirection(
      velocity,
      side,
      this.core.position,
      {
        awayBias: Math.max(
          clearSafetyConfig.defensiveDeflectionAwayBias,
          clearSafetyConfig.defenderStickAwayBias,
        ),
        reason: 'nearGoalDeflection',
      },
    )
    const clampedPosition = clampToFieldSideOfGoal(
      this.core.position,
      side,
    )

    if (clampedPosition) {
      this.core.setPosition(clampedPosition)
    }

    if (safe.corrected && speed > 0.05) {
      this.core.setVelocity({
        x: safe.direction.x * speed,
        y: safe.direction.y * speed,
      })
    }
  }
}

function clampToFieldSideOfGoal(
  position: Point,
  side: TeamSide,
): Point | null {
  const goal = goalConfigs.find((candidate) =>
    side === 'A'
      ? candidate.id === 'bottom-goal'
      : candidate.id === 'top-goal',
  )

  if (!goal) {
    return null
  }

  const away = getKeeperHomeDirection(side)
  const fromGoal = {
    x: position.x - goal.x,
    y: position.y - goal.y,
  }
  const fieldSideDistance = dot(fromGoal, away)
  const minimumDistance = coreConfig.radius + 2
  const insideGoalMouth =
    Math.abs(position.x - goal.x) <=
    goal.length / 2 + coreConfig.radius

  if (!insideGoalMouth || fieldSideDistance >= minimumDistance) {
    return null
  }

  return {
    x: position.x,
    y: goal.y + away.y * minimumDistance,
  }
}

function getPlayerId(label: string): string | null {
  return label.startsWith('player:')
    ? label.slice('player:'.length)
    : null
}

function isSameBody(
  body: MatterJS.BodyType,
  target: MatterJS.BodyType,
): boolean {
  return body === target || body.parent === target
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
