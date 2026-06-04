import Phaser from 'phaser'
import { goalConfig } from '../config/goalConfig'
import type { Point } from '../data/geometry'

export class GoalGate {
  readonly id = goalConfig.id
  readonly planeStart: Point
  readonly planeEnd: Point

  private graphics: Phaser.GameObjects.Graphics
  private flashAmount = 0

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics()
    this.planeStart = {
      x: goalConfig.x,
      y: goalConfig.y - goalConfig.height / 2,
    }
    this.planeEnd = {
      x: goalConfig.x,
      y: goalConfig.y + goalConfig.height / 2,
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
    const planeColor = this.flashAmount > 0 ? goalConfig.flashColor : goalConfig.planeColor
    const postColor = this.flashAmount > 0 ? goalConfig.flashColor : goalConfig.postColor
    const alpha = 0.68 + this.flashAmount * 0.32

    this.graphics.clear()
    this.graphics.lineStyle(3, planeColor, alpha)

    for (let y = this.planeStart.y; y < this.planeEnd.y; y += 22) {
      this.graphics.lineBetween(goalConfig.x, y, goalConfig.x, Math.min(y + 12, this.planeEnd.y))
    }

    this.graphics.lineStyle(4, postColor, alpha)
    this.graphics.strokeCircle(this.planeStart.x, this.planeStart.y, goalConfig.postRadius)
    this.graphics.strokeCircle(this.planeEnd.x, this.planeEnd.y, goalConfig.postRadius)
    this.graphics.fillStyle(postColor, 0.3 + this.flashAmount * 0.35)
    this.graphics.fillCircle(this.planeStart.x, this.planeStart.y, goalConfig.postRadius - 2)
    this.graphics.fillCircle(this.planeEnd.x, this.planeEnd.y, goalConfig.postRadius - 2)

    this.drawChevron(goalConfig.x - 34, goalConfig.y, -1, alpha)
    this.drawChevron(goalConfig.x + 34, goalConfig.y, 1, alpha)
  }

  private drawChevron(x: number, y: number, direction: -1 | 1, alpha: number): void {
    const width = 18 * direction
    const height = 16

    this.graphics.lineStyle(3, goalConfig.planeColor, alpha * 0.85)
    this.graphics.beginPath()
    this.graphics.moveTo(x - width / 2, y - height)
    this.graphics.lineTo(x + width / 2, y)
    this.graphics.lineTo(x - width / 2, y + height)
    this.graphics.strokePath()
  }
}
