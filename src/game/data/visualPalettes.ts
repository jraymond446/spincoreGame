import type { PlayerRole, TeamSide } from './matchTypes'

export type TeamVisualPalette = {
  shirt: number
  shirtShade: number
  trim: number
  shorts: number
}

export const teamVisualPalettes: Record<TeamSide, TeamVisualPalette> = {
  A: {
    shirt: 0x2dc9ee,
    shirtShade: 0x147e9e,
    trim: 0xffd35c,
    shorts: 0x123b53,
  },
  B: {
    shirt: 0xf15270,
    shirtShade: 0xa62d4c,
    trim: 0xb6ff68,
    shorts: 0x511f3d,
  },
}

export const hairColorPalette = [
  0x17212e,
  0x4a2d24,
  0xd7a333,
  0x8d5ce6,
  0x2c9e83,
  0xe8e4dc,
] as const

export const roleAccentColors: Record<PlayerRole, number> = {
  keeper: 0x8df5ff,
  striker: 0xffd55f,
  support: 0x8effb4,
  brute: 0xff8a74,
}
