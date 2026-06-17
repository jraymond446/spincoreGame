import { equipmentCatalog } from './equipmentCatalog.ts'
import { getStickType } from './stickTypes.ts'
import type { SaveGame } from '../save/saveTypes'
import {
  playerAttributeMin,
  playerAttributeUltraMax,
  playerAttributeKeys,
  type CreatedPlayerAttributes,
} from '../save/saveTypes.ts'

export function getEffectivePlayerAttributes(
  save: SaveGame,
): CreatedPlayerAttributes {
  const attributes = structuredClone(save.player.attributes)
  const equippedIds = [
    save.equipment.equipped.shieldId,
    save.equipment.equipped.shoesId,
    save.equipment.equipped.armorId,
  ].filter(
    (id): id is string => Boolean(id),
  )
  const stick = getStickType(
    save.equipment.equipped.stickId ?? save.player.selectedStickId,
  )

  for (const key of playerAttributeKeys) {
    attributes[key] = clampEffectiveAttribute(
      attributes[key] + (stick.attributeModifiers[key] ?? 0),
    )
  }

  for (const id of equippedIds) {
    const item = equipmentCatalog.find((candidate) => candidate.id === id)

    if (!item) {
      continue
    }

    for (const key of playerAttributeKeys) {
      attributes[key] = clampEffectiveAttribute(
        attributes[key] + (item.modifiers[key] ?? 0),
      )
    }
  }

  return attributes
}

function clampEffectiveAttribute(value: number): number {
  return Math.min(
    playerAttributeUltraMax,
    Math.max(playerAttributeMin, value),
  )
}
