import type { StickStyle } from './matchTypes'

export type CestaBatStyle = {
  id: StickStyle
  bodyColor: number
  bodyShade: number
  accentColor: number
  gripColor: number
  cavityColor: number
  shaftWidth: number
  pocketBodyWidth: number
  pocketDepth: number
  pocketLength: number
  lipThickness: number
  handleLength: number
  taper: number
  forkGap: number
}

export const cestaBatStyles: Record<StickStyle, CestaBatStyle> = {
  hook: {
    id: 'hook',
    bodyColor: 0xc58b4a,
    bodyShade: 0x82502d,
    accentColor: 0xf0c864,
    gripColor: 0x36515a,
    cavityColor: 0x4b3023,
    shaftWidth: 11,
    pocketBodyWidth: 22,
    pocketDepth: 23,
    pocketLength: 55,
    lipThickness: 8,
    handleLength: 25,
    taper: 0.82,
    forkGap: 0,
  },
  cradle: {
    id: 'cradle',
    bodyColor: 0xb88a55,
    bodyShade: 0x704b31,
    accentColor: 0x70c8b5,
    gripColor: 0x314e57,
    cavityColor: 0x3d3028,
    shaftWidth: 12,
    pocketBodyWidth: 29,
    pocketDepth: 29,
    pocketLength: 57,
    lipThickness: 8,
    handleLength: 24,
    taper: 0.9,
    forkGap: 0,
  },
  hammer: {
    id: 'hammer',
    bodyColor: 0xa96843,
    bodyShade: 0x603a2a,
    accentColor: 0xe77758,
    gripColor: 0x273f49,
    cavityColor: 0x402b24,
    shaftWidth: 15,
    pocketBodyWidth: 27,
    pocketDepth: 21,
    pocketLength: 51,
    lipThickness: 14,
    handleLength: 28,
    taper: 0.72,
    forkGap: 0,
  },
  whip: {
    id: 'whip',
    bodyColor: 0xc79b58,
    bodyShade: 0x79502e,
    accentColor: 0x67aedd,
    gripColor: 0x304956,
    cavityColor: 0x493428,
    shaftWidth: 8,
    pocketBodyWidth: 17,
    pocketDepth: 25,
    pocketLength: 64,
    lipThickness: 6,
    handleLength: 22,
    taper: 0.58,
    forkGap: 0,
  },
  fork: {
    id: 'fork',
    bodyColor: 0xb7834d,
    bodyShade: 0x65452e,
    accentColor: 0x8fc66f,
    gripColor: 0x314b50,
    cavityColor: 0x403127,
    shaftWidth: 10,
    pocketBodyWidth: 21,
    pocketDepth: 22,
    pocketLength: 56,
    lipThickness: 7,
    handleLength: 24,
    taper: 0.76,
    forkGap: 7,
  },
}

