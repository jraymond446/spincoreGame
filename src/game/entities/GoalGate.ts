import Phaser from 'phaser'
import {
  goalConfig,
  type GoalGateConfig,
} from '../config/goalConfig'
import { coreConfig } from '../config/entityConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { arenaLayers } from '../arena/ArenaLayers'

export class GoalGate {
  readonly id: string
  readonly planeStart: Point
  readonly planeEnd: Point
  readonly scoringPlaneStart: Point
  readonly scoringPlaneEnd: Point
  readonly normal: Point
  readonly postBodies: MatterJS.BodyType[]
  readonly defendingTeam: TeamSide
  readonly scoringTeam: TeamSide

  private config: GoalGateConfig
  private graphics: Phaser.GameObjects.Graphics
  private flashAmount = 0
  private flashDurationMs = 280

  constructor(scene: Phaser.Scene, config: GoalGateConfig) {
    this.config = config
    this.id = config.id
    this.defendingTeam = config.defendingTeam
    this.scoringTeam = config.scoringTeam
    this.graphics = scene.add
      .graphics()
      .setDepth(arenaLayers.gameplayStructures)
    this.planeStart =
      config.orientation === 'horizontal'
        ? {
            x: config.x - config.length / 2,
            y: config.y,
          }
        : {
            x: config.x,
            y: config.y - config.length / 2,
          }
    this.planeEnd =
      config.orientation === 'horizontal'
        ? {
            x: config.x + config.length / 2,
            y: config.y,
          }
        : {
            x: config.x,
            y: config.y + config.length / 2,
          }
    const scoringInset = Math.max(
      0,
      goalConfig.goalPostRadius + coreConfig.radius,
    )
    this.scoringPlaneStart =
      config.orientation === 'horizontal'
        ? {
            x: this.planeStart.x + scoringInset,
            y: this.planeStart.y,
          }
        : {
            x: this.planeStart.x,
            y: this.planeStart.y + scoringInset,
          }
    this.scoringPlaneEnd =
      config.orientation === 'horizontal'
        ? {
            x: this.planeEnd.x - scoringInset,
            y: this.planeEnd.y,
          }
        : {
            x: this.planeEnd.x,
            y: this.planeEnd.y - scoringInset,
          }
    this.normal =
      config.orientation === 'horizontal'
        ? {
            x: 0,
            y: 1,
          }
        : {
            x: 1,
            y: 0,
          }

    this.postBodies = [
      this.createPostBody(scene, this.planeStart, 'start'),
      this.createPostBody(scene, this.planeEnd, 'end'),
    ]
    this.draw()
  }

  update(delta: number): void {
    if (this.flashAmount <= 0) {
      return
    }

    this.flashAmount = Math.max(
      0,
      this.flashAmount - delta / this.flashDurationMs,
    )
    this.draw()
  }

  flash(durationMs = 280): void {
    this.flashAmount = 1
    this.flashDurationMs = Math.max(1, durationMs)
    this.draw()
  }

  private draw(): void {
    const config = this.config
    const accentColor =
      config.id === 'top-goal'
        ? visualStyleConfig.goal.topAccent
        : visualStyleConfig.goal.bottomAccent
    const planeColor = this.flashAmount > 0 ? config.flashColor : accentColor
    const postColor = this.flashAmount > 0 ? config.flashColor : config.postColor
    const alpha = 0.68 + this.flashAmount * 0.32
    const left = Math.min(this.planeStart.x, this.planeEnd.x)
    const right = Math.max(this.planeStart.x, this.planeEnd.x)
    const width = right - left

    this.graphics.clear()
    this.drawSuspendedShadow()

    this.graphics.fillStyle(visualStyleConfig.outline, 0.9)
    this.graphics.fillRect(left - 12, config.y + 2, width + 24, 18)
    this.graphics.fillStyle(visualStyleConfig.goal.metalShade, 0.98)
    this.graphics.fillRect(left - 8, config.y + 6, width + 16, 11)
    this.graphics.fillStyle(visualStyleConfig.goal.metal, 0.96)
    this.graphics.fillRect(left - 6, config.y + 5, width + 12, 5)

    this.graphics.fillStyle(visualStyleConfig.outline, 0.94)
    this.graphics.fillRect(left - 9, config.y - 9, width + 18, 17)
    this.graphics.fillStyle(planeColor, alpha)
    this.graphics.fillRect(left - 5, config.y - 5, width + 10, 9)
    this.graphics.fillStyle(visualStyleConfig.goal.energy, alpha * 0.94)
    this.graphics.fillRect(
      this.scoringPlaneStart.x,
      this.scoringPlaneStart.y - 2,
      this.scoringPlaneEnd.x - this.scoringPlaneStart.x,
      3,
    )
    this.graphics.fillStyle(visualStyleConfig.goal.energy, alpha * 0.42)
    this.graphics.fillRect(left + 9, config.y - 12, width - 18, 3)
    this.graphics.fillRect(left + 9, config.y + 7, width - 18, 3)

    this.drawPostHead(this.planeStart, postColor, accentColor)
    this.drawPostHead(this.planeEnd, postColor, accentColor)

    this.graphics.fillStyle(visualStyleConfig.outline, 0.86)
    this.graphics.fillRect(config.x - 24, config.y - 15, 48, 22)
    this.graphics.fillStyle(visualStyleConfig.goal.metal, 0.96)
    this.graphics.fillRect(config.x - 19, config.y - 11, 38, 14)
    this.graphics.fillStyle(accentColor, 0.92)
    this.graphics.fillRect(config.x - 12, config.y - 8, 24, 4)
  }

  private drawSuspendedShadow(): void {
    const width = Math.abs(this.planeEnd.x - this.planeStart.x) + 34
    const centerX = (this.planeStart.x + this.planeEnd.x) * 0.5
    const centerY = (this.planeStart.y + this.planeEnd.y) * 0.5

    this.graphics.fillStyle(visualStyleConfig.goal.shadow, 0.16)
    this.graphics.fillRect(centerX - width / 2, centerY + 17, width, 15)
    this.graphics.fillStyle(visualStyleConfig.goal.shadow, 0.08)
    this.graphics.fillRect(
      centerX - width / 2 + 12,
      centerY + 32,
      width - 24,
      6,
    )
  }

  private drawPostHead(
    position: Point,
    postColor: number,
    accentColor: number,
  ): void {
    const radius = goalConfig.goalPostRadius

    this.graphics.fillStyle(visualStyleConfig.goal.shadow, 0.2)
    this.graphics.fillRect(
      position.x - radius - 8,
      position.y + radius + 8,
      radius * 2 + 16,
      8,
    )
    this.graphics.fillStyle(visualStyleConfig.outline, 0.96)
    this.graphics.fillRect(
      position.x - radius - 7,
      position.y - radius - 1,
      radius * 2 + 14,
      radius * 2 + 14,
    )
    this.graphics.fillStyle(visualStyleConfig.goal.metalShade, 1)
    this.graphics.fillRect(
      position.x - radius - 3,
      position.y - radius + 3,
      radius * 2 + 6,
      radius * 2 + 7,
    )
    this.graphics.fillStyle(postColor, 1)
    this.graphics.fillRect(
      position.x - radius,
      position.y - radius,
      radius * 2,
      radius * 2,
    )
    this.graphics.fillStyle(accentColor, 0.96)
    this.graphics.fillRect(
      position.x - radius + 3,
      position.y - radius + 3,
      radius * 2 - 6,
      4,
    )
    this.graphics.fillStyle(visualStyleConfig.goal.metal, 0.92)
    this.graphics.fillRect(
      position.x - radius + 3,
      position.y - radius + 8,
      5,
      5,
    )
  }

  private createPostBody(
    scene: Phaser.Scene,
    position: Point,
    suffix: string,
  ): MatterJS.BodyType {
    return scene.matter.add.circle(
      position.x,
      position.y,
      goalConfig.goalPostRadius,
      {
        isStatic: true,
        label: `goal-post:${this.id}:${suffix}`,
        restitution: goalConfig.goalPostRestitution,
        friction: goalConfig.goalPostFriction,
        frictionStatic: goalConfig.goalPostFriction,
      },
    )
  }
}
