import Phaser from 'phaser'
import { aiOffenseConfig } from '../config/aiOffenseConfig'
import { arenaConfig } from '../config/arenaConfig'
import { goalConfigs } from '../config/goalConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import type { TeamStrategy } from '../tactics/TeamStrategy'

export type AIBankShotCandidate = {
  wall: 'left' | 'right'
  reflectionPoint: Point
  goalTarget: Point
  score: number
  firstLaneScore: number
  secondLaneScore: number
  valid: boolean
}

export type AIShotEvaluation = {
  directTarget: Point
  directScore: number
  bankCandidates: AIBankShotCandidate[]
  bestBank: AIBankShotCandidate | null
}

export class AIBankShotSystem {
  evaluate(
    shooter: Player,
    players: Player[],
    strategy: TeamStrategy,
  ): AIShotEvaluation {
    const goal = getAttackGoal(shooter.teamSide)
    const opponents = players.filter(
      (player) => player.teamSide !== shooter.teamSide,
    )
    const keeper =
      opponents.find((player) => player.role === 'keeper') ?? null
    const fieldDefenders = opponents.filter(
      (player) => player.role !== 'keeper',
    )
    const directTarget = getOpenGoalTarget(goal, keeper)
    const directLane = laneScore(
      shooter.position,
      directTarget,
      fieldDefenders,
      shooter.id,
    )
    const directGoaliePenalty = keeper
      ? goalieLanePenalty(
          keeper.position,
          shooter.position,
          directTarget,
        ) * aiOffenseConfig.aiBankShotGoaliePenalty
      : 0
    const distanceToGoal = Math.hypot(
      shooter.position.x - goal.x,
      shooter.position.y - goal.y,
    )
    const closeRangeBonus =
      distanceToGoal <= aiOffenseConfig.aiMinShotDistance
        ? aiOffenseConfig.aiCloseRangeShotBonus
        : 0
    const directScore = Phaser.Math.Clamp(
      directLane - directGoaliePenalty + closeRangeBonus,
      0,
      1,
    )

    if (
      !aiOffenseConfig.aiBankShotsEnabled ||
      shooter.role === 'keeper' ||
      distanceToGoal <
        aiOffenseConfig.aiBankShotMinCarrierDistanceFromGoal
    ) {
      return {
        directTarget,
        directScore,
        bankCandidates: [],
        bestBank: null,
      }
    }

    const bankCandidates = (['left', 'right'] as const).map((wall) =>
      this.evaluateWall(
        wall,
        shooter,
        fieldDefenders,
        keeper,
        directTarget,
        strategy,
      ),
    )
    const bestBank =
      bankCandidates
        .filter((candidate) => candidate.valid)
        .sort((a, b) => b.score - a.score)[0] ?? null

    return {
      directTarget,
      directScore,
      bankCandidates,
      bestBank,
    }
  }

  private evaluateWall(
    wall: 'left' | 'right',
    shooter: Player,
    opponents: Player[],
    keeper: Player | null,
    goalTarget: Point,
    strategy: TeamStrategy,
  ): AIBankShotCandidate {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const wallX =
      arenaConfig.center.x +
      (wall === 'left' ? -halfWidth : halfWidth)
    const mirroredGoalX = wallX * 2 - goalTarget.x
    const denominator = mirroredGoalX - shooter.position.x
    const progress =
      Math.abs(denominator) < 0.001
        ? -1
        : (wallX - shooter.position.x) / denominator
    const reflectionPoint = {
      x: wallX,
      y:
        shooter.position.y +
        (goalTarget.y - shooter.position.y) * progress,
    }
    const top =
      arenaConfig.center.y -
      halfHeight +
      aiOffenseConfig.aiBankShotWallTargetPadding
    const bottom =
      arenaConfig.center.y +
      halfHeight -
      aiOffenseConfig.aiBankShotWallTargetPadding
    const valid =
      progress > 0 &&
      progress < 1 &&
      reflectionPoint.y >= top &&
      reflectionPoint.y <= bottom
    const firstLaneScore = valid
      ? laneScore(
          shooter.position,
          reflectionPoint,
          opponents,
          shooter.id,
        )
      : 0
    const secondLaneScore = valid
      ? laneScore(reflectionPoint, goalTarget, opponents, shooter.id)
      : 0
    const goaliePenalty = keeper
      ? goalieLanePenalty(
          keeper.position,
          reflectionPoint,
          goalTarget,
        ) * aiOffenseConfig.aiBankShotGoaliePenalty
      : 0
    const blockedPenalty =
      (firstLaneScore < aiOffenseConfig.aiShotBlockedThreshold ||
      secondLaneScore < aiOffenseConfig.aiShotBlockedThreshold
        ? aiOffenseConfig.aiBankShotBlockedPenalty
        : 0)
    const styleBonus =
      shooter.playStyle === 'technical' ||
      shooter.playStyle === 'creative'
        ? aiOffenseConfig.aiBankShotStyleBonusForTechnical
        : 0
    const schemeBonus =
      strategy.offenseScheme === 'bankHunter'
        ? aiOffenseConfig.aiBankShotStyleBonusForBankHunter
        : 0
    const roleMultiplier =
      shooter.role === 'brute'
        ? 0.58
        : shooter.role === 'support'
          ? 0.94
          : 1
    const score = valid
      ? Phaser.Math.Clamp(
          ((firstLaneScore + secondLaneScore) * 0.5 +
            aiOffenseConfig.aiBankShotPreference +
            styleBonus +
            schemeBonus -
            goaliePenalty -
            blockedPenalty) *
            roleMultiplier,
          0,
          1,
        )
      : 0

    return {
      wall,
      reflectionPoint,
      goalTarget,
      score,
      firstLaneScore,
      secondLaneScore,
      valid,
    }
  }
}

function getAttackGoal(side: TeamSide) {
  const id = side === 'A' ? 'top-goal' : 'bottom-goal'
  const goal = goalConfigs.find((candidate) => candidate.id === id)

  if (!goal) {
    throw new Error(`Missing attack goal: ${id}`)
  }

  return goal
}

function getOpenGoalTarget(
  goal: (typeof goalConfigs)[number],
  keeper: Player | null,
): Point {
  const openSide =
    keeper && keeper.position.x < goal.x ? 1 : -1
  const offset =
    goal.length *
    aiOffenseConfig.aiDirectShotTargetOffsetRatio *
    openSide

  return {
    x: goal.x + offset,
    y: goal.y,
  }
}

function laneScore(
  start: Point,
  end: Point,
  opponents: Player[],
  shooterId: string,
): number {
  const blockers = opponents.filter((player) => player.id !== shooterId)

  if (blockers.length === 0) {
    return 1
  }

  const clearance = Math.min(
    ...blockers.map((player) =>
      distanceToSegment(player.position, start, end),
    ),
  )

  return Phaser.Math.Clamp(clearance / 150, 0, 1)
}

function goalieLanePenalty(
  keeper: Point,
  start: Point,
  end: Point,
): number {
  return 1 - Phaser.Math.Clamp(
    distanceToSegment(keeper, start, end) / 120,
    0,
    1,
  )
}

function distanceToSegment(
  point: Point,
  start: Point,
  end: Point,
): number {
  const segment = { x: end.x - start.x, y: end.y - start.y }
  const lengthSquared =
    segment.x * segment.x + segment.y * segment.y
  const progress =
    lengthSquared === 0
      ? 0
      : Phaser.Math.Clamp(
          ((point.x - start.x) * segment.x +
            (point.y - start.y) * segment.y) /
            lengthSquared,
          0,
          1,
        )
  const closest = {
    x: start.x + segment.x * progress,
    y: start.y + segment.y * progress,
  }

  return Math.hypot(point.x - closest.x, point.y - closest.y)
}
