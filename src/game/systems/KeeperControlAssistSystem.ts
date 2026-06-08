import Phaser from 'phaser'
import { keeperConfig } from '../config/keeperConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'
import {
  getKeeperHomeDirection,
  getKeeperLegalRadii,
} from '../rules/KeeperGeometry'
import { keeperAreaConfig } from '../config/keeperAreaConfig'

export class KeeperControlAssistSystem {
  private bias: Point = { x: 0, y: 0 }

  update(
    controlledPlayer: Player,
    movement: Point,
    deltaMs: number,
  ): Point {
    const active =
      keeperConfig.keeperHumanBiasEnabled &&
      controlledPlayer.teamSide === 'A' &&
      controlledPlayer.role !== 'keeper'
    const outward = getKeeperHomeDirection('A')
    const depthInput =
      movement.x * outward.x + movement.y * outward.y
    const maximum =
      keeperConfig.keeperHumanBiasMaxOffset *
      keeperConfig.keeperHumanBiasStrength
    const target = active
      ? {
          x:
            movement.x *
            maximum *
            keeperConfig.keeperHumanLateralBiasStrength,
          y:
            outward.y *
            depthInput *
            maximum *
            keeperConfig.keeperHumanDepthBiasStrength,
        }
      : { x: 0, y: 0 }
    const smoothing =
      1 -
      Math.exp(
        -keeperConfig.keeperHumanBiasDecay *
          Math.max(0, deltaMs / 1000),
      )

    this.bias = {
      x: Phaser.Math.Linear(this.bias.x, target.x, smoothing),
      y: Phaser.Math.Linear(this.bias.y, target.y, smoothing),
    }

    return this.getBias()
  }

  getBias(): Point {
    return { ...this.bias }
  }

  getManualMovement(player: Player, input: Point): Phaser.Math.Vector2 {
    if (player.role !== 'keeper') {
      return new Phaser.Math.Vector2(input.x, input.y)
    }

    const center = keeperAreaConfig.areas[player.teamSide]
    const fallback = getKeeperHomeDirection(player.teamSide)
    const offset = {
      x: player.position.x - center.x,
      y: player.position.y - center.y,
    }
    const length = Math.hypot(offset.x, offset.y)
    const radial =
      length === 0
        ? fallback
        : { x: offset.x / length, y: offset.y / length }
    const tangent = { x: -radial.y, y: radial.x }
    const outward = getKeeperHomeDirection(player.teamSide)
    const depthInput = input.x * outward.x + input.y * outward.y
    const legal = getKeeperLegalRadii()
    const radialInput =
      (length <= legal.inner + 2 && depthInput < 0) ||
      (length >= legal.outer - 2 && depthInput > 0)
        ? 0
        : depthInput
    const result = new Phaser.Math.Vector2(
      tangent.x * input.x + radial.x * radialInput,
      tangent.y * input.x + radial.y * radialInput,
    )

    return result.lengthSq() > 1 ? result.normalize() : result
  }

  reset(): void {
    this.bias = { x: 0, y: 0 }
  }
}
