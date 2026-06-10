import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { wallConfig } from '../config/wallConfig'
import type { Player } from '../entities/Player'
import { CourtRenderer } from '../rendering/CourtRenderer'
import { isValidVector } from '../utils/vectorSafety'

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
      if (!isValidVector(position) || !isValidVector(player.velocity)) {
        player.recoverPhysicsState()
        continue
      }
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
    const wall = wallConfig.wallThickness
    const center = arenaConfig.center

    this.scene.matter.add.rectangle(
      center.x,
      center.y - halfHeight - wall / 2,
      arenaConfig.width,
      wall,
      this.getWallOptions('top'),
    )
    this.scene.matter.add.rectangle(
      center.x,
      center.y + halfHeight + wall / 2,
      arenaConfig.width,
      wall,
      this.getWallOptions('bottom'),
    )
    this.scene.matter.add.rectangle(
      center.x - halfWidth - wall / 2,
      center.y,
      wall,
      arenaConfig.height + wall * 2,
      this.getWallOptions('left'),
    )
    this.scene.matter.add.rectangle(
      center.x + halfWidth + wall / 2,
      center.y,
      wall,
      arenaConfig.height + wall * 2,
      this.getWallOptions('right'),
    )

    this.createSafetyWalls(halfWidth, halfHeight)
  }

  private createSafetyWalls(halfWidth: number, halfHeight: number): void {
    const center = arenaConfig.center
    const offset = arenaConfig.safetyBoundsOffset
    const thickness = arenaConfig.safetyWallThickness
    const width = arenaConfig.width + offset * 2 + thickness * 2
    const height = arenaConfig.height + offset * 2 + thickness * 2
    this.scene.matter.add.rectangle(
      center.x,
      center.y - halfHeight - offset - thickness / 2,
      width,
      thickness,
      this.getSafetyWallOptions('top'),
    )
    this.scene.matter.add.rectangle(
      center.x,
      center.y + halfHeight + offset + thickness / 2,
      width,
      thickness,
      this.getSafetyWallOptions('bottom'),
    )
    this.scene.matter.add.rectangle(
      center.x - halfWidth - offset - thickness / 2,
      center.y,
      thickness,
      height,
      this.getSafetyWallOptions('left'),
    )
    this.scene.matter.add.rectangle(
      center.x + halfWidth + offset + thickness / 2,
      center.y,
      thickness,
      height,
      this.getSafetyWallOptions('right'),
    )
  }

  private getWallOptions(side: WallSide): Phaser.Types.Physics.Matter.MatterBodyConfig {
    return {
      isStatic: true,
      label: `arena-wall:${side}`,
      restitution: wallConfig.wallRestitution,
      friction: wallConfig.wallFriction,
      frictionStatic: 0,
    }
  }

  private getSafetyWallOptions(
    side: WallSide,
  ): Phaser.Types.Physics.Matter.MatterBodyConfig {
    return {
      isStatic: true,
      label: `arena-safety-wall:${side}`,
      restitution: arenaConfig.safetyWallRestitution,
      friction: wallConfig.wallFriction,
      frictionStatic: 0,
    }
  }
}

type WallSide = 'top' | 'bottom' | 'left' | 'right'
