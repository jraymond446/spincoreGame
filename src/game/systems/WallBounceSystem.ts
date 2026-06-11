import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import { wallConfig } from '../config/wallConfig'
import type { Point } from '../data/geometry'
import type { Core } from '../entities/Core'
import {
  clampPointInsideArena,
  getArenaBounds,
  getWallInwardNormal,
  isOutsideArena,
  parseWallLabel,
  type WallSide,
} from '../rules/WallGeometry'

type PendingWallImpact = {
  side: WallSide
  safety: boolean
  point: Point
  incomingVelocity: Point
}

type WallImpactEffect = {
  point: Point
  side: WallSide
  speed: number
  remainingMs: number
}

export type WallBounceDebugState = {
  lastCollision: string
  safetyBounceTriggered: boolean
  recentBankShot: boolean
}

export class WallBounceSystem {
  private readonly world: Phaser.Physics.Matter.World
  private readonly core: Core
  private readonly graphics: Phaser.GameObjects.Graphics
  private destroyed = false
  private pendingImpacts: PendingWallImpact[] = []
  private effects: WallImpactEffect[] = []
  private lastVelocity: Point = { x: 0, y: 0 }
  private lastCollision = 'NONE'
  private safetyBounceMsRemaining = 0
  private bankShotMsRemaining = 0

  constructor(scene: Phaser.Scene, core: Core) {
    this.world = scene.matter.world
    this.core = core
    this.graphics = scene.add.graphics().setDepth(15)
    this.lastVelocity = core.velocity
    this.world.on('collisionstart', this.handleCollisionStart)
  }

  update(isPossessed: boolean, deltaMs: number): void {
    this.safetyBounceMsRemaining = Math.max(
      0,
      this.safetyBounceMsRemaining - deltaMs,
    )
    this.bankShotMsRemaining = Math.max(
      0,
      this.bankShotMsRemaining - deltaMs,
    )

    if (!isPossessed) {
      for (const impact of this.pendingImpacts) {
        this.applyWallBounce(impact)
      }
      this.applySafetyBounce()
    }

    this.pendingImpacts = []
    this.updateEffects(deltaMs)
    this.lastVelocity = this.core.velocity
  }

  reset(): void {
    this.pendingImpacts = []
    this.effects = []
    this.lastVelocity = this.core.velocity
    this.lastCollision = 'NONE'
    this.safetyBounceMsRemaining = 0
    this.bankShotMsRemaining = 0
    this.graphics.clear()
  }

  destroy(): void {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    this.world.off(
      'collisionstart',
      this.handleCollisionStart,
    )
    this.graphics.destroy()
  }

  getDebugState(): WallBounceDebugState {
    return {
      lastCollision: this.lastCollision,
      safetyBounceTriggered: this.safetyBounceMsRemaining > 0,
      recentBankShot: this.bankShotMsRemaining > 0,
    }
  }

  private handleCollisionStart = (
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void => {
    for (const pair of event.pairs) {
      const coreIsBodyA = isSameBody(pair.bodyA, this.core.body)
      const coreIsBodyB = isSameBody(pair.bodyB, this.core.body)

      if (!coreIsBodyA && !coreIsBodyB) {
        continue
      }

      const wallBody = coreIsBodyA ? pair.bodyB : pair.bodyA
      const wall = parseWallLabel(wallBody.label)

      if (!wall) {
        continue
      }

      const contact = pair.contacts[0]
      this.pendingImpacts.push({
        ...wall,
        point: contact
          ? { x: contact.x, y: contact.y }
          : this.core.position,
        incomingVelocity: { ...this.lastVelocity },
      })
    }
  }

  private applyWallBounce(impact: PendingWallImpact): void {
    const inward = getWallInwardNormal(impact.side)
    const current = this.core.velocity
    const incomingNormalSpeed = Math.max(
      0,
      -dot(impact.incomingVelocity, inward),
    )
    const currentNormalSpeed = dot(current, inward)
    const impactSpeed = Math.max(
      incomingNormalSpeed,
      Math.abs(currentNormalSpeed),
    )

    if (impactSpeed < 0.15) {
      return
    }

    const tangent = {
      x: current.x - inward.x * currentNormalSpeed,
      y: current.y - inward.y * currentNormalSpeed,
    }
    const reboundSpeed = Math.max(
      wallConfig.minWallBounceSpeed,
      impactSpeed * wallConfig.coreWallBounceMultiplier,
    )
    const velocity = clampMagnitude(
      {
        x: tangent.x + inward.x * reboundSpeed,
        y: tangent.y + inward.y * reboundSpeed,
      },
      wallConfig.maxWallBounceSpeed,
    )

    this.core.setVelocity(velocity)
    this.lastCollision = `${
      impact.safety ? 'SAFETY ' : ''
    }${impact.side.toUpperCase()} ${impactSpeed.toFixed(2)}`

    if (impact.safety) {
      this.safetyBounceMsRemaining = 650
    } else if (wallConfig.bankShotTrackingEnabled) {
      this.bankShotMsRemaining = wallConfig.bankShotWindowMs
    }

    if (
      wallConfig.wallImpactVfxEnabled &&
      impactSpeed >= wallConfig.wallImpactVfxMinSpeed
    ) {
      this.effects.push({
        point: impact.point,
        side: impact.side,
        speed: impactSpeed,
        remainingMs: 220,
      })
    }
  }

  private applySafetyBounce(): void {
    if (
      !wallConfig.coreSafetyBounceEnabled ||
      !isOutsideArena(this.core.position)
    ) {
      return
    }

    const position = this.core.position
    const bounds = getArenaBounds()
    const velocity = this.core.velocity
    const nextVelocity = { ...velocity }

    if (position.x < bounds.left) {
      nextVelocity.x = Math.max(
        Math.abs(velocity.x) * wallConfig.coreWallBounceMultiplier,
        wallConfig.coreSafetyBounceImpulse,
      )
    } else if (position.x > bounds.right) {
      nextVelocity.x = -Math.max(
        Math.abs(velocity.x) * wallConfig.coreWallBounceMultiplier,
        wallConfig.coreSafetyBounceImpulse,
      )
    }

    if (position.y < bounds.top) {
      nextVelocity.y = Math.max(
        Math.abs(velocity.y) * wallConfig.coreWallBounceMultiplier,
        wallConfig.coreSafetyBounceImpulse,
      )
    } else if (position.y > bounds.bottom) {
      nextVelocity.y = -Math.max(
        Math.abs(velocity.y) * wallConfig.coreWallBounceMultiplier,
        wallConfig.coreSafetyBounceImpulse,
      )
    }

    this.core.setPosition(
      clampPointInsideArena(position, coreConfig.radius + 2),
    )
    this.core.setVelocity(
      clampMagnitude(nextVelocity, wallConfig.maxWallBounceSpeed),
    )
    this.safetyBounceMsRemaining = 650
    this.lastCollision = 'SAFETY BOUNCE'
  }

  private updateEffects(deltaMs: number): void {
    this.effects = this.effects
      .map((effect) => ({
        ...effect,
        remainingMs: effect.remainingMs - deltaMs,
      }))
      .filter((effect) => effect.remainingMs > 0)
    this.graphics.clear()

    for (const effect of this.effects) {
      const progress = 1 - effect.remainingMs / 220
      const alpha = (1 - progress) * 0.72
      const radius = 8 + progress * 22
      const inward = getWallInwardNormal(effect.side)

      this.graphics.lineStyle(3, 0xf8ffff, alpha)
      this.graphics.strokeCircle(effect.point.x, effect.point.y, radius)
      this.graphics.lineStyle(2, 0x7ae5ff, alpha * 0.8)
      this.graphics.lineBetween(
        effect.point.x,
        effect.point.y,
        effect.point.x + inward.x * (12 + effect.speed),
        effect.point.y + inward.y * (12 + effect.speed),
      )
    }
  }
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

function clampMagnitude(vector: Point, maximum: number): Point {
  const magnitude = Math.hypot(vector.x, vector.y)

  if (magnitude <= maximum || magnitude === 0) {
    return vector
  }

  const scale = maximum / magnitude

  return {
    x: vector.x * scale,
    y: vector.y * scale,
  }
}
