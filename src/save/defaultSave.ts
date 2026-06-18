import { defaultPlayerCosmetics } from '../player/playerCosmetics.ts'
import { createDefaultTeamIdentity } from '../franchise/teamIdentity.ts'
import type {
  CreatedPlayer,
  CreatedPlayerArchetype,
  CreatedPlayerAttributes,
  PlayerAttributeKey,
  PlayerCosmetics,
  PlayerStatLine,
  SaveGame,
} from './saveTypes'
import { playerAttributeDefault } from './saveTypes.ts'

const roleAdjustments: Record<
  CreatedPlayerArchetype,
  Partial<Record<PlayerAttributeKey, number>>
> = {
  striker: {
    speed: 1,
    shotPower: 3,
    shotAccuracy: 2,
    toughness: -2,
    reaction: -1,
  },
  support: {
    reaction: 2,
    shotAccuracy: 2,
    shotSpin: 3,
    shotPower: -2,
    toughness: -1,
  },
  brute: {
    toughness: 4,
    shotPower: 2,
    speed: -2,
    shotAccuracy: -2,
    shotSpin: -1,
  },
  technician: {
    shotSpin: 4,
    shotAccuracy: 2,
    reaction: 1,
    toughness: -2,
    shotPower: -1,
  },
  keeper: {
    reaction: 4,
    toughness: 3,
    shotPower: 1,
    speed: -2,
    shotSpin: -2,
  },
}

export function createStartingAttributes(
  archetype: CreatedPlayerArchetype,
): CreatedPlayerAttributes {
  const attributes: CreatedPlayerAttributes = {
    speed: playerAttributeDefault,
    reaction: playerAttributeDefault,
    shotPower: playerAttributeDefault,
    shotAccuracy: playerAttributeDefault,
    shotSpin: playerAttributeDefault,
    toughness: playerAttributeDefault,
  }

  for (const [key, adjustment] of Object.entries(
    roleAdjustments[archetype],
  )) {
    attributes[key as PlayerAttributeKey] += adjustment ?? 0
  }

  return attributes
}

export function roleForArchetype(
  archetype: CreatedPlayerArchetype,
): CreatedPlayer['primaryRole'] {
  return archetype === 'technician' ? 'support' : archetype
}

export function createCreatedPlayer(input: {
  name: string
  jerseyNumber: number
  handedness: CreatedPlayer['handedness']
  archetype: CreatedPlayerArchetype
  cosmetics: PlayerCosmetics
  attributes: CreatedPlayerAttributes
  selectedStickId: string
}): CreatedPlayer {
  return {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `player-${Date.now()}`,
    name: input.name.trim(),
    jerseyNumber: input.jerseyNumber,
    handedness: input.handedness,
    primaryRole: roleForArchetype(input.archetype),
    archetype: input.archetype,
    cosmetics: structuredClone(input.cosmetics),
    attributes: structuredClone(input.attributes),
    selectedStickId: input.selectedStickId,
  }
}

export function createEmptyPlayerStats(): PlayerStatLine {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    bankShotGoals: 0,
    saves: 0,
    steals: 0,
    turnovers: 0,
    hitsTaken: 0,
    slashes: 0,
    successfulGathers: 0,
    fumbles: 0,
  }
}

export function createNewSave(
  player: CreatedPlayer,
  unspentStartingPoints = 0,
): SaveGame {
  const timestamp = new Date().toISOString()
  const careerStats = createEmptyPlayerStats()

  return {
    version: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    player: structuredClone(player),
    wallet: {
      money: 100,
    },
    progression: {
      xp: 0,
      level: 1,
      unspentAttributePoints: Math.max(0, unspentStartingPoints),
    },
    equipment: {
      equipped: {
        stickId: player.selectedStickId,
        shieldId: null,
        shoesId: null,
        armorId: null,
      },
      inventory: [player.selectedStickId],
    },
    team: createDefaultTeamIdentity(player),
    league: {
      currentLeagueId: 'rookie_circuit',
      unlockedLeagueIds: ['rookie_circuit'],
      record: {
        wins: 0,
        losses: 0,
      },
      rookieCircuit: {
        currentOpponentIndex: 0,
        defeatedOpponentTeamIds: [],
        completed: false,
      },
    },
    seasonStats: {
      seasonId: 'rookie-season-1',
      ...structuredClone(careerStats),
    },
    stats: careerStats,
    leagueStats: {
      rookie_circuit: {
        leagueName: 'Rookie Circuit',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        bankShotGoals: 0,
        championships: 0,
      },
    },
    settings: {
      createdPlayerComplete: true,
    },
  }
}

export { defaultPlayerCosmetics }
