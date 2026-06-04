import { arenaConfig } from './arenaConfig'

export const goalConfig = {
  id: 'east-gate',
  x: arenaConfig.center.x + arenaConfig.width / 2 - 140,
  y: arenaConfig.center.y,
  height: 164,
  postRadius: 12,
  planeColor: 0x6df2ff,
  postColor: 0xf7f2a0,
  flashColor: 0xffffff,
} as const
