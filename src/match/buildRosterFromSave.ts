import type {
  PlayerArchetype,
  PlayerAttributes,
  PlayerPlayStyle,
  PlayerRosterEntry,
  StickStyle,
} from '../game/data/matchTypes'
import type { OpponentTeam } from '../game/data/opponentTeams'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
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

      entry.controllerType = 'human'
      entry.role = player.primaryRole
      entry.archetypeId = player.primaryRole
      entry.handedness = player.handedness
      entry.playStyle = playStyleForRole(player.primaryRole)
      entry.stickStyle = stickStyleForRole(player.primaryRole)
      entry.displayName = player.name
      entry.jerseyNumber = player.jerseyNumber
      entry.visualPreset = player.visualPreset
      teamAPlayerId = entry.id
      archetypes.set(entry.id, {
        id: player.primaryRole,
        role: player.primaryRole,
        defaultHandedness: player.handedness,
        defaultPlayStyle: entry.playStyle,
        attributes: toRuntimeAttributes(
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

function toRuntimeAttributes(
  attributes: SaveGame['player']['attributes'],
): PlayerAttributes {
  return {
    speed: runtimeValue(attributes.speed),
    control: runtimeValue(attributes.control),
    passing: runtimeValue(attributes.passing),
    shooting: runtimeValue(attributes.shooting),
    defense: runtimeValue(attributes.defense),
    power: runtimeValue(attributes.power),
    accuracy: runtimeValue(attributes.accuracy),
    reaction: runtimeValue(attributes.reaction),
    ballHandling: runtimeValue(attributes.ballHandling),
    toughness: runtimeValue(attributes.toughness),
  }
}

function runtimeValue(value: number): number {
  return Math.min(1.19, Math.max(0.21, 0.2 + value / 100))
}

function playStyleForRole(
  role: SaveGame['player']['primaryRole'],
): PlayerPlayStyle {
  switch (role) {
    case 'keeper':
      return 'tight'
    case 'support':
      return 'creative'
    case 'brute':
      return 'disruptive'
    default:
      return 'aggressive'
  }
}

function stickStyleForRole(
  role: SaveGame['player']['primaryRole'],
): StickStyle {
  switch (role) {
    case 'keeper':
    case 'support':
      return 'cradle'
    case 'brute':
      return 'hammer'
    default:
      return 'hook'
  }
}

