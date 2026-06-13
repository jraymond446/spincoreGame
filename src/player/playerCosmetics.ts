import type {
  PlayerAccentColor,
  PlayerCosmetics,
  PlayerHairColor,
  PlayerHairStyle,
  PlayerShirtColor,
  PlayerSkinTone,
} from '../save/saveTypes'
import type { PlayerVisualProfileOverride } from '../game/data/matchTypes'

export const defaultPlayerCosmetics: PlayerCosmetics = {
  skinTone: 'tan',
  hairStyle: 'short',
  hairColor: 'black',
  shirtColor: 'cyan',
  accentColor: 'gold',
  shortsColor: 'black',
}

export const skinToneOptions: PlayerSkinTone[] = [
  'light',
  'tan',
  'medium',
  'brown',
  'dark',
]
export const hairStyleOptions: PlayerHairStyle[] = [
  'short',
  'messy',
  'curly',
  'buzz',
  'ponytail',
  'cap',
  'bald',
]
export const hairColorOptions: PlayerHairColor[] = [
  'black',
  'brown',
  'blonde',
  'red',
  'gray',
  'blue',
  'pink',
]
export const shirtColorOptions: PlayerShirtColor[] = [
  'cyan',
  'blue',
  'red',
  'pink',
  'yellow',
  'green',
  'purple',
  'black',
  'white',
]
export const accentColorOptions: PlayerAccentColor[] = [
  'gold',
  'cyan',
  'pink',
  'navy',
  'orange',
  'lime',
]

const skinColors: Record<PlayerSkinTone, [number, number]> = {
  light: [0xf3cda4, 0xd89d73],
  tan: [0xf0bd91, 0xd99268],
  medium: [0xc98760, 0x9f6047],
  brown: [0xa96f50, 0x7e4d3b],
  dark: [0x744836, 0x533126],
}

const hairColors: Record<PlayerHairColor, number> = {
  black: 0x17283b,
  brown: 0x59382f,
  blonde: 0xc08a38,
  red: 0xa94635,
  gray: 0xd8d0ba,
  blue: 0x2f746b,
  pink: 0xb94c83,
}

const shirtColors: Record<PlayerShirtColor, [number, number]> = {
  cyan: [0x25b9c7, 0x147582],
  blue: [0x198bd5, 0x0e5f9d],
  red: [0xdf4b4b, 0x9c303d],
  pink: [0xe4588d, 0xa83263],
  yellow: [0xf2c84b, 0xb98727],
  green: [0x35a970, 0x20724f],
  purple: [0x7868ba, 0x4c3f84],
  black: [0x253344, 0x101a27],
  white: [0xf7f3e7, 0xbfcbd0],
}

const accentColors: Record<PlayerAccentColor, number> = {
  gold: 0xf2c84b,
  cyan: 0x78e5ff,
  pink: 0xe54872,
  navy: 0x16324f,
  orange: 0xe78c3f,
  lime: 0x8fd26e,
}

export function getCosmeticCssColor(
  type: 'skin' | 'hair' | 'shirt' | 'accent',
  value: string,
): string {
  const color =
    type === 'skin'
      ? skinColors[value as PlayerSkinTone]?.[0]
      : type === 'hair'
        ? hairColors[value as PlayerHairColor]
        : type === 'shirt'
          ? shirtColors[value as PlayerShirtColor]?.[0]
          : accentColors[value as PlayerAccentColor]
  return `#${(color ?? 0x16324f).toString(16).padStart(6, '0')}`
}

export function mapCosmeticsToMatchVisual(
  cosmetics: PlayerCosmetics,
): PlayerVisualProfileOverride {
  const skin = skinColors[cosmetics.skinTone]
  const shirt = shirtColors[cosmetics.shirtColor]
  const shorts = shirtColors[cosmetics.shortsColor]
  return {
    hairStyle: matchHairStyle(cosmetics.hairStyle),
    hairColor: hairColors[cosmetics.hairColor],
    skinColor: skin[0],
    skinShadeColor: skin[1],
    shirtColor: shirt[0],
    shirtShadeColor: shirt[1],
    trimColor: accentColors[cosmetics.accentColor],
    shortsColor: shorts[0],
  }
}

function matchHairStyle(
  style: PlayerHairStyle,
): PlayerVisualProfileOverride['hairStyle'] {
  switch (style) {
    case 'messy':
      return 'spikes'
    case 'curly':
    case 'ponytail':
      return 'bob'
    case 'cap':
      return 'swoop'
    case 'bald':
    case 'buzz':
    case 'short':
      return 'crop'
  }
}
