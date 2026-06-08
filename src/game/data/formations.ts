import { arenaConfig } from '../config/arenaConfig'
import { formationConfig } from '../config/formationConfig'
import { goalConfig, goalConfigs } from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Point } from './geometry'
import type {
  Formation,
  FormationId,
  FormationPosition,
  PlayerRosterEntry,
  Team,
} from './matchTypes'
import {
  getKeeperHomeDirection,
  getKeeperStyleRadius,
} from '../rules/KeeperGeometry'

export type TeamFormationResolution = {
  formation: Formation
  spawns: Map<string, Point>
}

export const formations: Record<FormationId, Formation> = {
  balanced: {
    id: 'balanced',
    positions: {
      striker: { xNormalized: 0.62, yInTeamHalf: 0.78 },
      flex: { xNormalized: 0.36, yInTeamHalf: 0.52 },
    },
    aiBias: {
      releaseDelayMultiplier: 1,
      pressTargetBlend: 0.82,
      defensiveRetreat: 0.06,
      supportSpacingMultiplier: 1,
      brutePressureMultiplier: 1,
    },
  },
  aggressive: {
    id: 'aggressive',
    positions: {
      striker: { xNormalized: 0.61, yInTeamHalf: 0.95 },
      flex: { xNormalized: 0.39, yInTeamHalf: 0.86 },
    },
    aiBias: {
      releaseDelayMultiplier: 0.86,
      pressTargetBlend: 1,
      defensiveRetreat: 0,
      supportSpacingMultiplier: 1.04,
      brutePressureMultiplier: 1.12,
    },
  },
  conservative: {
    id: 'conservative',
    positions: {
      striker: { xNormalized: 0.59, yInTeamHalf: 0.58 },
      flex: { xNormalized: 0.39, yInTeamHalf: 0.3 },
    },
    aiBias: {
      releaseDelayMultiplier: 1.12,
      pressTargetBlend: 0.58,
      defensiveRetreat: 0.22,
      supportSpacingMultiplier: 0.9,
      brutePressureMultiplier: 0.86,
    },
  },
  staggeredLeft: {
    id: 'staggeredLeft',
    positions: {
      striker: { xNormalized: 0.28, yInTeamHalf: 0.84 },
      flex: { xNormalized: 0.68, yInTeamHalf: 0.52 },
    },
    aiBias: {
      releaseDelayMultiplier: 1,
      pressTargetBlend: 0.8,
      defensiveRetreat: 0.05,
      supportSpacingMultiplier: 1.16,
      brutePressureMultiplier: 1,
    },
  },
  staggeredRight: {
    id: 'staggeredRight',
    positions: {
      striker: { xNormalized: 0.72, yInTeamHalf: 0.84 },
      flex: { xNormalized: 0.32, yInTeamHalf: 0.52 },
    },
    aiBias: {
      releaseDelayMultiplier: 1,
      pressTargetBlend: 0.8,
      defensiveRetreat: 0.05,
      supportSpacingMultiplier: 1.16,
      brutePressureMultiplier: 1,
    },
  },
  brutePress: {
    id: 'brutePress',
    positions: {
      striker: { xNormalized: 0.36, yInTeamHalf: 0.72 },
      flex: { xNormalized: 0.5, yInTeamHalf: 0.92 },
    },
    aiBias: {
      releaseDelayMultiplier: 0.92,
      pressTargetBlend: 1,
      defensiveRetreat: 0,
      supportSpacingMultiplier: 0.94,
      brutePressureMultiplier: 1.28,
    },
  },
}

export function resolveTeamFormation(team: Team): TeamFormationResolution {
  const formation = resolveFormationForRoster(team.formation, team.roster)
  const defendedGoal = getGoalPoint(team.defendedGoalId)
  const attackedGoal = getGoalPoint(team.attackedGoalId)
  const attackDirection = normalized({
    x: attackedGoal.x - defendedGoal.x,
    y: attackedGoal.y - defendedGoal.y,
  })
  const spawns = new Map<string, Point>()

  for (const entry of team.roster) {
    const spawn =
      entry.role === 'keeper'
        ? resolveKeeperSpawn(
            defendedGoal,
            getKeeperHomeDirection(team.side),
            entry.playStyle,
          )
        : resolveFieldSpawn(
            formation.positions[entry.role === 'striker' ? 'striker' : 'flex'],
            team.side,
            attackDirection,
          )

    spawns.set(entry.id, spawn)
  }

  return { formation, spawns }
}

function resolveFormationForRoster(
  requested: FormationId,
  roster: PlayerRosterEntry[],
): Formation {
  if (
    requested === 'brutePress' &&
    !roster.some((entry) => entry.role === 'brute')
  ) {
    return formations.aggressive
  }

  return formations[requested]
}

function resolveKeeperSpawn(
  defendedGoal: Point,
  attackDirection: Point,
  style: PlayerRosterEntry['playStyle'],
): Point {
  const distanceFromGoal = getKeeperStyleRadius(style)

  return {
    x: defendedGoal.x + attackDirection.x * distanceFromGoal,
    y: defendedGoal.y + attackDirection.y * distanceFromGoal,
  }
}

function resolveFieldSpawn(
  position: FormationPosition,
  side: Team['side'],
  attackDirection: Point,
): Point {
  const bounds = getFormationHalfBounds(side)
  const xNormalized = clamp(position.xNormalized, 0, 1)
  const yInTeamHalf = clamp(position.yInTeamHalf, 0, 1)
  const raw = {
    x: lerp(bounds.left, bounds.right, xNormalized),
    y:
      side === 'A'
        ? lerp(bounds.bottom, bounds.halfBoundary, yInTeamHalf)
        : lerp(bounds.top, bounds.halfBoundary, yInTeamHalf),
  }
  const withinHalf = clampFieldSpawnToLegalHalf(raw, side)
  const outsideZones = keepOutsideKeeperZones(withinHalf, attackDirection)
  const outsidePosts = keepAwayFromGoalPosts(outsideZones, attackDirection)

  return clampFieldSpawnToLegalHalf(outsidePosts, side)
}

function keepOutsideKeeperZones(
  position: Point,
  fallbackDirection: Point,
): Point {
  const minimumDistance =
    keeperAreaConfig.keeperZoneRadius +
    playerRuntimeConfig.radius +
    keeperAreaConfig.keeperZoneBoundaryBuffer +
    formationConfig.spawnClearanceEpsilon
  let result = { ...position }

  for (const center of Object.values(keeperAreaConfig.areas)) {
    const offset = {
      x: result.x - center.x,
      y: result.y - center.y,
    }
    const length = Math.hypot(offset.x, offset.y)

    if (length >= minimumDistance) {
      continue
    }

    const direction =
      length === 0
        ? fallbackDirection
        : { x: offset.x / length, y: offset.y / length }
    result = {
      x: center.x + direction.x * minimumDistance,
      y: center.y + direction.y * minimumDistance,
    }
  }

  return result
}

function keepAwayFromGoalPosts(
  position: Point,
  fallbackDirection: Point,
): Point {
  const minimumDistance =
    goalConfig.goalPostRadius +
    playerRuntimeConfig.radius +
    formationConfig.goalPostSpawnClearance +
    formationConfig.spawnClearanceEpsilon
  let result = { ...position }

  for (const goal of goalConfigs) {
    const halfLength = goal.length / 2
    const posts =
      goal.orientation === 'horizontal'
        ? [
            { x: goal.x - halfLength, y: goal.y },
            { x: goal.x + halfLength, y: goal.y },
          ]
        : [
            { x: goal.x, y: goal.y - halfLength },
            { x: goal.x, y: goal.y + halfLength },
          ]

    for (const post of posts) {
      const offset = {
        x: result.x - post.x,
        y: result.y - post.y,
      }
      const length = Math.hypot(offset.x, offset.y)

      if (length >= minimumDistance) {
        continue
      }

      const direction =
        length === 0
          ? fallbackDirection
          : { x: offset.x / length, y: offset.y / length }
      result = {
        x: post.x + direction.x * minimumDistance,
        y: post.y + direction.y * minimumDistance,
      }
    }
  }

  return result
}

export function getFormationHalfBounds(side: Team['side']): {
  left: number
  right: number
  top: number
  bottom: number
  halfBoundary: number
} {
  const edgePadding =
    playerRuntimeConfig.radius + formationConfig.fieldBoundaryPadding
  const left =
    arenaConfig.center.x - arenaConfig.width * 0.5 + edgePadding
  const right =
    arenaConfig.center.x + arenaConfig.width * 0.5 - edgePadding
  const top =
    arenaConfig.center.y - arenaConfig.height * 0.5 + edgePadding
  const bottom =
    arenaConfig.center.y + arenaConfig.height * 0.5 - edgePadding
  const halfBoundary =
    arenaConfig.center.y +
    (side === 'A' ? 1 : -1) *
      formationConfig.formationMidfieldBuffer

  return { left, right, top, bottom, halfBoundary }
}

function clampFieldSpawnToLegalHalf(
  position: Point,
  side: Team['side'],
): Point {
  const bounds = getFormationHalfBounds(side)

  return {
    x: clamp(position.x, bounds.left, bounds.right),
    y:
      side === 'A'
        ? clamp(position.y, bounds.halfBoundary, bounds.bottom)
        : clamp(position.y, bounds.top, bounds.halfBoundary),
  }
}

function getGoalPoint(goalId: string): Point {
  const goal = goalConfigs.find((candidate) => candidate.id === goalId)

  if (!goal) {
    throw new Error(`Missing formation goal ${goalId}`)
  }

  return { x: goal.x, y: goal.y }
}

function normalized(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y)

  if (length === 0) {
    return { x: 0, y: -1 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}
