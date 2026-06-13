import type { TeamSide } from '../game/data/matchTypes'
import type { MatchStats } from '../game/systems/MatchStatsTracker'

export const matchEvents = {
  completed: 'spincore:match-completed',
} as const

export type MatchCompletionDetail = {
  winner: TeamSide
  score: Record<TeamSide, number>
  playerGoals: number
  playerBankShotGoals: number
  stats: MatchStats
  teamNames: Record<TeamSide, string>
}
