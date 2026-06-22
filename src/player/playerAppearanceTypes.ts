import type {
  PlayerCosmetics,
  PlayerHairStyle,
} from '../save/saveTypes'
import {
  legacyAccentColorPalette,
  legacyHairColorPalette,
  legacyShirtColorPalette,
  legacySkinTonePalette,
} from './playerAppearancePalettes.ts'

export const presentationGenderIds = ['masc', 'fem'] as const
export type PresentationGender = (typeof presentationGenderIds)[number]

export const bodyAssetIds = ['mascStriker01'] as const
export type BodyAssetId = (typeof bodyAssetIds)[number]

export const hairAssetIds = [
  'hair01',
  'hair02',
  'hair03',
  'hair04',
] as const
export type HairAssetId = (typeof hairAssetIds)[number]

export type PlayerAppearance = {
  presentation: PresentationGender
  bodyId: BodyAssetId
  hairId: HairAssetId
  skinColor: string
  hairColor: string
  uniformPrimaryColor: string
  uniformAccentColor: string
  faceId?: string
  accessoryIds?: string[]
}

export const defaultPlayerAppearance: PlayerAppearance = {
  presentation: 'masc',
  bodyId: 'mascStriker01',
  hairId: 'hair01',
  skinColor: '#d59a6f',
  hairColor: '#674536',
  uniformPrimaryColor: '#169ca3',
  uniformAccentColor: '#f7f5ec',
}

export function createDefaultPlayerAppearance(): PlayerAppearance {
  return structuredClone(defaultPlayerAppearance)
}

export function appearanceFromCosmetics(
  cosmetics: PlayerCosmetics,
): PlayerAppearance {
  return {
    ...createDefaultPlayerAppearance(),
    skinColor: legacySkinTonePalette[cosmetics.skinTone],
    hairColor: legacyHairColorPalette[cosmetics.hairColor],
    hairId: hairAssetFromCosmeticStyle(cosmetics.hairStyle),
    uniformPrimaryColor: legacyShirtColorPalette[cosmetics.shirtColor],
    uniformAccentColor: legacyAccentColorPalette[cosmetics.accentColor],
  }
}

export function cosmeticHairStyleFromHairAsset(
  hairId: HairAssetId,
): PlayerHairStyle {
  switch (hairId) {
    case 'hair02':
      return 'messy'
    case 'hair03':
      return 'curly'
    case 'hair04':
      return 'buzz'
    case 'hair01':
      return 'short'
  }
}

function hairAssetFromCosmeticStyle(
  hairStyle: PlayerHairStyle,
): HairAssetId {
  switch (hairStyle) {
    case 'messy':
      return 'hair02'
    case 'curly':
    case 'ponytail':
      return 'hair03'
    case 'buzz':
    case 'cap':
    case 'bald':
      return 'hair04'
    case 'short':
      return 'hair01'
  }
}
