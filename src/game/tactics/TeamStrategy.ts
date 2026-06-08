import type { FormationId } from '../data/matchTypes'

export type OpeningFormation = FormationId

export type OffenseScheme =
  | 'balanced'
  | 'behindNet'
  | 'sideSpread'
  | 'verticalStack'
  | 'crashNet'
  | 'bankHunter'
  | 'giveAndGo'

export type DefenseScheme =
  | 'zoneTriangle'
  | 'manMark'
  | 'lowBlock'
  | 'highPress'
  | 'trapBehindGoal'
  | 'bruteShadow'

export type TransitionScheme =
  | 'balanced'
  | 'safeOutlet'
  | 'counterAttack'
  | 'regroup'
  | 'pressAfterLoss'

export type TeamStrategy = {
  formation: OpeningFormation
  offenseScheme: OffenseScheme
  defenseScheme: DefenseScheme
  transitionScheme: TransitionScheme
}

export type LabTeamStrategy = Omit<TeamStrategy, 'formation'>
