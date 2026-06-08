import type { Point } from '../data/geometry'

export type TacticalJob =
  | 'primaryPresser'
  | 'supportOutlet'
  | 'frontSlot'
  | 'behindNet'
  | 'weakSideLane'
  | 'strongSideLane'
  | 'verticalHigh'
  | 'verticalMiddle'
  | 'verticalLow'
  | 'defensiveCover'
  | 'manMark'
  | 'zoneGuard'
  | 'reboundHunter'
  | 'bankRebound'
  | 'keeper'

export type TeamPhase = 'OFFENSE' | 'DEFENSE' | 'TRANSITION' | 'LOOSE'

export type TacticalAssignment = {
  job: TacticalJob
  target: Point
  markTargetId?: string
}
