import Phaser from 'phaser'
import {
  goalConfig,
  type GoalGateConfig,
} from '../config/goalConfig'
import { coreConfig } from '../config/entityConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'

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
    this.graphics = scene.add.graphics()
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

    this.graphics.clear()
    this.drawSuspendedShadow()

    this.graphics.lineStyle(17, visualStyleConfig.outline, 0.84)
    this.graphics.lineBetween(
      this.planeStart.x,
      this.planeStart.y + 5,
      this.planeEnd.x,
      this.planeEnd.y + 5,
    )
    this.graphics.lineStyle(13, visualStyleConfig.goal.metalShade, 0.96)
    this.graphics.lineBetween(
      this.planeStart.x,
      this.planeStart.y + 5,
      this.planeEnd.x,
      this.planeEnd.y + 5,
    )
    this.graphics.lineStyle(15, visualStyleConfig.outline, 0.9)
    this.graphics.lineBetween(
      this.planeStart.x,
      this.planeStart.y - 3,
      this.planeEnd.x,
      this.planeEnd.y - 3,
    )
    this.graphics.lineStyle(10, planeColor, alpha)
    this.graphics.lineBetween(
      this.planeStart.x,
      this.planeStart.y - 3,
      this.planeEnd.x,
      this.planeEnd.y - 3,
    )
    this.graphics.lineStyle(3, visualStyleConfig.goal.energy, alpha * 0.94)
    this.graphics.lineBetween(
      this.scoringPlaneStart.x,
      this.scoringPlaneStart.y - 4,
      this.scoringPlaneEnd.x,
      this.scoringPlaneEnd.y - 4,
    )

    this.drawPostHead(this.planeStart, postColor, accentColor)
    this.drawPostHead(this.planeEnd, postColor, accentColor)

    this.graphics.fillStyle(visualStyleConfig.outline, 0.86)
    this.graphics.fillRoundedRect(config.x - 23, config.y - 12, 46, 18, 4)
    this.graphics.fillStyle(visualStyleConfig.goal.metal, 0.96)
    this.graphics.fillRoundedRect(config.x - 19, config.y - 10, 38, 12, 3)
    this.graphics.fillStyle(accentColor, 0.9)
    this.graphics.fillRect(config.x - 12, config.y - 8, 24, 3)
  }

  private drawSuspendedShadow(): void {
    const width = Math.abs(this.planeEnd.x - this.planeStart.x) + 34
    const centerX = (this.planeStart.x + this.planeEnd.x) * 0.5
    const centerY = (this.planeStart.y + this.planeEnd.y) * 0.5

    this.graphics.fillStyle(visualStyleConfig.goal.shadow, 0.16)
    this.graphics.fillEllipse(centerX, centerY + 18, width, 22)
  }

  private drawPostHead(
    position: Point,
    postColor: number,
    accentColor: number,
  ): void {
    const radius = goalConfig.goalPostRadius

    this.graphics.fillStyle(visualStyleConfig.goal.shadow, 0.2)
    this.graphics.fillEllipse(
      position.x,
      position.y + radius + 9,
      radius * 2.5,
      radius * 0.82,
    )
    this.graphics.fillStyle(visualStyleConfig.outline, 0.96)
    this.graphics.fillCircle(position.x, position.y + 3, radius + 7)
    this.graphics.fillStyle(visualStyleConfig.goal.metalShade, 1)
    this.graphics.fillCircle(position.x, position.y + 4, radius + 3)
    this.graphics.fillStyle(postColor, 1)
    this.graphics.fillCircle(position.x, position.y, radius - 1)
    this.graphics.lineStyle(4, accentColor, 0.96)
    this.graphics.strokeCircle(position.x, position.y, radius - 3)
    this.graphics.fillStyle(visualStyleConfig.goal.metal, 0.92)
    this.graphics.fillCircle(
      position.x - radius * 0.26,
      position.y - radius * 0.3,
      radius * 0.3,
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
