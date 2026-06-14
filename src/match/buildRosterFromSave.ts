import type {
  PlayerArchetype,
  PlayerPlayStyle,
  PlayerRosterEntry,
} from '../game/data/matchTypes'
import type { OpponentTeam } from '../game/data/opponentTeams'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import { getStickType } from '../equipment/stickTypes'
import { mapCreatedPlayerAttributesToMatchAttributes } from '../player/playerAttributeAdapter'
import { mapCosmeticsToMatchVisual } from '../player/playerCosmetics'
import type { SaveGame } from '../save/saveTypes'

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

  if (save?.settings.createdPlayerComplete) {
    const player = save.player
    const targetId =
      player.primaryRole === 'keeper'
        ? 'a-keeper'
        : player.primaryRole === 'striker'
          ? 'a-striker'
          : 'a-support'
    const entry = teamA.find((candidate) => candidate.id === targetId)

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
