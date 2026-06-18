import {
  getEquipmentItem,
} from '../equipment/equipmentCatalog.ts'
import { getStickType } from '../equipment/stickTypes.ts'
import type {
  EquipmentItem,
} from '../equipment/equipmentTypes'
import type {
  PlayerRole,
} from '../game/data/matchTypes'
import type {
  CreatedPlayer,
  CreatedPlayerAttributes,
  EquipmentSlot,
  PlayerAttributeKey,
  SaveGame,
  TeamRosterLoadout,
  TeamRosterLoadouts,
  TeamRosterSlotId,
} from '../save/saveTypes'
import {
  equipmentSlotKeys,
  playerAttributeDefault,
  playerAttributeKeys,
  playerAttributeMin,
  playerEffectiveAttributeMax,
  teamRosterSlotIds,
} from '../save/saveTypes.ts'

export type TeamRosterSlotProfile = {
  slotId: TeamRosterSlotId
  role: PlayerRole
  roleLabel: string
  name: string
  meta: string
  isCreatedPlayer: boolean
}

export function createEmptyRosterLoadout(): TeamRosterLoadout {
  return {
    equipment: {
      stickId: null,
      shieldId: null,
      shoesId: null,
      armorId: null,
    },
  }
}

export function createDefaultRosterLoadouts(): TeamRosterLoadouts {
  return teamRosterSlotIds.reduce((loadouts, slotId) => {
    loadouts[slotId] = createEmptyRosterLoadout()
    return loadouts
  }, {} as TeamRosterLoadouts)
}

export function getCreatedPlayerRosterSlot(
  player: Pick<CreatedPlayer, 'primaryRole'>,
): TeamRosterSlotId {
  if (player.primaryRole === 'keeper') {
    return 'a-keeper'
  }

  return player.primaryRole === 'striker' ? 'a-striker' : 'a-support'
}

export function isTeamRosterSlotId(
  value: string,
): value is TeamRosterSlotId {
  return teamRosterSlotIds.some((slotId) => slotId === value)
}

export function getTeamRosterLoadout(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): Record<EquipmentSlot, string | null> {
  if (slotId === getCreatedPlayerRosterSlot(save.player)) {
    return save.equipment.equipped
  }

  return (
    save.team.rosterLoadouts[slotId]?.equipment ??
    createEmptyRosterLoadout().equipment
  )
}

export function getTeamRosterSlotProfile(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): TeamRosterSlotProfile {
  const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)

  if (slotId === createdPlayerSlotId) {
    return {
      slotId,
      role: save.player.primaryRole,
      roleLabel:
        save.player.primaryRole === 'keeper'
          ? 'Keeper'
          : 'Captain Fielder',
      name: save.player.name,
      meta:
        `#${save.player.jerseyNumber} / ` +
        `${titleCase(save.player.archetype)} / ` +
        `${titleCase(save.player.handedness)} handed`,
      isCreatedPlayer: true,
    }
  }

  switch (slotId) {
    case 'a-keeper':
      return {
        slotId,
        role: 'keeper',
        roleLabel: 'Keeper',
        name: 'House Keeper',
        meta: 'AI keeper until keeper signings exist.',
        isCreatedPlayer: false,
      }
    case 'a-support':
      return {
        slotId,
        role: 'support',
        roleLabel: 'Support Fielder',
        name: 'House Support',
        meta: 'AI support slot until the free-agent pool lands.',
        isCreatedPlayer: false,
      }
    case 'a-striker':
      return {
        slotId,
        role: 'striker',
        roleLabel: 'Lead Fielder',
        name: 'House Striker',
        meta: 'AI scoring slot until field signings exist.',
        isCreatedPlayer: false,
      }
  }
}

export function getLoadoutItemIds(
  equipment: Record<EquipmentSlot, string | null>,
): string[] {
  return equipmentSlotKeys
    .map((slot) => equipment[slot])
    .filter((id): id is string => Boolean(id))
}

export function getLoadoutItems(
  equipment: Record<EquipmentSlot, string | null>,
): EquipmentItem[] {
  return getLoadoutItemIds(equipment)
    .map((id) => getEquipmentItem(id))
    .filter((item): item is EquipmentItem => item !== null)
}

export function getLoadoutAttributeModifiers(
  equipment: Record<EquipmentSlot, string | null>,
): Partial<Record<PlayerAttributeKey, number>> {
  const modifiers: Partial<Record<PlayerAttributeKey, number>> = {}
  const stickId = equipment.stickId

  if (stickId) {
    addModifiers(modifiers, getStickType(stickId).attributeModifiers)
  }

  for (const slot of ['shieldId', 'shoesId', 'armorId'] satisfies EquipmentSlot[]) {
    const item = getEquipmentItem(equipment[slot])

    if (item) {
      addModifiers(modifiers, item.modifiers)
    }
  }

  return modifiers
}

export function applyLoadoutModifiersToCreatedAttributes(
  base: CreatedPlayerAttributes,
  equipment: Record<EquipmentSlot, string | null>,
): CreatedPlayerAttributes {
  const attributes = structuredClone(base)
  const modifiers = getLoadoutAttributeModifiers(equipment)

  for (const key of playerAttributeKeys) {
    attributes[key] = clampEffectiveAttribute(
      attributes[key] + (modifiers[key] ?? 0),
    )
  }

  return attributes
}

export function createNeutralRosterAttributes(): CreatedPlayerAttributes {
  return {
    speed: playerAttributeDefault,
    reaction: playerAttributeDefault,
    shotPower: playerAttributeDefault,
    shotAccuracy: playerAttributeDefault,
    shotSpin: playerAttributeDefault,
    toughness: playerAttributeDefault,
  }
}

export function findLoadoutOwner(
  save: SaveGame,
  itemId: string,
): TeamRosterSlotId | null {
  for (const slotId of teamRosterSlotIds) {
    if (getLoadoutItemIds(getTeamRosterLoadout(save, slotId)).includes(itemId)) {
      return slotId
    }
  }

  return null
}

function addModifiers(
  target: Partial<Record<PlayerAttributeKey, number>>,
  modifiers: Partial<Record<PlayerAttributeKey, number>>,
): void {
  for (const [key, value] of Object.entries(modifiers)) {
    const attributeKey = key as PlayerAttributeKey
    target[attributeKey] = (target[attributeKey] ?? 0) + (value ?? 0)
  }
}

function clampEffectiveAttribute(value: number): number {
  return Math.min(
    playerEffectiveAttributeMax,
    Math.max(playerAttributeMin, value),
  )
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
