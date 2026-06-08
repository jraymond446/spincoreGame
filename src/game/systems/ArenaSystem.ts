import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Player } from '../entities/Player'
import { CourtRenderer } from '../rendering/CourtRenderer'

export class ArenaSystem {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.createWalls()
    new CourtRenderer(scene)
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

}
