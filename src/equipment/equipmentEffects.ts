import { equipmentCatalog } from './equipmentCatalog'
import type { SaveGame } from '../save/saveTypes'
import {
  playerAttributeKeys,
  type CreatedPlayerAttributes,
} from '../save/saveTypes'

export function getEffectivePlayerAttributes(
  save: SaveGame,
): CreatedPlayerAttributes {
  const attributes = structuredClone(save.player.attributes)
  const equippedIds = Object.values(save.equipment.equipped).filter(
    (id): id is string => Boolean(id),
  )

  for (const id of equippedIds) {
    const item = equipmentCatalog.find((candidate) => candidate.id === id)

    if (!item) {
      continue
    }

    for (const key of playerAttributeKeys) {
      attributes[key] = Math.min(
        99,
        attributes[key] + (item.modifiers[key] ?? 0),
      )
    }
  }

  return attributes
}

