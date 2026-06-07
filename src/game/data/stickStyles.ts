import type { StickStyle } from './matchTypes'

export type CestaBatStyle = {
  id: StickStyle
  bodyColor: number
  bodyShade: number
  accentColor: number
  gripColor: number
  cavityColor: number
  lengthScale: number
  handleScale: number
  handleWidthScale: number
  neckWidthScale: number
  pocketWidthScale: number
  pocketDepthScale: number
  lipScale: number
  openingScale: number
  tipNotch: number
}

export const cestaBatStyles: Record<StickStyle, CestaBatStyle> = {
  hook: {
    id: 'hook',
    bodyColor: 0xc88f4f,
    bodyShade: 0x77452b,
    accentColor: 0xf2ce6d,
    gripColor: 0x314b54,
    cavityColor: 0x493329,
    lengthScale: 1,
    handleScale: 1,
    handleWidthScale: 1,
    neckWidthScale: 1,
    pocketWidthScale: 1,
    pocketDepthScale: 1,
    lipScale: 1,
    openingScale: 1,
    tipNotch: 0,
  },
  cradle: {
    id: 'cradle',
    bodyColor: 0xb98a55,
    bodyShade: 0x68452d,
    accentColor: 0x78d0ba,
    gripColor: 0x304d55,
    cavityColor: 0x3d342b,
    lengthScale: 0.98,
    handleScale: 0.92,
    handleWidthScale: 1.05,
    neckWidthScale: 1.06,
    pocketWidthScale: 1.32,
    pocketDepthScale: 1.22,
    lipScale: 1.05,
    openingScale: 1.18,
    tipNotch: 0,
  },
  hammer: {
    id: 'hammer',
    bodyColor: 0xaa6944,
    bodyShade: 0x573328,
    accentColor: 0xe97b5d,
    gripColor: 0x263e47,
    cavityColor: 0x402a25,
    lengthScale: 0.84,
    handleScale: 1.02,
    handleWidthScale: 1.28,
    neckWidthScale: 1.48,
    pocketWidthScale: 1.34,
    pocketDepthScale: 0.76,
    lipScale: 1.72,
    openingScale: 0.76,
    tipNotch: 0,
  },
  whip: {
    id: 'whip',
    bodyColor: 0xc99c58,
    bodyShade: 0x72492c,
    accentColor: 0x70b7e2,
    gripColor: 0x304955,
    cavityColor: 0x49342a,
    lengthScale: 1.04,
    handleScale: 0.9,
    handleWidthScale: 0.82,
    neckWidthScale: 0.64,
    pocketWidthScale: 0.66,
    pocketDepthScale: 0.84,
    lipScale: 0.66,
    openingScale: 0.94,
    tipNotch: 0,
  },
  fork: {
    id: 'fork',
    bodyColor: 0xb9854f,
    bodyShade: 0x62412c,
    accentColor: 0x97cd79,
    gripColor: 0x304a50,
    cavityColor: 0x413229,
    lengthScale: 0.97,
    handleScale: 0.96,
    handleWidthScale: 0.94,
    neckWidthScale: 0.92,
    pocketWidthScale: 0.88,
    pocketDepthScale: 1,
    lipScale: 0.82,
    openingScale: 1.22,
    tipNotch: 7,
  },
}
