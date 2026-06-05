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
): PlayerVisualProfile {
  const hash = [...playerId].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  )

  return {
    hairStyle: hairStyleOrder[hash % hairStyleOrder.length],
    hairColor: hairColorPalette[hash % hairColorPalette.length],
    stickStyle: stickStyle ?? stickStyleForPlayer(playerId, role),
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
