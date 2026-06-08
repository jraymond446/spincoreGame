import type { PlayerRole, TeamSide } from './matchTypes'

export type TeamVisualPalette = {
  shirt: number
  shirtShade: number
  trim: number
  shorts: number
}

export const teamVisualPalettes: Record<TeamSide, TeamVisualPalette> = {
  A: {
    shirt: 0x198bd5,
    shirtShade: 0x0e5f9d,
    trim: 0xf9fdff,
    shorts: 0x123f72,
  },
  B: {
    shirt: 0xe45870,
    shirtShade: 0xa83250,
    trim: 0xfff4d2,
    shorts: 0x742542,
  },
}

export const hairColorPalette = [
  0x17283b,
  0x59382f,
  0xc08a38,
  0x72538d,
  0x2f746b,
  0xd8d0ba,
] as const

export const roleAccentColors: Record<PlayerRole, number> = {
  keeper: 0xeafaff,
  striker: 0xffd24f,
  support: 0x8df0cf,
  brute: 0xff9a55,
}
