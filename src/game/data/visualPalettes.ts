import type { PlayerRole, TeamSide } from './matchTypes'

export type TeamVisualPalette = {
  shirt: number
  shirtShade: number
  trim: number
  shorts: number
}

export const teamVisualPalettes: Record<TeamSide, TeamVisualPalette> = {
  A: {
    shirt: 0x42c9ee,
    shirtShade: 0x238eaf,
    trim: 0xf4fdff,
    shorts: 0x17647e,
  },
  B: {
    shirt: 0xf26763,
    shirtShade: 0xb63e47,
    trim: 0xffd36a,
    shorts: 0x7b2d3c,
  },
}

export const hairColorPalette = [
  0x1c2730,
  0x50372f,
  0xb68c45,
  0x6d5a85,
  0x466f68,
  0xc9c4b8,
] as const

export const roleAccentColors: Record<PlayerRole, number> = {
  keeper: 0xe9fcff,
  striker: 0xffd55f,
  support: 0xbff5e5,
  brute: 0xffb06b,
}
