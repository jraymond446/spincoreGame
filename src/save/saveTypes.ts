import type {
  PlayerHandedness,
  PlayerRole,
} from '../game/data/matchTypes'

export const playerAttributeKeys = [
  'speed',
  'reaction',
  'shotPower',
  'shotAccuracy',
  'shotSpin',
  'toughness',
] as const

export type PlayerAttributeKey = (typeof playerAttributeKeys)[number]
export type CreatedPlayerAttributes = Record<PlayerAttributeKey, number>
export const playerAttributeMin = 1
export const playerAttributeMax = 25
export const playerAttributeUltraMax = 26
export const playerEffectiveAttributeMax = 50
export const playerAttributeDefault = 13

export const playerArchetypeKeys = [
  'striker',
  'support',
  'brute',
  'technician',
  'keeper',
] as const

export type CreatedPlayerArchetype =
  (typeof playerArchetypeKeys)[number]

export type PlayerSkinTone =
  | 'light'
  | 'tan'
  | 'medium'
  | 'brown'
  | 'dark'
export type PlayerHairStyle =
  | 'short'
  | 'messy'
  | 'curly'
  | 'buzz'
  | 'ponytail'
  | 'cap'
  | 'bald'
export type PlayerHairColor =
  | 'black'
  | 'brown'
  | 'blonde'
  | 'red'
  | 'gray'
  | 'blue'
  | 'pink'
export type PlayerShirtColor =
  | 'cyan'
  | 'blue'
  | 'red'
  | 'pink'
  | 'yellow'
  | 'green'
  | 'purple'
  | 'black'
  | 'white'
export type PlayerAccentColor =
  | 'gold'
  | 'cyan'
  | 'pink'
  | 'navy'
  | 'orange'
  | 'lime'

export type PlayerCosmetics = {
  skinTone: PlayerSkinTone
  hairStyle: PlayerHairStyle
  hairColor: PlayerHairColor
  shirtColor: PlayerShirtColor
  accentColor: PlayerAccentColor
  shortsColor: PlayerShirtColor
}

export type CreatedPlayer = {
  id: string
  name: string
  jerseyNumber: number
  handedness: PlayerHandedness
  primaryRole: PlayerRole
  archetype: CreatedPlayerArchetype
  cosmetics: PlayerCosmetics
  attributes: CreatedPlayerAttributes
  selectedStickId: string
}

export type PlayerStatLine = {
  matchesPlayed: number
  wins: number
  losses: number
  goals: number
  assists: number
  shots: number
  bankShotGoals: number
  saves: number
  steals: number
  turnovers: number
  hitsTaken: number
  slashes: number
  successfulGathers: number
  fumbles: number
}

export type SeasonStats = PlayerStatLine & {
  seasonId: string
}

export type LeagueStatLine = Pick<
  PlayerStatLine,
  | 'matchesPlayed'
  | 'wins'
  | 'losses'
  | 'goals'
  | 'assists'
  | 'bankShotGoals'
> & {
  leagueName: string
  championships: number
}

export type EquipmentSlot =
  | 'stickId'
  | 'shieldId'
  | 'shoesId'
  | 'armorId'

export type SaveGame = {
  version: 3
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
    rookieCircuit: {
      currentOpponentIndex: number
      defeatedOpponentTeamIds: string[]
      completed: boolean
    }
  }
  seasonStats: SeasonStats
  stats: PlayerStatLine
  leagueStats: Record<string, LeagueStatLine>
  settings: {
    createdPlayerComplete: boolean
  }
}
