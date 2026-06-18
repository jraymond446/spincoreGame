import type {
  PlayerArchetype,
  PlayerAttributes,
  PlayerPlayStyle,
  PlayerRosterEntry,
} from '../game/data/matchTypes'
import { playerArchetypes } from '../game/data/playerArchetypes.ts'
import type { OpponentTeam } from '../game/data/opponentTeams'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects.ts'
import { getStickType } from '../equipment/stickTypes.ts'
import {
  applyLoadoutModifiersToCreatedAttributes,
  createNeutralRosterAttributes,
  getCreatedPlayerRosterSlot,
  getTeamRosterLoadout,
  isTeamRosterSlotId,
} from '../franchise/teamRoster.ts'
import { mapCreatedPlayerAttributesToMatchAttributes } from '../player/playerAttributeAdapter.ts'
import { mapCosmeticsToMatchVisual } from '../player/playerCosmetics.ts'
import type { EquipmentSlot, SaveGame, TeamRosterSlotId } from '../save/saveTypes'

export type MatchRosterOverrides = {
  teams: {
    teamAPlayerId: string | null
    opponentTeamId: string | null
  }
  archetypes: Map<string, PlayerArchetype>
}

export function applyMatchRosterOverrides(
  teamA: PlayerRosterEntry[],
  teamB: PlayerRosterEntry[],
  save: SaveGame | undefined,
  opponent: OpponentTeam | undefined,
): MatchRosterOverrides {
  const archetypes = new Map<string, PlayerArchetype>()
  let teamAPlayerId: string | null = null
  const createdPlayerSlotId = save?.settings.createdPlayerComplete
    ? getCreatedPlayerRosterSlot(save.player)
    : null

  if (save?.settings.createdPlayerComplete) {
    const player = save.player
    const entry = teamA.find(
      (candidate) => candidate.id === createdPlayerSlotId,
    )

    if (entry) {
      for (const teammate of teamA) {
        teammate.controllerType = 'ai'
      }

      const stick = getStickType(
        save.equipment.equipped.stickId ?? player.selectedStickId,
      )
      entry.controllerType = 'human'
      entry.role = player.primaryRole
      entry.archetypeId = player.primaryRole
      entry.handedness = player.handedness
      entry.playStyle = playStyleForArchetype(player.archetype)
      entry.stickStyle = stick.visualStyle
      entry.displayName = player.name
      entry.jerseyNumber = player.jerseyNumber
      entry.visualProfile = mapCosmeticsToMatchVisual(player.cosmetics)
      teamAPlayerId = entry.id
      archetypes.set(entry.id, {
        id: player.primaryRole,
        role: player.primaryRole,
        defaultHandedness: player.handedness,
        defaultPlayStyle: entry.playStyle,
        attributes: mapCreatedPlayerAttributesToMatchAttributes(
          getEffectivePlayerAttributes(save),
        ),
      })
    }

    applyTeamLoadoutsToAiRoster(
      teamA,
      save,
      createdPlayerSlotId,
      archetypes,
    )
  }

  if (opponent) {
    opponent.players.forEach((player, index) => {
      const entry = teamB[index]

      if (!entry) {
        return
      }

      entry.id = `b-${player.role === 'support' || player.role === 'brute' ? 'flex' : player.role}`
      entry.role = player.role
      entry.archetypeId = player.role
      entry.handedness = player.handedness
      entry.playStyle = player.playStyle
      entry.stickStyle = player.stickStyle
      entry.displayName = player.name
      entry.jerseyNumber = player.jerseyNumber
      archetypes.set(entry.id, {
        id: player.role,
        role: player.role,
        defaultHandedness: player.handedness,
        defaultPlayStyle: player.playStyle,
        attributes: { ...player.attributes },
      })
    })
  }

  return {
    teams: {
      teamAPlayerId,
      opponentTeamId: opponent?.id ?? null,
    },
    archetypes,
  }
}

function applyTeamLoadoutsToAiRoster(
  teamA: PlayerRosterEntry[],
  save: SaveGame,
  createdPlayerSlotId: TeamRosterSlotId | null,
  archetypes: Map<string, PlayerArchetype>,
): void {
  for (const entry of teamA) {
    if (
      !isTeamRosterSlotId(entry.id) ||
      entry.id === createdPlayerSlotId
    ) {
      continue
    }

    const equipment = getTeamRosterLoadout(save, entry.id)

    if (equipment.stickId) {
      entry.stickStyle = getStickType(equipment.stickId).visualStyle
    }

    if (!hasAssignedGear(equipment)) {
      continue
    }

    const base = playerArchetypes[entry.archetypeId]
    archetypes.set(entry.id, {
      ...base,
      id: entry.archetypeId,
      role: entry.role,
      defaultHandedness: entry.handedness,
      defaultPlayStyle: entry.playStyle,
      attributes: applyLoadoutDeltasToMatchAttributes(
        base.attributes,
        equipment,
      ),
    })
  }
}

function applyLoadoutDeltasToMatchAttributes(
  base: PlayerAttributes,
  equipment: Record<EquipmentSlot, string | null>,
): PlayerAttributes {
  const neutral = createNeutralRosterAttributes()
  const neutralRuntime =
    mapCreatedPlayerAttributesToMatchAttributes(neutral)
  const boostedRuntime =
    mapCreatedPlayerAttributesToMatchAttributes(
      applyLoadoutModifiersToCreatedAttributes(neutral, equipment),
    )
  const result = { ...base }

  for (const key of runtimeAttributeKeys) {
    result[key] = clampRuntimeAttribute(
      base[key] + boostedRuntime[key] - neutralRuntime[key],
    )
  }

  return result
}

function hasAssignedGear(
  equipment: Record<EquipmentSlot, string | null>,
): boolean {
  return Object.values(equipment).some(Boolean)
}

const runtimeAttributeKeys: Array<keyof PlayerAttributes> = [
  'speed',
  'control',
  'passing',
  'shooting',
  'defense',
  'power',
  'accuracy',
  'reaction',
  'ballHandling',
  'toughness',
]

function clampRuntimeAttribute(value: number): number {
  return Math.min(1.6, Math.max(0.42, value))
}

function playStyleForArchetype(
  archetype: SaveGame['player']['archetype'],
): PlayerPlayStyle {
  switch (archetype) {
    case 'keeper':
      return 'tight'
    case 'support':
      return 'creative'
    case 'technician':
      return 'technical'
    case 'brute':
      return 'disruptive'
    default:
      return 'aggressive'
  }
}
