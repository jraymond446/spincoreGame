import { arenaConfig } from './arenaConfig'

export type GoalGateConfig = {
  id: string
  orientation: 'horizontal' | 'vertical'
  x: number
  y: number
  length: number
  postRadius: number
  planeColor: number
  postColor: number
  flashColor: number
}

const sharedGoalConfig = {
  orientation: 'horizontal',
  x: arenaConfig.center.x,
  length: 230,
  postRadius: 12,
  planeColor: 0x6df2ff,
  postColor: 0xf7f2a0,
  flashColor: 0xffffff,
} as const

export const topGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'top-goal',
  y: arenaConfig.center.y - arenaConfig.height / 2 + 190,
}

export const bottomGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'bottom-goal',
  y: arenaConfig.center.y + arenaConfig.height / 2 - 190,
}

export const goalConfigs = [topGoalConfig, bottomGoalConfig] as const
