import Phaser from 'phaser'
import type { ArenaLayout } from '../arena/ArenaLayout'
import { arenaConfig } from '../config/arenaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { wallConfig } from '../config/wallConfig'
import type { Player } from '../entities/Player'
import { isValidVector } from '../utils/vectorSafety'

export class ArenaSystem {
  private scene: Phaser.Scene
  private readonly layout: ArenaLayout

  constructor(
    scene: Phaser.Scene,
    layout: ArenaLayout,
  ) {
    this.scene = scene
    this.layout = layout

    this.createWalls()
  }

  containPlayers(players: Player[]): void {
    const inset = playerRuntimeConfig.radius + arenaConfig.playerContainmentPadding
    const left = this.layout.court.x + inset
    const right = this.layout.court.x + this.layout.court.width - inset
    const top = this.layout.court.y + inset
    const bottom = this.layout.court.y + this.layout.court.height - inset

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
    for (const wall of this.layout.boundaryWalls) {
      this.scene.matter.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        this.getWallOptions(wall.side),
      )
    }

    this.createSafetyWalls(
      this.layout.court.width / 2,
      this.layout.court.height / 2,
    )
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
