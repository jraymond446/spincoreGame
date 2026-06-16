import { viewConfig } from './viewConfig'
import { visualStyleConfig } from './visualStyleConfig'

export const arenaDimensionsConfig = {
  width: 1000,
  height: 1500,
} as const

export const arenaConfig = {
  center: {
    x: viewConfig.width / 2,
    y: viewConfig.height / 2,
  },
  dimensions: arenaDimensionsConfig,
  width: arenaDimensionsConfig.width,
  height: arenaDimensionsConfig.height,
  wallThickness: 64,
  wallRestitution: 0.94,
  wallFriction: 0.02,
  safetyBoundsOffset: 105,
  safetyWallThickness: 72,
  safetyWallRestitution: 0.82,
  playerContainmentPadding: 4,
  cornerRadius: 18,
  outerSurfaceColor: visualStyleConfig.court.shell,
  floorColor: visualStyleConfig.court.surface,
  floorAccentColor: visualStyleConfig.court.surfaceLight,
  boundaryLineColor: visualStyleConfig.court.line,
  secondaryLineColor: visualStyleConfig.court.lineSoft,
  wallColor: visualStyleConfig.court.shellShade,
  wallStrokeColor: visualStyleConfig.court.shellEdge,
  courtInset: 25,
  serviceLineDepth: 320,
  centerCircleRadius: 72,
  faceoffMarkRadius: 7,
} as const
