import { aiConfig } from './aiConfig'
import { bottomGoalConfig, topGoalConfig } from './goalConfig'

export const keeperAreaConfig = {
  outerRadius: aiConfig.keeperHomeRadius,
  noBodyRadius: 62,
  bodyPadding: 4,
  normal: {
    keeperStrokeColor: 0x62dff2,
    keeperStrokeAlpha: 0.3,
    keeperFillColor: 0x1b92a8,
    keeperFillAlpha: 0.035,
    noBodyStrokeColor: 0xffd875,
    noBodyStrokeAlpha: 0.36,
    noBodyFillColor: 0xffbd4a,
    noBodyFillAlpha: 0.025,
  },
  debug: {
    keeperStrokeAlpha: 0.9,
    keeperFillAlpha: 0.09,
    noBodyStrokeAlpha: 0.92,
    noBodyFillAlpha: 0.08,
    labelColor: '#d7fbff',
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
