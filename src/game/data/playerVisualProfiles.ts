import { hairColorPalette } from './visualPalettes'
import { hairStyleOrder, type HairStyleId } from './hairStyles'
import type { PlayerRole, StickStyle } from './matchTypes'

export type PlayerVisualProfile = {
  hairStyle: HairStyleId
  hairColor: number
  stickStyle: StickStyle
}

export function createPlayerVisualProfile(
  playerId: string,
  role: PlayerRole,
  stickStyle?: StickStyle,
  visualPreset?: string,
): PlayerVisualProfile {
  const hash = [...playerId].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  )

  const preset = getVisualPreset(visualPreset)

  return {
    hairStyle:
      preset?.hairStyle ??
      hairStyleOrder[hash % hairStyleOrder.length],
    hairColor:
      preset?.hairColor ??
      hairColorPalette[hash % hairColorPalette.length],
    stickStyle: stickStyle ?? stickStyleForPlayer(playerId, role),
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
