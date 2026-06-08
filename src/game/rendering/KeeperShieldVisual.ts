import Phaser from 'phaser'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import { teamVisualPalettes } from '../data/visualPalettes'
import type {
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { DefensiveVisualState } from './AnimationState'

type Point = { x: number; y: number }

export class KeeperShieldVisual {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly teamSide: TeamSide

  constructor(scene: Phaser.Scene, teamSide: TeamSide) {
    this.teamSide = teamSide
    this.graphics = scene.add.graphics().setDepth(5)
  }

  update(
    mountPoint: Point,
    forward: Point,
    state: StickActionState,
    defenseState: DefensiveVisualState,
  ): void {
    const palette = teamVisualPalettes[this.teamSide]
    const right = { x: -forward.y, y: forward.x }
    const blocking =
      state === 'SWINGING' ||
      defenseState === 'SLASH_ACTIVE' ||
      defenseState === 'SLASH_STARTUP'
    const pulse = blocking
      ? keeperShieldConfig.visual.blockPulseDistance
      : 0
    const center = {
      x:
        mountPoint.x +
        forward.x *
          (keeperShieldConfig.keeperShieldDepth * 0.35 + pulse),
      y:
        mountPoint.y +
        forward.y *
          (keeperShieldConfig.keeperShieldDepth * 0.35 + pulse),
    }
    const halfWidth = keeperShieldConfig.keeperShieldWidth / 2
    const halfDepth = keeperShieldConfig.keeperShieldDepth / 2
    const corners = [
      offset(center, forward, halfDepth, right, -halfWidth * 0.72),
      offset(center, forward, halfDepth, right, halfWidth * 0.72),
      offset(center, forward, 0, right, halfWidth),
      offset(center, forward, -halfDepth, right, halfWidth * 0.8),
      offset(center, forward, -halfDepth, right, -halfWidth * 0.8),
      offset(center, forward, 0, right, -halfWidth),
    ]

    this.graphics.clear()
    this.graphics.fillStyle(
      palette.shirt,
      keeperShieldConfig.visual.fillAlpha,
    )
    this.graphics.lineStyle(
      keeperShieldConfig.visual.outlineWidth,
      keeperShieldConfig.visual.outlineColor,
      keeperShieldConfig.visual.outlineAlpha,
    )
    drawPolygon(this.graphics, corners)
    this.graphics.fillPath()
    this.graphics.strokePath()

    const faceStart = offset(
      center,
      forward,
      halfDepth * 0.45,
      right,
      -halfWidth * 0.58,
    )
    const faceEnd = offset(
      center,
      forward,
      halfDepth * 0.45,
      right,
      halfWidth * 0.58,
    )
    this.graphics.lineStyle(
      5,
      palette.trim,
      keeperShieldConfig.visual.faceHighlightAlpha,
    )
    this.graphics.lineBetween(
      faceStart.x,
      faceStart.y,
      faceEnd.x,
      faceEnd.y,
    )
    this.graphics.fillStyle(palette.trim, 0.92)
    this.graphics.fillCircle(
      center.x - forward.x * halfDepth * 0.35,
      center.y - forward.y * halfDepth * 0.35,
      5,
    )
  }

  destroy(): void {
    this.graphics.destroy()
  }
}

function offset(
  origin: Point,
  forward: Point,
  forwardAmount: number,
  right: Point,
  rightAmount: number,
): Point {
  return {
    x: origin.x + forward.x * forwardAmount + right.x * rightAmount,
    y: origin.y + forward.y * forwardAmount + right.y * rightAmount,
  }
}

function drawPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
): void {
  graphics.beginPath()
  graphics.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y))
  graphics.closePath()
}
