import { arenaConfig } from './arenaConfig'

export type GoalGateConfig = {
  id: string
  orientation: 'horizontal' | 'vertical'
  x: number
  y: number
  length: number
  planeColor: number
  postColor: number
  flashColor: number
}

export const goalConfig = {
  goalPostRadius: 11,
  goalPostRestitution: 0.82,
  goalPostFriction: 0.02,
  scoringPlaneTolerance: 5,
  scoringCooldownMs: 500,
} as const

const sharedGoalConfig = {
  orientation: 'horizontal',
  x: arenaConfig.center.x,
  length: 150,
  planeColor: 0xe8fbff,
  postColor: 0xffca62,
  flashColor: 0xffffff,
} as const

export const topGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'top-goal',
  y: arenaConfig.center.y - arenaConfig.height / 2 + 330,
}

export const bottomGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'bottom-goal',
  y: arenaConfig.center.y + arenaConfig.height / 2 - 330,
}

export const goalConfigs = [topGoalConfig, bottomGoalConfig] as const
