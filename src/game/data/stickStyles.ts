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
    bodyColor: 0x2aaa9a,
    bodyShade: 0x176b70,
    accentColor: 0xf2cf55,
    gripColor: 0x173a57,
    cavityColor: 0xdff6ed,
    lengthScale: 1,
    handleScale: 1,
    handleWidthScale: 1,
    neckWidthScale: 1,
    pocketWidthScale: 1.08,
    pocketDepthScale: 1.04,
    lipScale: 1,
    openingScale: 1,
    tipNotch: 0,
  },
  cradle: {
    id: 'cradle',
    bodyColor: 0x318fda,
    bodyShade: 0x175d9b,
    accentColor: 0xffd35a,
    gripColor: 0x193853,
    cavityColor: 0xe5f5ff,
    lengthScale: 0.98,
    handleScale: 0.92,
    handleWidthScale: 1.05,
    neckWidthScale: 1.06,
    pocketWidthScale: 1.28,
    pocketDepthScale: 1.16,
    lipScale: 1.05,
    openingScale: 1.18,
    tipNotch: 0,
  },
  hammer: {
    id: 'hammer',
    bodyColor: 0x7c62bf,
    bodyShade: 0x493b82,
    accentColor: 0xffca55,
    gripColor: 0x283650,
    cavityColor: 0xeee9ff,
    lengthScale: 0.88,
    handleScale: 1.02,
    handleWidthScale: 1.28,
    neckWidthScale: 1.48,
    pocketWidthScale: 1.22,
    pocketDepthScale: 0.82,
    lipScale: 1.72,
    openingScale: 0.76,
    tipNotch: 0,
  },
  whip: {
    id: 'whip',
    bodyColor: 0xe45f8b,
    bodyShade: 0x9a365f,
    accentColor: 0x73d6e8,
    gripColor: 0x263952,
    cavityColor: 0xffedf4,
    lengthScale: 1.02,
    handleScale: 0.9,
    handleWidthScale: 0.88,
    neckWidthScale: 0.78,
    pocketWidthScale: 0.86,
    pocketDepthScale: 0.92,
    lipScale: 0.78,
    openingScale: 0.94,
    tipNotch: 0,
  },
  fork: {
    id: 'fork',
    bodyColor: 0xe78c3f,
    bodyShade: 0x9b4d2c,
    accentColor: 0x8fd26e,
    gripColor: 0x263b50,
    cavityColor: 0xfff0d8,
    lengthScale: 0.97,
    handleScale: 0.96,
    handleWidthScale: 0.94,
    neckWidthScale: 0.92,
    pocketWidthScale: 0.96,
    pocketDepthScale: 1,
    lipScale: 0.82,
    openingScale: 1.22,
    tipNotch: 7,
  },
}
