import type {
  BodyAssetId,
  HairAssetId,
  PresentationGender,
} from '../player/playerAppearanceTypes.ts'

export type CharacterAssetOffset = {
  x: number
  y: number
}

export type CharacterBodyDefinition = {
  id: BodyAssetId
  label: string
  assetPath: string
  presentation: PresentationGender
  role: 'striker' | 'support' | 'brute'
  pose: string
  skinRecoloring?: {
    maskPath: string
  }
  uniformRecoloring?: {
    primaryMaskPath: string
    accentMaskPath: string
  }
  fallbackPath?: string
}

export type CharacterHairDefinition = {
  id: HairAssetId
  label: string
  assetPath: string
  defaultColor?: string
  referenceLuminance?: number
  offset?: CharacterAssetOffset
  scale?: number
  fallbackPath?: string
}

export type CharacterAssetManifest = {
  canvas: {
    width: 512
    height: 512
    headCenter: CharacterAssetOffset
    hairSafeRegion: { x: number; y: number; width: number; height: number }
    faceSafeRegion: { x: number; y: number; width: number; height: number }
    feetBaseline: number
  }
  bodies: readonly CharacterBodyDefinition[]
  hair: readonly CharacterHairDefinition[]
  faces: readonly []
  accessories: readonly []
  teamLogos: readonly []
}

export const characterAssetManifest = {
  canvas: {
    width: 512,
    height: 512,
    headCenter: { x: 250, y: 124 },
    hairSafeRegion: { x: 120, y: 30, width: 275, height: 190 },
    faceSafeRegion: { x: 175, y: 82, width: 150, height: 145 },
    feetBaseline: 493,
  },
  bodies: [
    {
      id: 'mascStriker01',
      label: 'Masculine Striker Ready',
      assetPath:
        '/assets/characters/menu/processed/bodies/masc_striker_01.png',
      presentation: 'masc',
      role: 'striker',
      pose: 'ready',
      skinRecoloring: {
        maskPath: '/assets/characters/menu/processed/masks/skin-mask.png',
      },
      uniformRecoloring: {
        primaryMaskPath:
          '/assets/characters/menu/processed/masks/uniform-primary-mask.png',
        accentMaskPath:
          '/assets/characters/menu/processed/masks/uniform-accent-mask.png',
      },
    },
  ],
  // The sheets share a 512px canvas, but each silhouette needs pose-specific head fitting.
  hair: [
    {
      id: 'hair01',
      label: 'Velocity Spikes',
      assetPath:
        '/assets/characters/menu/processed/hair/masc_hair_01_luminance.png',
      defaultColor: '#674536',
      referenceLuminance: 93,
      offset: { x: 0, y: -55 },
      scale: 0.9,
    },
    {
      id: 'hair02',
      label: 'Side Sweep',
      assetPath:
        '/assets/characters/menu/processed/hair/masc_hair_02_luminance.png',
      defaultColor: '#674536',
      referenceLuminance: 94,
      offset: { x: -10, y: -82 },
      scale: 0.8,
    },
    {
      id: 'hair03',
      label: 'Wild Crest',
      assetPath:
        '/assets/characters/menu/processed/hair/masc_hair_03_luminance.png',
      defaultColor: '#674536',
      referenceLuminance: 89,
      offset: { x: -10, y: -108 },
      scale: 0.8,
    },
    {
      id: 'hair04',
      label: 'Split Crown',
      assetPath:
        '/assets/characters/menu/processed/hair/masc_hair_04_luminance.png',
      defaultColor: '#674536',
      referenceLuminance: 82,
      offset: { x: -3, y: -93 },
      scale: 0.72,
    },
  ],
  faces: [],
  accessories: [],
  teamLogos: [],
} as const satisfies CharacterAssetManifest

export function getCharacterBodyDefinition(
  id: BodyAssetId,
): CharacterBodyDefinition {
  return (
    characterAssetManifest.bodies.find((body) => body.id === id) ??
    characterAssetManifest.bodies[0]
  )
}

export function getCharacterHairDefinition(
  id: HairAssetId,
): CharacterHairDefinition {
  return (
    characterAssetManifest.hair.find((hair) => hair.id === id) ??
    characterAssetManifest.hair[0]
  )
}
