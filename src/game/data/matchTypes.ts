import type { Point } from './geometry'

export type TeamSide = 'A' | 'B'
export type PlayerRole = 'keeper' | 'striker' | 'support' | 'brute'
export type PlayerControllerType = 'human' | 'ai'
export type PlayerArchetypeId = 'keeper' | 'striker' | 'support' | 'brute'

export type AIState =
  | 'IDLE'
  | 'SEEK_CORE'
  | 'SUPPORT_ATTACK'
  | 'DEFEND_GOAL'
  | 'MARK_CARRIER'
  | 'PRESS_CARRIER'
  | 'SHOOT'
  | 'PASS'
  | 'CLEAR'

export type PlayerAttributes = {
  speed: number
  control: number
  passing: number
  shooting: number
  defense: number
  power: number
  accuracy: number
  reaction: number
}

export type PlayerArchetype = {
  id: PlayerArchetypeId
  role: PlayerRole
  attributes: PlayerAttributes
}

export type PlayerRosterEntry = {
  id: string
  teamId: string
  teamSide: TeamSide
  role: PlayerRole
  controllerType: PlayerControllerType
  archetypeId: PlayerArchetypeId
  spawn: Point
}

export type Team = {
  id: string
  name: string
  side: TeamSide
  color: number
  accentColor: number
  defendedGoalId: string
  attackedGoalId: string
  roster: PlayerRosterEntry[]
}

export type MatchState = {
  score: Record<TeamSide, number>
  firstTo: number
  winner: TeamSide | null
  lastScorer: TeamSide | null
}

export type PlayerControlIntent = {
  moveTarget: Point
  aimTarget: Point
  hold: boolean
  releaseTarget?: Point
  aiState: AIState
}
