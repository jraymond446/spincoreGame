import type { Point } from '../data/geometry'

export type TacticalJob =
  | 'carrier'
  | 'playmaker'
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
  | 'defensiveCleanup'
  | 'creaseSupport'
  | 'outletAfterClear'
  | 'keeper'

export type TeamPhase = 'OFFENSE' | 'DEFENSE' | 'TRANSITION' | 'LOOSE'

export type TacticalAssignment = {
  job: TacticalJob
  target: Point
  markTargetId?: string
}
