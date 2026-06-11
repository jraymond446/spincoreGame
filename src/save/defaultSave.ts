import type {
  CreatedPlayer,
  CreatedPlayerAttributes,
  PlayerAttributeKey,
  PlayerVisualPreset,
  SaveGame,
} from './saveTypes'

const roleAdjustments: Record<
  CreatedPlayer['primaryRole'],
  Partial<Record<PlayerAttributeKey, number>>
> = {
  striker: {
    shooting: 10,
    speed: 5,
    accuracy: 5,
    defense: -5,
    passing: -5,
  },
  support: {
    passing: 10,
    control: 5,
    ballHandling: 5,
    power: -5,
    shooting: -5,
  },
  brute: {
    power: 10,
    toughness: 10,
    defense: 5,
    passing: -5,
    accuracy: -5,
  },
  keeper: {
    reaction: 10,
    defense: 10,
    toughness: 5,
    shooting: -10,
  },
}

export function createStartingAttributes(
  role: CreatedPlayer['primaryRole'],
): CreatedPlayerAttributes {
  const attributes: CreatedPlayerAttributes = {
    speed: 50,
    control: 50,
    passing: 50,
    shooting: 50,
    defense: 50,
    power: 50,
    accuracy: 50,
    reaction: 50,
    ballHandling: 50,
    toughness: 50,
  }

  for (const [key, adjustment] of Object.entries(roleAdjustments[role])) {
    attributes[key as PlayerAttributeKey] += adjustment ?? 0
  }

  return attributes
}

export function createCreatedPlayer(input: {
  name: string
  jerseyNumber: number
  handedness: CreatedPlayer['handedness']
  primaryRole: CreatedPlayer['primaryRole']
  visualPreset: PlayerVisualPreset
}): CreatedPlayer {
  return {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `player-${Date.now()}`,
    name: input.name.trim(),
    jerseyNumber: input.jerseyNumber,
    handedness: input.handedness,
    primaryRole: input.primaryRole,
    visualPreset: input.visualPreset,
    attributes: createStartingAttributes(input.primaryRole),
  }
}

export function createNewSave(player: CreatedPlayer): SaveGame {
  const timestamp = new Date().toISOString()

  return {
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    player: structuredClone(player),
    wallet: {
      money: 100,
    },
    progression: {
      xp: 0,
      level: 1,
      unspentAttributePoints: 5,
    },
    equipment: {
      equipped: {
        stickId: 'backyard-cesta',
        shieldId: null,
        shoesId: null,
      },
      inventory: ['backyard-cesta'],
    },
    league: {
      currentLeagueId: 'local-circuit',
      unlockedLeagueIds: ['local-circuit'],
      record: {
        wins: 0,
        losses: 0,
      },
    },
    stats: {
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      bankShotGoals: 0,
      steals: 0,
      saves: 0,
      turnovers: 0,
    },
    settings: {
      createdPlayerComplete: true,
    },
  }
}

