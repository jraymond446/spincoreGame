import { viewConfig } from './viewConfig'

export const arenaDimensionsConfig = {
  width: 900,
  height: 1400,
} as const

export const arenaConfig = {
  center: {
    x: viewConfig.width / 2,
    y: viewConfig.height / 2,
  },
  dimensions: arenaDimensionsConfig,
  width: arenaDimensionsConfig.width,
  height: arenaDimensionsConfig.height,
  wallThickness: 56,
  safetyBoundsOffset: 105,
  safetyWallThickness: 72,
  playerContainmentPadding: 4,
  cornerRadius: 18,
  outerSurfaceColor: 0x19566d,
  floorColor: 0x2b91b3,
  floorAccentColor: 0x32a0bd,
  boundaryLineColor: 0xe8fbff,
  secondaryLineColor: 0xb8eef2,
  wallColor: 0x17475b,
  wallStrokeColor: 0x9ce8ef,
  courtInset: 25,
  serviceLineDepth: 320,
  centerCircleRadius: 72,
  faceoffMarkRadius: 7,
} as const
