import type { TeamSide } from '../game/data/matchTypes'

export const matchEvents = {
  completed: 'spincore:match-completed',
} as const

export type MatchCompletionDetail = {
  winner: TeamSide
  score: Record<TeamSide, number>
  playerGoals: number
  playerBankShotGoals: number
}
