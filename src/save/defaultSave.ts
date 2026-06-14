import { defaultPlayerCosmetics } from '../player/playerCosmetics'
import type {
  CreatedPlayer,
  CreatedPlayerArchetype,
  CreatedPlayerAttributes,
  PlayerAttributeKey,
  PlayerCosmetics,
  PlayerStatLine,
  SaveGame,
} from './saveTypes'

const roleAdjustments: Record<
  CreatedPlayerArchetype,
  Partial<Record<PlayerAttributeKey, number>>
> = {
  striker: {
    speed: 5,
    shotPower: 8,
    shotAccuracy: 7,
    toughness: -5,
    reaction: -2,
  },
  support: {
    reaction: 7,
    shotAccuracy: 5,
    shotSpin: 8,
    shotPower: -5,
    toughness: -3,
  },
  brute: {
    toughness: 10,
    shotPower: 6,
    speed: -4,
    shotAccuracy: -5,
    shotSpin: -3,
  },
  technician: {
    shotSpin: 10,
    shotAccuracy: 6,
    reaction: 4,
    toughness: -6,
    shotPower: -4,
  },
  keeper: {
    reaction: 10,
    toughness: 8,
    shotPower: 3,
    speed: -5,
    shotSpin: -5,
  },
}

export function createStartingAttributes(
  archetype: CreatedPlayerArchetype,
): CreatedPlayerAttributes {
  const attributes: CreatedPlayerAttributes = {
    speed: 50,
    reaction: 50,
    shotPower: 50,
    shotAccuracy: 50,
    shotSpin: 50,
    toughness: 50,
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
      },
      inventory: [player.selectedStickId],
    },
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
