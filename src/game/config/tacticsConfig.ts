import type { TeamSide } from '../data/matchTypes'
import type { TeamStrategy } from '../tactics/TeamStrategy'

export const defaultTeamStrategies: Record<TeamSide, TeamStrategy> = {
  A: {
    formation: 'balanced',
    offenseScheme: 'behindNet',
    defenseScheme: 'zoneTriangle',
    transitionScheme: 'safeOutlet',
  },
  B: {
    formation: 'brutePress',
    offenseScheme: 'crashNet',
    defenseScheme: 'highPress',
    transitionScheme: 'counterAttack',
  },
}

export const tacticsConfig = {
  teamStrategies: structuredClone(defaultTeamStrategies),
  tacticalJobSwitchCooldownMs: 580,
  transitionWindowMs: 850,
  emergencyGatherRadius: 82,
  receiverCatchRadius: 108,
  tacticalOverrideEnabled: true,
  tacticalOverrideCooldownMs: 400,
  jobTargetStrictness: 0.86,
  possessionOverridesJob: true,
  looseCoreOverridesJobNearby: true,
  passDecisionEnabled: true,
  passLaneMinScore: 0.34,
  passUnderPressureThreshold: 0.42,
  supportPassBias: 0.4,
  behindNetPassBackBias: 0.48,
  frontSlotShotBias: 0.3,
  highPressAggression: 0.82,
  lowBlockDepth: 0.34,
  sideLaneWidthRatio: 0.36,
  verticalHighDepth: 0.72,
  verticalMiddleDepth: 0.5,
  verticalLowDepth: 0.28,
  bankReboundWallInset: 90,
  manMarkGoalSideOffset: 96,
  zoneGuardWidth: 190,
  debug: {
    phaseLabelColor: '#ffffff',
    panelColor: '#10243ddd',
    zoneAlpha: 0.16,
  },
}
