import Phaser from 'phaser'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { goalConfigs } from '../config/goalConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'

export type ClearSafetyReason =
  | 'safe'
  | 'dangerCone'
  | 'ownGoalPlane'
  | 'nearGoalDeflection'

export type ClearSafetyResult = {
  direction: Point
  rawDirection: Point
  safeClearDirection: Point
  originalClearDirection: Point
  corrected: boolean
  clearSanitized: boolean
  ownGoalDangerDetected: boolean
  awayDot: number
  pathIntersectsOwnGoal: boolean
  reason: ClearSafetyReason
}

export class ClearSafetySystem {
  private readonly lastResults = new Map<TeamSide, ClearSafetyResult>()

  sanitize(
    direction: Point,
    side: TeamSide,
    origin?: Point,
    options?: {
      awayBias?: number
      reason?: ClearSafetyReason
    },
  ): ClearSafetyResult {
    const result = sanitizeClearDirection(
      direction,
      side,
      origin,
      options,
    )
    this.lastResults.set(side, result)
    return result
  }

  getLastResult(side: TeamSide): ClearSafetyResult | null {
    const result = this.lastResults.get(side)

    return result
      ? {
          ...result,
          direction: { ...result.direction },
          rawDirection: { ...result.rawDirection },
          safeClearDirection: { ...result.safeClearDirection },
          originalClearDirection: { ...result.originalClearDirection },
        }
      : null
  }

  reset(): void {
    this.lastResults.clear()
  }
}

export function sanitizeClearDirection(
  direction: Point,
  side: TeamSide,
  origin?: Point,
  options?: {
    awayBias?: number
    reason?: ClearSafetyReason
  },
): ClearSafetyResult {
  const away = getKeeperHomeDirection(side)
  const candidate = normalized(direction, away)
  const awayDot = dot(candidate, away)
  const pathIntersectsOwnGoal =
    Boolean(origin) &&
    clearSafetyConfig.ownGoalClearPathCheckEnabled &&
    intersectsOwnGoalPlane(origin!, candidate, side)
  const dangerAngle = Math.acos(
    Phaser.Math.Clamp(dot(candidate, away), -1, 1),
  )
  const inDangerCone =
    dangerAngle >
      Math.PI - clearSafetyConfig.ownGoalDangerConeRadians ||
    awayDot < clearSafetyConfig.ownGoalClearMinAwayDot
  const needsCorrection =
    clearSafetyConfig.ownGoalPreventionEnabled &&
    (inDangerCone ||
      (clearSafetyConfig.blockClearIntoOwnGoalHard &&
        pathIntersectsOwnGoal))

  if (!needsCorrection) {
    return {
      direction: candidate,
      rawDirection: candidate,
      safeClearDirection: candidate,
      originalClearDirection: candidate,
      corrected: false,
      clearSanitized: false,
      ownGoalDangerDetected: inDangerCone || pathIntersectsOwnGoal,
      awayDot,
      pathIntersectsOwnGoal,
      reason: 'safe',
    }
  }

  const goal = getOwnGoal(side)
  const source = origin ?? goal
  const sideSign = source.x < goal.x ? -1 : 1
  const lateral = { x: sideSign, y: 0 }
  const awayBias = Phaser.Math.Clamp(
    options?.awayBias ?? clearSafetyConfig.safeClearMidfieldBias,
    0,
    1,
  )
  const variance =
    stableSignedNoise(source.x + source.y + (side === 'A' ? 17 : 41)) *
    clearSafetyConfig.safeClearRandomVariance
  const safeDirection = normalized(
    {
      x:
        lateral.x * clearSafetyConfig.safeClearSideBias +
        variance,
      y: away.y * Math.max(
        awayBias,
        clearSafetyConfig.ownGoalClearMinAwayDot,
      ),
    },
    away,
  )

  return {
    direction: safeDirection,
    rawDirection: candidate,
    safeClearDirection: safeDirection,
    originalClearDirection: candidate,
    corrected: true,
    clearSanitized: true,
    ownGoalDangerDetected: true,
    awayDot,
    pathIntersectsOwnGoal,
    reason:
      options?.reason ??
      (pathIntersectsOwnGoal ? 'ownGoalPlane' : 'dangerCone'),
  }
}

export function isNearOwnGoal(
  point: Point,
  side: TeamSide,
): boolean {
  const goal = getOwnGoal(side)

  return (
    Math.hypot(point.x - goal.x, point.y - goal.y) <=
    clearSafetyConfig.nearOwnGoalSafetyRadius
  )
}

function intersectsOwnGoalPlane(
  origin: Point,
  direction: Point,
  side: TeamSide,
): boolean {
  const goal = getOwnGoal(side)

  if (Math.abs(direction.y) < 0.001) {
    return false
  }

  const travel = (goal.y - origin.y) / direction.y

  if (travel <= 0) {
    return false
  }

  const crossingX = origin.x + direction.x * travel
  const tolerance = 4

  return (
    Math.abs(crossingX - goal.x) <=
    goal.length / 2 + tolerance
  )
}

function getOwnGoal(side: TeamSide) {
  const id = side === 'A' ? 'bottom-goal' : 'top-goal'
  const goal = goalConfigs.find((candidate) => candidate.id === id)

  if (!goal) {
    throw new Error(`Missing defended goal: ${id}`)
  }

  return goal
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

function stableSignedNoise(seed: number): number {
  return Math.sin(seed * 12.9898) * 0.5
}
