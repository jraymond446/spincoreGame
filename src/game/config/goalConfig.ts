import { arenaConfig } from './arenaConfig'
import { visualStyleConfig } from './visualStyleConfig'

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
  goalPostRadius: 8,
  goalPostRestitution: 0.82,
  goalPostFriction: 0.02,
  scoringPlaneTolerance: 5,
  scoringCooldownMs: 500,
  useSweptGoalDetection: true,
  disableGoalMagnetScoring: true,
  goalWarpDebugEnabled: true,
  maxGoalCrossingStep: 140,
}

const sharedGoalConfig = {
  orientation: 'horizontal',
  x: arenaConfig.center.x,
  length: 125,
  planeColor: visualStyleConfig.goal.energy,
  postColor: visualStyleConfig.goal.metal,
  flashColor: 0xffffff,
} as const

export const topGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'top-goal',
  y: arenaConfig.center.y - arenaConfig.height / 2 + 300,
}

export const bottomGoalConfig: GoalGateConfig = {
  ...sharedGoalConfig,
  id: 'bottom-goal',
  y: arenaConfig.center.y + arenaConfig.height / 2 - 300,
}

export const goalConfigs = [topGoalConfig, bottomGoalConfig] as const
