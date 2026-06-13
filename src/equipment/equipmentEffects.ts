import { equipmentCatalog } from './equipmentCatalog'
import { getStickType } from './stickTypes'
import type { SaveGame } from '../save/saveTypes'
import {
  playerAttributeKeys,
  type CreatedPlayerAttributes,
} from '../save/saveTypes'

export function getEffectivePlayerAttributes(
  save: SaveGame,
): CreatedPlayerAttributes {
  const attributes = structuredClone(save.player.attributes)
  const equippedIds = [
    save.equipment.equipped.shieldId,
    save.equipment.equipped.shoesId,
  ].filter(
    (id): id is string => Boolean(id),
  )
  const stick = getStickType(save.player.selectedStickId)

  for (const key of playerAttributeKeys) {
    attributes[key] = Math.min(
      99,
      Math.max(1, attributes[key] + (stick.attributeModifiers[key] ?? 0)),
    )
  }

  for (const id of equippedIds) {
    const item = equipmentCatalog.find((candidate) => candidate.id === id)

    if (!item) {
      continue
    }

    for (const key of playerAttributeKeys) {
      attributes[key] = Math.min(
        99,
        Math.max(1, attributes[key] + (item.modifiers[key] ?? 0)),
      )
    }
  }

  return attributes
}
