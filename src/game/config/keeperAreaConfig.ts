import { aiConfig } from './aiConfig'
import { bottomGoalConfig, topGoalConfig } from './goalConfig'
import { visualStyleConfig } from './visualStyleConfig'

export const keeperAreaConfig = {
  keeperZoneRadius: aiConfig.keeperHomeRadius,
  keeperZoneBoundaryBuffer: 8,
  keeperZonePushStrength: 0.85,
  keeperZoneVisualAlpha: 0.055,
  keeperZoneDebugAlpha: 0.14,
  innerNoBodyRadius: 40,
  normal: {
    keeperStrokeColor: visualStyleConfig.court.line,
    keeperStrokeAlpha: 0.62,
    keeperFillColor: visualStyleConfig.court.lineSoft,
    innerStrokeColor: visualStyleConfig.goal.energy,
    innerStrokeAlpha: 0.72,
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
