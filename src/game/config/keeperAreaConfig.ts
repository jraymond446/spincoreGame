import { aiConfig } from './aiConfig'
import { bottomGoalConfig, topGoalConfig } from './goalConfig'

export const keeperAreaConfig = {
  outerRadius: aiConfig.keeperHomeRadius,
  noBodyRadius: 62,
  bodyPadding: 4,
  normal: {
    keeperStrokeColor: 0xd9f8fb,
    keeperStrokeAlpha: 0.42,
    keeperFillColor: 0xc6f2f4,
    keeperFillAlpha: 0.045,
    noBodyStrokeColor: 0xffd36a,
    noBodyStrokeAlpha: 0.5,
    noBodyFillColor: 0xffcf5d,
    noBodyFillAlpha: 0.035,
  },
  debug: {
    keeperStrokeAlpha: 0.9,
    keeperFillAlpha: 0.09,
    noBodyStrokeAlpha: 0.92,
    noBodyFillAlpha: 0.08,
    labelColor: '#f3feff',
    labelOffsetX: 14,
  },
  areas: {
    A: {
      x: bottomGoalConfig.x,
      y: bottomGoalConfig.y,
    },
    B: {
      x: topGoalConfig.x,
      y: topGoalConfig.y,
    },
  },
} as const
