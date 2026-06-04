import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'

export class ArenaSystem {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics()

    this.createWalls()
    this.drawFloor()
  }

  private createWalls(): void {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const wall = arenaConfig.wallThickness
    const center = arenaConfig.center
    const wallOptions = {
      isStatic: true,
      label: 'arena-wall',
      restitution: 0.72,
      friction: 0,
    }

    this.scene.matter.add.rectangle(center.x, center.y - halfHeight - wall / 2, arenaConfig.width, wall, wallOptions)
    this.scene.matter.add.rectangle(center.x, center.y + halfHeight + wall / 2, arenaConfig.width, wall, wallOptions)
    this.scene.matter.add.rectangle(center.x - halfWidth - wall / 2, center.y, wall, arenaConfig.height + wall * 2, wallOptions)
    this.scene.matter.add.rectangle(center.x + halfWidth + wall / 2, center.y, wall, arenaConfig.height + wall * 2, wallOptions)
  }

  private drawFloor(): void {
    const x = arenaConfig.center.x - arenaConfig.width / 2
    const y = arenaConfig.center.y - arenaConfig.height / 2

    this.graphics.clear()
    this.graphics.fillStyle(arenaConfig.floorColor, 1)
    this.graphics.fillRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.lineStyle(3, arenaConfig.wallStrokeColor, 0.75)
    this.graphics.strokeRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.lineStyle(1, arenaConfig.stripeColor, 0.3)

    for (let offsetX = x + 70; offsetX < x + arenaConfig.width; offsetX += 70) {
      this.graphics.lineBetween(offsetX, y + 18, offsetX, y + arenaConfig.height - 18)
    }

    for (let offsetY = y + 60; offsetY < y + arenaConfig.height; offsetY += 60) {
      this.graphics.lineBetween(x + 18, offsetY, x + arenaConfig.width - 18, offsetY)
    }

    this.graphics.lineStyle(2, arenaConfig.stripeColor, 0.55)
    this.graphics.lineBetween(arenaConfig.center.x, y + 28, arenaConfig.center.x, y + arenaConfig.height - 28)
    this.graphics.strokeCircle(arenaConfig.center.x, arenaConfig.center.y, 70)
  }
}
