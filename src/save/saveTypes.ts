import type {
  PlayerHandedness,
  PlayerRole,
} from '../game/data/matchTypes'

export const playerAttributeKeys = [
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
] as const

export type PlayerAttributeKey = (typeof playerAttributeKeys)[number]

export type CreatedPlayerAttributes = Record<PlayerAttributeKey, number>

export type PlayerVisualPreset =
  | 'circuitBlue'
  | 'solarGold'
  | 'neonRose'
  | 'deepCourt'

export type CreatedPlayer = {
  id: string
  name: string
  jerseyNumber: number
  handedness: PlayerHandedness
  primaryRole: PlayerRole
  visualPreset: PlayerVisualPreset
  attributes: CreatedPlayerAttributes
}

export type EquipmentSlot = 'stickId' | 'shieldId' | 'shoesId'

export type SaveGame = {
  version: 1
  createdAt: string
  updatedAt: string
  player: CreatedPlayer
  wallet: {
    money: number
  }
  progression: {
    xp: number
    level: number
    unspentAttributePoints: number
  }
  equipment: {
    equipped: Record<EquipmentSlot, string | null>
    inventory: string[]
  }
  league: {
    currentLeagueId: string | null
    unlockedLeagueIds: string[]
    record: {
      wins: number
      losses: number
    }
  }
  stats: {
    matchesPlayed: number
    goals: number
    assists: number
    shots: number
    bankShotGoals: number
    steals: number
    saves: number
    turnovers: number
  }
  settings: {
    createdPlayerComplete: boolean
  }
}

