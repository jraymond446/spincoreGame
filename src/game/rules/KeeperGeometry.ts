import Phaser from 'phaser'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { getKeeperTargetRatio } from '../config/keeperConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Point } from '../data/geometry'
import type { PlayerPlayStyle, TeamSide } from '../data/matchTypes'

export type KeeperLegalRadii = {
  inner: number
  outer: number
  width: number
}

export function getKeeperLegalRadii(): KeeperLegalRadii {
  const inner =
    keeperAreaConfig.innerNoBodyRadius +
    playerRuntimeConfig.radius +
    keeperAreaConfig.keeperZoneBoundaryBuffer
  const outer =
    keeperAreaConfig.keeperZoneRadius -
    playerRuntimeConfig.radius -
    keeperAreaConfig.keeperZoneBoundaryBuffer

  return {
    inner,
    outer: Math.max(inner + 1, outer),
    width: Math.max(1, outer - inner),
  }
}

export function getKeeperStyleRadius(style: PlayerPlayStyle): number {
  const legal = getKeeperLegalRadii()

  return Phaser.Math.Linear(
    legal.inner,
    legal.outer,
    Phaser.Math.Clamp(getKeeperTargetRatio(style), 0, 1),
  )
}

export function getKeeperHomeDirection(side: TeamSide): Point {
  return {
    x: 0,
    y: side === 'A' ? -1 : 1,
  }
}

export function clampPointToKeeperDonut(
  point: Point,
  side: TeamSide,
  fallback = getKeeperHomeDirection(side),
): Point {
  const center = keeperAreaConfig.areas[side]
  const legal = getKeeperLegalRadii()
  const offset = {
    x: point.x - center.x,
    y: point.y - center.y,
  }
  const length = Math.hypot(offset.x, offset.y)
  const direction =
    length === 0
      ? fallback
      : {
          x: offset.x / length,
          y: offset.y / length,
        }
  const radius = Phaser.Math.Clamp(length, legal.inner, legal.outer)

  return {
    x: center.x + direction.x * radius,
    y: center.y + direction.y * radius,
  }
}
