import Phaser from 'phaser'
import { keeperConfig } from '../config/keeperConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'

export type KeeperClearSafetyResult = {
  direction: Point
  corrected: boolean
  awayDot: number
}

export class KeeperClearSafetySystem {
  private readonly lastResults = new Map<TeamSide, KeeperClearSafetyResult>()

  sanitize(direction: Point, side: TeamSide): KeeperClearSafetyResult {
    const result = sanitizeKeeperClearDirection(direction, side)
    this.lastResults.set(side, result)
    return result
  }

  getLastResult(side: TeamSide): KeeperClearSafetyResult | null {
    const result = this.lastResults.get(side)

    return result
      ? {
          ...result,
          direction: { ...result.direction },
        }
      : null
  }

  reset(): void {
    this.lastResults.clear()
  }
}

export function isDirectionTowardOwnGoal(
  direction: Point,
  side: TeamSide,
): boolean {
  const away = getKeeperHomeDirection(side)
  const candidate = normalized(direction, away)

  return dot(candidate, away) < keeperConfig.keeperClearMinAwayDot
}

export function sanitizeKeeperClearDirection(
  direction: Point,
  side: TeamSide,
): KeeperClearSafetyResult {
  const away = getKeeperHomeDirection(side)
  const candidate = normalized(direction, away)
  const awayDot = dot(candidate, away)

  if (
    !keeperConfig.keeperOwnGoalPreventionEnabled ||
    awayDot >= keeperConfig.keeperClearMinAwayDot
  ) {
    return {
      direction: candidate,
      corrected: false,
      awayDot,
    }
  }

  const lateral = {
    x: candidate.x - away.x * awayDot,
    y: candidate.y - away.y * awayDot,
  }
  const lateralLength = Math.hypot(lateral.x, lateral.y)
  const lateralDirection =
    lateralLength === 0
      ? { x: side === 'A' ? 1 : -1, y: 0 }
      : {
          x: lateral.x / lateralLength,
          y: lateral.y / lateralLength,
        }
  const lateralStrength = Phaser.Math.Clamp(
    lateralLength,
    0,
    keeperConfig.keeperClearLateralVariance,
  )
  const centerBias = Math.max(
    keeperConfig.keeperClearMinAwayDot,
    keeperConfig.keeperClearTowardCenterBias,
  )
  const safeDirection = normalized(
    {
      x:
        away.x * centerBias +
        lateralDirection.x * lateralStrength,
      y:
        away.y * centerBias +
        lateralDirection.y * lateralStrength,
    },
    away,
  )

  return {
    direction: safeDirection,
    corrected: true,
    awayDot,
  }
}

function normalized(vector: Point, fallback: Point): Point {
  const length = Math.hypot(vector.x, vector.y)

  return length === 0
    ? { ...fallback }
    : { x: vector.x / length, y: vector.y / length }
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
