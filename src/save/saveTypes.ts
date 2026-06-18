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

export const equipmentSlotKeys = [
  'stickId',
  'shieldId',
  'shoesId',
  'armorId',
] as const

export type EquipmentSlot = (typeof equipmentSlotKeys)[number]

export const teamRosterSlotIds = [
  'a-keeper',
  'a-support',
  'a-striker',
  'bench',
] as const

export type TeamRosterSlotId = (typeof teamRosterSlotIds)[number]

export const activeTeamRosterSlotIds = [
  'a-keeper',
  'a-support',
  'a-striker',
] as const

export type ActiveTeamRosterSlotId =
  (typeof activeTeamRosterSlotIds)[number]

export type TeamRosterLoadout = {
  equipment: Record<EquipmentSlot, string | null>
}

export type TeamRosterLoadouts = Record<
  TeamRosterSlotId,
  TeamRosterLoadout
>

export type TeamRosterAssignments = Record<
  TeamRosterSlotId,
  string | null
>

export const teamColorKeys = [
  'teal',
  'blue',
  'rose',
  'gold',
  'purple',
  'green',
  'orange',
  'navy',
] as const

export type TeamColorKey = (typeof teamColorKeys)[number]

export type TeamIdentity = {
  name: string
  colors: {
    primary: TeamColorKey
    secondary: TeamColorKey
    homeField: TeamColorKey
  }
  sponsorId: string | null
  coachId: string | null
  rosterAssignments: TeamRosterAssignments
  rosterLoadouts: TeamRosterLoadouts
}

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
  team: TeamIdentity
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
