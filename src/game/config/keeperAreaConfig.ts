import { aiConfig } from './aiConfig'
import { bottomGoalConfig, topGoalConfig } from './goalConfig'

export const keeperAreaConfig = {
  keeperZoneRadius: aiConfig.keeperHomeRadius,
  keeperZoneBoundaryBuffer: 6,
  keeperZonePushStrength: 1,
  keeperZoneVisualAlpha: 0.055,
  keeperZoneDebugAlpha: 0.14,
  normal: {
    keeperStrokeColor: 0xd9f8fb,
    keeperStrokeAlpha: 0.42,
    keeperFillColor: 0xc6f2f4,
  },
  debug: {
    keeperStrokeAlpha: 0.9,
    labelColor: '#f3feff',
    labelOffsetX: 14,
    labelGap: 22,
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
