import type { TeamSide } from '../game/data/matchTypes'
import type { MatchStats } from '../game/systems/MatchStatsTracker'
import type { MatchPlayerStats } from './MatchResult'

export const matchEvents = {
  completed: 'spincore:match-completed',
} as const

export type MatchCompletionDetail = {
  winner: TeamSide
  score: Record<TeamSide, number>
  playerGoals: number
  playerBankShotGoals: number
  playerStats?: MatchPlayerStats
  stats: MatchStats
  teamNames: Record<TeamSide, string>
}
