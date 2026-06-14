import type { TeamSide } from '../game/data/matchTypes'
import type { MatchCompletionDetail } from './MatchEvents'
import type { MatchLaunchConfig } from './MatchLaunchConfig'

export type MatchPlayerStats = {
  goals: number
  assists: number
  shots: number
  bankShotGoals: number
  saves: number
  steals: number
  turnovers: number
  fumbles: number
  successfulGathers: number
}

export type MatchTeamStatLine = {
  score: number
  assists: number
  checks: number
  saves: number
}

export type MatchRewardItem = {
  label: string
  xp: number
  money: number
}

export type MatchRewards = {
  xp: number
  money: number
  breakdown: MatchRewardItem[]
  levelsGained: number
  newLevel: number
}

export type MatchResult = {
  matchId: string
  mode: MatchLaunchConfig['mode']
  opponentTeamId: string
  opponentName: string
  playerTeamScore: number
  opponentTeamScore: number
  won: boolean
  completedAt: string
  playerStats: MatchPlayerStats
  teamStats: Record<TeamSide, MatchTeamStatLine>
  rewards: MatchRewards
}

export function createEmptyMatchPlayerStats(): MatchPlayerStats {
  return {
    goals: 0,
    assists: 0,
    shots: 0,
    bankShotGoals: 0,
    saves: 0,
    steals: 0,
    turnovers: 0,
    fumbles: 0,
    successfulGathers: 0,
  }
}

export function createMatchResult(
  completion: MatchCompletionDetail,
  launch: MatchLaunchConfig,
): MatchResult {
  const playerStats = {
    ...createEmptyMatchPlayerStats(),
    ...completion.playerStats,
    goals:
      completion.playerStats?.goals ??
      Math.max(0, completion.playerGoals),
    bankShotGoals:
      completion.playerStats?.bankShotGoals ??
      Math.max(0, completion.playerBankShotGoals),
  }

  return {
    matchId:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `match-${Date.now()}`,
    mode: launch.mode,
    opponentTeamId: launch.opponentTeamId ?? 'unknown-opponent',
    opponentName:
      launch.opponentTeam?.name ?? completion.teamNames.B,
    playerTeamScore: completion.score.A,
    opponentTeamScore: completion.score.B,
    won: completion.winner === 'A',
    completedAt: new Date().toISOString(),
    playerStats,
    teamStats: {
      A: {
        score: completion.score.A,
        ...completion.stats.A,
      },
      B: {
        score: completion.score.B,
        ...completion.stats.B,
      },
    },
    rewards: {
      xp: 0,
      money: 0,
      breakdown: [],
      levelsGained: 0,
      newLevel: 0,
    },
  }
}
