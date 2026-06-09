import { keeperConfig } from '../config/keeperConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'
import {
  ClearSafetySystem,
  sanitizeClearDirection,
  type ClearSafetyResult,
} from './ClearSafetySystem'

export type KeeperClearSafetyResult = ClearSafetyResult

export class KeeperClearSafetySystem extends ClearSafetySystem {}

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
  origin?: Point,
): KeeperClearSafetyResult {
  return sanitizeClearDirection(direction, side, origin)
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
