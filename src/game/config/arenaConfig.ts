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
  wallThickness: 30,
  cornerRadius: 18,
  floorColor: 0x0d2028,
  stripeColor: 0x255464,
  wallColor: 0x132f38,
  wallStrokeColor: 0x45c4d8,
} as const
