import type { MatchState } from './matchTypes'

export const initialMatchState: MatchState = {
  score: {
    A: 0,
    B: 0,
  },
  firstTo: 5,
  winner: null,
  lastScorer: null,
}

export const scoreLabels = {
  title: 'SPINCORE',
  teamA: 'TEAM A',
  teamB: 'TEAM B',
  firstTo: 'FIRST TO',
  winner: 'WINNER',
} as const
