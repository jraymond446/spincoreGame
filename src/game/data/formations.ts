import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { goalConfigs } from '../config/goalConfig'
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

export type TeamFormationResolution = {
  formation: Formation
  spawns: Map<string, Point>
}

export const formationConfig = {
  keeperHomeProgress: 0.25,
  fieldBoundaryPadding: 18,
  ghostMarkerRadius: 16,
  ghostMarkerAlpha: 0.42,
  ghostLineAlpha: 0.3,
} as const

export const formations: Record<FormationId, Formation> = {
  balanced: {
    id: 'balanced',
    positions: {
      striker: { lateral: 0.22, attackProgress: 0.58 },
      flex: { lateral: -0.26, attackProgress: 0.46 },
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
      striker: { lateral: 0.18, attackProgress: 0.67 },
      flex: { lateral: -0.2, attackProgress: 0.59 },
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
      striker: { lateral: 0.16, attackProgress: 0.48 },
      flex: { lateral: -0.18, attackProgress: 0.32 },
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
      striker: { lateral: -0.38, attackProgress: 0.62 },
      flex: { lateral: 0.3, attackProgress: 0.46 },
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
      striker: { lateral: 0.38, attackProgress: 0.62 },
      flex: { lateral: -0.3, attackProgress: 0.46 },
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
      striker: { lateral: -0.24, attackProgress: 0.54 },
      flex: { lateral: 0, attackProgress: 0.64 },
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
  const attackDistance = distance(defendedGoal, attackedGoal)
  const lateralDirection = {
    x: -attackDirection.y,
    y: attackDirection.x,
  }
  const spawns = new Map<string, Point>()

  for (const entry of team.roster) {
    const spawn =
      entry.role === 'keeper'
        ? resolveKeeperSpawn(defendedGoal, attackDirection)
        : resolveFieldSpawn(
            formation.positions[entry.role === 'striker' ? 'striker' : 'flex'],
            defendedGoal,
            attackDirection,
            lateralDirection,
            attackDistance,
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
): Point {
  const distanceFromGoal =
    keeperAreaConfig.keeperZoneRadius * formationConfig.keeperHomeProgress

  return {
    x: defendedGoal.x + attackDirection.x * distanceFromGoal,
    y: defendedGoal.y + attackDirection.y * distanceFromGoal,
  }
}

function resolveFieldSpawn(
  position: FormationPosition,
  defendedGoal: Point,
  attackDirection: Point,
  lateralDirection: Point,
  attackDistance: number,
): Point {
  const raw = {
    x:
      defendedGoal.x +
      attackDirection.x * attackDistance * position.attackProgress +
      lateralDirection.x * (arenaConfig.width * 0.5) * position.lateral,
    y:
      defendedGoal.y +
      attackDirection.y * attackDistance * position.attackProgress +
      lateralDirection.y * (arenaConfig.width * 0.5) * position.lateral,
  }
  const outsideZones = keepOutsideKeeperZones(raw, attackDirection)
  const edgePadding =
    playerRuntimeConfig.radius + formationConfig.fieldBoundaryPadding

  return {
    x: Phaser.Math.Clamp(
      outsideZones.x,
      arenaConfig.center.x - arenaConfig.width * 0.5 + edgePadding,
      arenaConfig.center.x + arenaConfig.width * 0.5 - edgePadding,
    ),
    y: Phaser.Math.Clamp(
      outsideZones.y,
      arenaConfig.center.y - arenaConfig.height * 0.5 + edgePadding,
      arenaConfig.center.y + arenaConfig.height * 0.5 - edgePadding,
    ),
  }
}

function keepOutsideKeeperZones(
  position: Point,
  fallbackDirection: Point,
): Point {
  const minimumDistance =
    keeperAreaConfig.keeperZoneRadius +
    playerRuntimeConfig.radius +
    keeperAreaConfig.keeperZoneBoundaryBuffer
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

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
