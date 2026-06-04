export type ScoreState = {
  goals: number
  lastCall: string
}

export const initialScoreState: ScoreState = {
  goals: 0,
  lastCall: 'READY',
}

export const scoreLabels = {
  title: 'SPINCORE',
  goals: 'GOALS',
  last: 'LAST',
  forward: 'FORWARD',
  reverse: 'REVERSE',
} as const
