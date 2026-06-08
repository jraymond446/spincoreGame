import type { Point } from './geometry'

export type TeamSide = 'A' | 'B'
export type PlayerRole = 'keeper' | 'striker' | 'support' | 'brute'
export type PlayerControllerType = 'human' | 'ai'
export type KeeperControlMode =
  | 'aiOnly'
  | 'biasAssist'
  | 'autoSwitch'
  | 'manualWhenSelected'
export type PlayerArchetypeId = 'keeper' | 'striker' | 'support' | 'brute'
export type PlayerHandedness = 'right' | 'left'
export type StickStyle = 'hook' | 'cradle' | 'hammer' | 'whip' | 'fork'
export type PlayerPlayStyle =
  | 'balanced'
  | 'aggressive'
  | 'conservative'
  | 'technical'
  | 'creative'
  | 'direct'
  | 'disruptive'
  | 'sweeper'
  | 'tight'
  | 'bodyguard'
export type FormationId =
  | 'balanced'
  | 'aggressive'
  | 'conservative'
  | 'staggeredLeft'
  | 'staggeredRight'
  | 'brutePress'
export type FormationSlot = 'striker' | 'flex'
export type FormationPosition = {
  xNormalized: number
  yInTeamHalf: number
}
export type FormationAIBias = {
  releaseDelayMultiplier: number
  pressTargetBlend: number
  defensiveRetreat: number
  supportSpacingMultiplier: number
  brutePressureMultiplier: number
}
export type Formation = {
  id: FormationId
  positions: Record<FormationSlot, FormationPosition>
  aiBias: FormationAIBias
}
export type StickActionState =
  | 'IDLE'
  | 'CATCH_READY'
  | 'CRADLED_STABLE'
  | 'CRADLED_CHARGING'
  | 'CRADLED_OVERCHARGED'
  | 'RELEASE_WINDUP'
  | 'RELEASE_SWING'
  | 'RELEASE_FOLLOW_THROUGH'
  | 'RELEASE_COOLDOWN'
  | 'SWINGING'
  | 'RELEASE_RECOVERY'
  | 'FUMBLED_COOLDOWN'

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
  ballHandling: number
  toughness: number
}

export type PlayerDefenseTendencies = {
  truckAggression: number
  slashAggression: number
  fumblePressurePreference: number
}

export type PlayerArchetype = {
  id: PlayerArchetypeId
  role: PlayerRole
  defaultHandedness: PlayerHandedness
  defaultPlayStyle: PlayerPlayStyle
  attributes: PlayerAttributes
}

export type PlayerRosterEntry = {
  id: string
  teamId: string
  teamSide: TeamSide
  role: PlayerRole
  controllerType: PlayerControllerType
  archetypeId: PlayerArchetypeId
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  stickStyle: StickStyle
}

export type ResolvedPlayerRosterEntry = PlayerRosterEntry & {
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
  formation: FormationId
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
  moveVector?: Point
  moveSpeedMultiplier?: number
  aimTarget: Point
  hold: boolean
  swing?: boolean
  truck?: boolean
  slash?: boolean
  releaseTarget?: Point
  aiReleaseDelayMs?: number
  aiState: AIState
}
