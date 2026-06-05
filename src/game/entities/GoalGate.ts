import Phaser from 'phaser'
import type { GoalGateConfig } from '../config/goalConfig'
import type { Point } from '../data/geometry'

export class GoalGate {
  readonly id: string
  readonly planeStart: Point
  readonly planeEnd: Point
  readonly normal: Point

  private config: GoalGateConfig
  private graphics: Phaser.GameObjects.Graphics
  private flashAmount = 0

  constructor(scene: Phaser.Scene, config: GoalGateConfig) {
    this.config = config
    this.id = config.id
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

    this.draw()
  }

  update(delta: number): void {
    if (this.flashAmount <= 0) {
      return
    }

    this.flashAmount = Math.max(0, this.flashAmount - delta / 280)
    this.draw()
  }

  flash(): void {
    this.flashAmount = 1
    this.draw()
  }

  private draw(): void {
    const config = this.config
    const planeColor = this.flashAmount > 0 ? config.flashColor : config.planeColor
    const postColor = this.flashAmount > 0 ? config.flashColor : config.postColor
    const alpha = 0.68 + this.flashAmount * 0.32

    this.graphics.clear()
    this.graphics.lineStyle(3, planeColor, alpha)

    if (config.orientation === 'horizontal') {
      for (let x = this.planeStart.x; x < this.planeEnd.x; x += 22) {
        this.graphics.lineBetween(x, config.y, Math.min(x + 12, this.planeEnd.x), config.y)
      }
    } else {
      for (let y = this.planeStart.y; y < this.planeEnd.y; y += 22) {
        this.graphics.lineBetween(config.x, y, config.x, Math.min(y + 12, this.planeEnd.y))
      }
    }

    this.graphics.lineStyle(4, postColor, alpha)
    this.graphics.strokeCircle(this.planeStart.x, this.planeStart.y, config.postRadius)
    this.graphics.strokeCircle(this.planeEnd.x, this.planeEnd.y, config.postRadius)
    this.graphics.fillStyle(postColor, 0.3 + this.flashAmount * 0.35)
    this.graphics.fillCircle(this.planeStart.x, this.planeStart.y, config.postRadius - 2)
    this.graphics.fillCircle(this.planeEnd.x, this.planeEnd.y, config.postRadius - 2)

    this.drawChevron(-1, alpha)
    this.drawChevron(1, alpha)
  }

  private drawChevron(direction: -1 | 1, alpha: number): void {
    const config = this.config
    const offset = 34 * direction

    this.graphics.lineStyle(3, config.planeColor, alpha * 0.85)
    this.graphics.beginPath()

    if (config.orientation === 'horizontal') {
      const y = config.y + offset
      const height = 18 * direction
      const width = 16

      this.graphics.moveTo(config.x - width, y - height / 2)
      this.graphics.lineTo(config.x, y + height / 2)
      this.graphics.lineTo(config.x + width, y - height / 2)
    } else {
      const x = config.x + offset
      const width = 18 * direction
      const height = 16

      this.graphics.moveTo(x - width / 2, config.y - height)
      this.graphics.lineTo(x + width / 2, config.y)
      this.graphics.lineTo(x - width / 2, config.y + height)
    }

    this.graphics.strokePath()
  }
}
