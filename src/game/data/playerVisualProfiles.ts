import { hairColorPalette } from './visualPalettes'
import { hairStyleOrder, type HairStyleId } from './hairStyles'
import type {
  PlayerRole,
  PlayerVisualProfileOverride,
  StickStyle,
} from './matchTypes'

export type PlayerVisualProfile = {
  presentation: 'masc' | 'fem'
  bodyId: 'mascStriker01'
  arenaBodyId: 'field-player-01'
  arenaHairId: 'arena-hair-01'
  faceId?: string
  hairStyle: HairStyleId
  hairColor: number
  stickStyle: StickStyle
  skinColor?: number
  skinShadeColor?: number
  shirtColor?: number
  shirtShadeColor?: number
  trimColor?: number
  shortsColor?: number
}

export const arenaHairIdByMenuStyle: Record<
  HairStyleId,
  PlayerVisualProfile['arenaHairId']
> = {
  crop: 'arena-hair-01',
  spikes: 'arena-hair-01',
  swoop: 'arena-hair-01',
  tuft: 'arena-hair-01',
  bob: 'arena-hair-01',
}

export function createPlayerVisualProfile(
  playerId: string,
  role: PlayerRole,
  stickStyle?: StickStyle,
  visualPreset?: string,
  override?: PlayerVisualProfileOverride,
): PlayerVisualProfile {
  const hash = [...playerId].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  )

  const preset = getVisualPreset(visualPreset)
  const hairStyle =
    override?.hairStyle ??
    preset?.hairStyle ??
    hairStyleOrder[hash % hairStyleOrder.length]

  return {
    presentation: override?.presentation ?? 'masc',
    bodyId: override?.bodyId ?? 'mascStriker01',
    arenaBodyId: override?.arenaBodyId ?? 'field-player-01',
    arenaHairId:
      override?.arenaHairId ?? arenaHairIdByMenuStyle[hairStyle],
    faceId: override?.faceId,
    hairStyle,
    hairColor:
      override?.hairColor ??
      preset?.hairColor ??
      hairColorPalette[hash % hairColorPalette.length],
    stickStyle: stickStyle ?? stickStyleForPlayer(playerId, role),
    skinColor: override?.skinColor,
    skinShadeColor: override?.skinShadeColor,
    shirtColor: override?.shirtColor,
    shirtShadeColor: override?.shirtShadeColor,
    trimColor: override?.trimColor,
    shortsColor: override?.shortsColor,
  }
}

function getVisualPreset(
  preset: string | undefined,
): Pick<PlayerVisualProfile, 'hairStyle' | 'hairColor'> | null {
  switch (preset) {
    case 'solarGold':
      return { hairStyle: 'swoop', hairColor: 0xc08a38 }
    case 'neonRose':
      return { hairStyle: 'tuft', hairColor: 0x72538d }
    case 'deepCourt':
      return { hairStyle: 'crop', hairColor: 0x17283b }
    case 'circuitBlue':
      return { hairStyle: 'spikes', hairColor: 0x2f746b }
    default:
      return null
  }
}

function stickStyleForPlayer(
  playerId: string,
  role: PlayerRole,
): StickStyle {
  if (role === 'keeper') {
    return 'cradle'
  }

  if (role === 'brute') {
    return 'hammer'
  }

  if (role === 'support') {
    return 'cradle'
  }

  return playerId.startsWith('b-') ? 'whip' : 'hook'
}
