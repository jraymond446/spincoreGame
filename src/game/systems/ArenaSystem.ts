import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Player } from '../entities/Player'

export class ArenaSystem {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-10)

    this.createWalls()
    this.drawFloor()
  }

  containPlayers(players: Player[]): void {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const inset = playerRuntimeConfig.radius + arenaConfig.playerContainmentPadding
    const left = arenaConfig.center.x - halfWidth + inset
    const right = arenaConfig.center.x + halfWidth - inset
    const top = arenaConfig.center.y - halfHeight + inset
    const bottom = arenaConfig.center.y + halfHeight - inset

    for (const player of players) {
      const position = player.position
      const clampedX = Phaser.Math.Clamp(position.x, left, right)
      const clampedY = Phaser.Math.Clamp(position.y, top, bottom)

      if (clampedX === position.x && clampedY === position.y) {
        continue
      }

      this.scene.matter.body.setPosition(player.body, {
        x: clampedX,
        y: clampedY,
      })
      this.scene.matter.body.setVelocity(player.body, {
        x:
          (position.x < left && player.velocity.x < 0) ||
          (position.x > right && player.velocity.x > 0)
            ? 0
            : player.velocity.x,
        y:
          (position.y < top && player.velocity.y < 0) ||
          (position.y > bottom && player.velocity.y > 0)
            ? 0
            : player.velocity.y,
      })
      player.updateVisuals()
    }
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

    this.scene.matter.add.rectangle(
      center.x,
      center.y - halfHeight - wall / 2,
      arenaConfig.width,
      wall,
      wallOptions,
    )
    this.scene.matter.add.rectangle(
      center.x,
      center.y + halfHeight + wall / 2,
      arenaConfig.width,
      wall,
      wallOptions,
    )
    this.scene.matter.add.rectangle(
      center.x - halfWidth - wall / 2,
      center.y,
      wall,
      arenaConfig.height + wall * 2,
      wallOptions,
    )
    this.scene.matter.add.rectangle(
      center.x + halfWidth + wall / 2,
      center.y,
      wall,
      arenaConfig.height + wall * 2,
      wallOptions,
    )

    this.createSafetyWalls(halfWidth, halfHeight)
  }

  private createSafetyWalls(halfWidth: number, halfHeight: number): void {
    const center = arenaConfig.center
    const offset = arenaConfig.safetyBoundsOffset
    const thickness = arenaConfig.safetyWallThickness
    const width = arenaConfig.width + offset * 2 + thickness * 2
    const height = arenaConfig.height + offset * 2 + thickness * 2
    const options = {
      isStatic: true,
      label: 'arena-safety-wall',
      restitution: 0.45,
      friction: 0,
    }

    this.scene.matter.add.rectangle(
      center.x,
      center.y - halfHeight - offset - thickness / 2,
      width,
      thickness,
      options,
    )
    this.scene.matter.add.rectangle(
      center.x,
      center.y + halfHeight + offset + thickness / 2,
      width,
      thickness,
      options,
    )
    this.scene.matter.add.rectangle(
      center.x - halfWidth - offset - thickness / 2,
      center.y,
      thickness,
      height,
      options,
    )
    this.scene.matter.add.rectangle(
      center.x + halfWidth + offset + thickness / 2,
      center.y,
      thickness,
      height,
      options,
    )
  }

  private drawFloor(): void {
    const x = arenaConfig.center.x - arenaConfig.width / 2
    const y = arenaConfig.center.y - arenaConfig.height / 2
    const inset = arenaConfig.courtInset
    const innerX = x + inset
    const innerY = y + inset
    const innerWidth = arenaConfig.width - inset * 2
    const innerHeight = arenaConfig.height - inset * 2
    const centerY = arenaConfig.center.y
    const topServiceY = y + arenaConfig.serviceLineDepth
    const bottomServiceY =
      y + arenaConfig.height - arenaConfig.serviceLineDepth

    this.graphics.clear()
    this.graphics.fillStyle(arenaConfig.outerSurfaceColor, 1)
    this.graphics.fillRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.fillStyle(arenaConfig.floorColor, 1)
    this.graphics.fillRoundedRect(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      Math.max(6, arenaConfig.cornerRadius - 6),
    )

    this.graphics.fillStyle(arenaConfig.floorAccentColor, 0.34)
    this.graphics.fillRect(
      innerX,
      topServiceY,
      innerWidth,
      bottomServiceY - topServiceY,
    )

    this.graphics.lineStyle(4, arenaConfig.wallStrokeColor, 0.92)
    this.graphics.strokeRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.lineStyle(4, arenaConfig.boundaryLineColor, 0.88)
    this.graphics.strokeRoundedRect(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      Math.max(6, arenaConfig.cornerRadius - 6),
    )

    this.graphics.lineStyle(3, arenaConfig.boundaryLineColor, 0.78)
    this.graphics.lineBetween(innerX, centerY, innerX + innerWidth, centerY)
    this.graphics.strokeCircle(
      arenaConfig.center.x,
      centerY,
      arenaConfig.centerCircleRadius,
    )

    this.graphics.lineStyle(2, arenaConfig.secondaryLineColor, 0.62)
    this.graphics.lineBetween(
      innerX,
      topServiceY,
      innerX + innerWidth,
      topServiceY,
    )
    this.graphics.lineBetween(
      innerX,
      bottomServiceY,
      innerX + innerWidth,
      bottomServiceY,
    )
    this.graphics.lineBetween(
      arenaConfig.center.x,
      innerY,
      arenaConfig.center.x,
      topServiceY,
    )
    this.graphics.lineBetween(
      arenaConfig.center.x,
      bottomServiceY,
      arenaConfig.center.x,
      innerY + innerHeight,
    )

    this.graphics.fillStyle(arenaConfig.boundaryLineColor, 0.9)
    this.graphics.fillCircle(
      arenaConfig.center.x,
      centerY,
      arenaConfig.faceoffMarkRadius,
    )
    this.graphics.fillCircle(
      arenaConfig.center.x,
      topServiceY,
      arenaConfig.faceoffMarkRadius * 0.62,
    )
    this.graphics.fillCircle(
      arenaConfig.center.x,
      bottomServiceY,
      arenaConfig.faceoffMarkRadius * 0.62,
    )
  }
}
