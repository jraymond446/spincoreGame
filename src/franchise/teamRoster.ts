import {
  getEquipmentItem,
} from '../equipment/equipmentCatalog.ts'
import {
  getInventoryItemCount,
} from '../equipment/equipmentInventory.ts'
import { getStickType } from '../equipment/stickTypes.ts'
import {
  getFreeAgent,
  type FreeAgent,
} from './freeAgentCatalog.ts'
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
  TeamRosterAssignments,
  TeamRosterSlotId,
} from '../save/saveTypes'
import {
  activeTeamRosterSlotIds,
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
  isSignedPlayer: boolean
  isOpen: boolean
  signedPlayerId: string | null
}

export type TeamRosterReadiness = {
  ready: boolean
  activePlayerCount: number
  requiredActivePlayerCount: number
  missingActiveSlotIds: TeamRosterSlotId[]
  missingActiveSlotLabels: string[]
  message: string
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

export function createDefaultRosterAssignments(): TeamRosterAssignments {
  return teamRosterSlotIds.reduce((assignments, slotId) => {
    assignments[slotId] = null
    return assignments
  }, {} as TeamRosterAssignments)
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
  const signedPlayer = getSignedRosterPlayer(save, slotId)

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
      isSignedPlayer: false,
      isOpen: false,
      signedPlayerId: null,
    }
  }

  if (signedPlayer) {
    return {
      slotId,
      role: signedPlayer.role,
      roleLabel: rosterRoleLabel(slotId, signedPlayer.role),
      name: signedPlayer.name,
      meta:
        `#${signedPlayer.jerseyNumber} / ` +
        `${titleCase(signedPlayer.playStyle)} / ` +
        `${titleCase(signedPlayer.handedness)} handed`,
      isCreatedPlayer: false,
      isSignedPlayer: true,
      isOpen: false,
      signedPlayerId: signedPlayer.id,
    }
  }

  if (slotId === 'bench') {
    return {
      slotId,
      role: 'support',
      roleLabel: 'Bench',
      name: 'Open Bench',
      meta: 'Optional reserve slot. Bench players do not enter 3v3 matches yet.',
      isCreatedPlayer: false,
      isSignedPlayer: false,
      isOpen: true,
      signedPlayerId: null,
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
        isSignedPlayer: false,
        isOpen: false,
        signedPlayerId: null,
      }
    case 'a-support':
      return {
        slotId,
        role: 'support',
        roleLabel: 'Support Fielder',
        name: 'House Support',
        meta: 'AI support slot until the free-agent pool lands.',
        isCreatedPlayer: false,
        isSignedPlayer: false,
        isOpen: false,
        signedPlayerId: null,
      }
    case 'a-striker':
      return {
        slotId,
        role: 'striker',
        roleLabel: 'Lead Fielder',
        name: 'House Striker',
        meta: 'AI scoring slot until field signings exist.',
        isCreatedPlayer: false,
        isSignedPlayer: false,
        isOpen: false,
        signedPlayerId: null,
      }
  }
}

export function getSignedRosterPlayer(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): FreeAgent | null {
  return getFreeAgent(save.team.rosterAssignments[slotId])
}

export function getSignedRosterSlotIds(save: SaveGame): TeamRosterSlotId[] {
  return teamRosterSlotIds.filter((slotId) =>
    Boolean(getSignedRosterPlayer(save, slotId)),
  )
}

export function isFreeAgentSigned(
  save: SaveGame,
  agentId: string,
): boolean {
  return teamRosterSlotIds.some(
    (slotId) => save.team.rosterAssignments[slotId] === agentId,
  )
}

export function getFirstAvailableRosterSlotForFreeAgent(
  save: SaveGame,
  agent: FreeAgent,
): TeamRosterSlotId | null {
  const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)

  if (
    agent.role === 'keeper' &&
    createdPlayerSlotId !== 'a-keeper' &&
    !save.team.rosterAssignments['a-keeper']
  ) {
    return 'a-keeper'
  }

  if (agent.role !== 'keeper') {
    for (const slotId of activeTeamRosterSlotIds) {
      if (
        slotId !== 'a-keeper' &&
        slotId !== createdPlayerSlotId &&
        !save.team.rosterAssignments[slotId]
      ) {
        return slotId
      }
    }
  }

  if (!save.team.rosterAssignments.bench) {
    return 'bench'
  }

  return null
}

export function canCutRosterSlot(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): boolean {
  return (
    slotId !== getCreatedPlayerRosterSlot(save.player) &&
    Boolean(getSignedRosterPlayer(save, slotId))
  )
}

export function getTeamRosterReadiness(
  save: SaveGame,
): TeamRosterReadiness {
  const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)
  const missingActiveSlotIds = activeTeamRosterSlotIds.filter(
    (slotId) =>
      slotId !== createdPlayerSlotId &&
      !getSignedRosterPlayer(save, slotId),
  )
  const missingActiveSlotLabels = missingActiveSlotIds.map(
    readinessSlotLabel,
  )
  const ready = missingActiveSlotIds.length === 0

  return {
    ready,
    activePlayerCount:
      activeTeamRosterSlotIds.length - missingActiveSlotIds.length,
    requiredActivePlayerCount: activeTeamRosterSlotIds.length,
    missingActiveSlotIds,
    missingActiveSlotLabels,
    message: ready
      ? 'Starting lineup ready.'
      : `Sign ${formatList(missingActiveSlotLabels)} before playing.`,
  }
}

export function getActiveRosterSlotIds(): readonly TeamRosterSlotId[] {
  return activeTeamRosterSlotIds
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
  return getLoadoutOwners(save, itemId)[0] ?? null
}

export function getLoadoutOwners(
  save: SaveGame,
  itemId: string,
): TeamRosterSlotId[] {
  return teamRosterSlotIds.filter((slotId) =>
    getLoadoutItemIds(getTeamRosterLoadout(save, slotId)).includes(itemId),
  )
}

export function getLoadoutAssignmentCount(
  save: SaveGame,
  itemId: string,
  options?: {
    excludeSlotId?: TeamRosterSlotId
  },
): number {
  return getLoadoutOwners(save, itemId).filter(
    (slotId) => slotId !== options?.excludeSlotId,
  ).length
}

export function getAvailableLoadoutCopies(
  save: SaveGame,
  itemId: string,
  options?: {
    excludeSlotId?: TeamRosterSlotId
  },
): number {
  return Math.max(
    0,
    getInventoryItemCount(save.equipment.inventory, itemId) -
      getLoadoutAssignmentCount(save, itemId, options),
  )
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

function rosterRoleLabel(
  slotId: TeamRosterSlotId,
  role: PlayerRole,
): string {
  if (slotId === 'bench') {
    return 'Bench'
  }

  if (role === 'keeper') {
    return 'Keeper'
  }

  if (role === 'brute') {
    return 'Power Fielder'
  }

  return role === 'striker' ? 'Lead Fielder' : 'Support Fielder'
}

function readinessSlotLabel(slotId: TeamRosterSlotId): string {
  switch (slotId) {
    case 'a-keeper':
      return 'a keeper'
    case 'a-support':
      return 'a support fielder'
    case 'a-striker':
      return 'a lead fielder'
    case 'bench':
      return 'a bench player'
  }
}

function formatList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? 'a starter'
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`
  }

  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`
}
