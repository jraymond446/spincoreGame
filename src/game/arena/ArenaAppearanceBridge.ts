import type { HairStyleId } from '../data/hairStyles'
import type {
  PlayerRole,
  PlayerVisualProfileOverride,
} from '../data/matchTypes'
import type {
  ArenaBodyId,
  ArenaHairId,
} from './ArenaCharacterAssets'
import type {
  HairAssetId,
  PlayerAppearance,
  PresentationGender,
} from '../../player/playerAppearanceTypes'

export type ArenaUniformIdentity = {
  primary: number
  accent: number
  shorts?: number
}

export type ArenaAppearanceIdentity = {
  presentation: PresentationGender
  bodyId: PlayerAppearance['bodyId']
  arenaBodyId: ArenaBodyId
  skinColor: number
  hairStyleId: HairAssetId
  arenaHairId: ArenaHairId
  proceduralHairStyle: HairStyleId
  hairColor: number
  faceId?: string
  role: PlayerRole
  visualProfile: PlayerVisualProfileOverride
}

export function bridgeAppearanceToArena(
  appearance: PlayerAppearance,
  role: PlayerRole,
  uniform: ArenaUniformIdentity,
): ArenaAppearanceIdentity {
  const skinColor = parseHexColor(appearance.skinColor, 0xd59a6f)
  const hairColor = parseHexColor(appearance.hairColor, 0x674536)
  const proceduralHairStyle = mapMenuHairToArena(appearance.hairId)
  const arenaHairId = mapMenuHairToArenaAsset(appearance.hairId)

  return {
    presentation: appearance.presentation,
    bodyId: appearance.bodyId,
    arenaBodyId: 'field-player-01',
    skinColor,
    hairStyleId: appearance.hairId,
    arenaHairId,
    proceduralHairStyle,
    hairColor,
    faceId: appearance.faceId,
    role,
    visualProfile: {
      presentation: appearance.presentation,
      bodyId: appearance.bodyId,
      arenaBodyId: 'field-player-01',
      arenaHairId,
      faceId: appearance.faceId,
      hairStyle: proceduralHairStyle,
      hairColor,
      skinColor,
      skinShadeColor: shadeColor(skinColor, 0.76),
      shirtColor: uniform.primary,
      shirtShadeColor: shadeColor(uniform.primary, 0.68),
      trimColor: uniform.accent,
      shortsColor: uniform.shorts ?? shadeColor(uniform.primary, 0.58),
    },
  }
}

export function mapMenuHairToArenaAsset(
  _hairId: HairAssetId,
): ArenaHairId {
  return 'arena-hair-01'
}

export function mapMenuHairToArena(hairId: HairAssetId): HairStyleId {
  switch (hairId) {
    case 'hair02':
      return 'spikes'
    case 'hair03':
      return 'bob'
    case 'hair04':
      return 'swoop'
    case 'hair01':
      return 'crop'
  }
}

export function parseHexColor(value: string, fallback: number): number {
  const normalized = value.trim().replace(/^#/, '')

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return fallback
  }

  return Number.parseInt(normalized, 16)
}

export function shadeColor(color: number, multiplier: number): number {
  const red = Math.round(((color >> 16) & 0xff) * multiplier)
  const green = Math.round(((color >> 8) & 0xff) * multiplier)
  const blue = Math.round((color & 0xff) * multiplier)

  return (red << 16) | (green << 8) | blue
}
