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
  tacticalJobSwitchCooldownMs: 700,
  transitionWindowMs: 950,
  emergencyGatherRadius: 75,
  receiverCatchRadius: 95,
  tacticalOverrideEnabled: true,
  tacticalOverrideCooldownMs: 400,
  jobTargetStrictness: 0.55,
  possessionOverridesJob: true,
  looseCoreOverridesJobNearby: true,
  passDecisionEnabled: true,
  passLaneMinScore: 0.45,
  passUnderPressureThreshold: 0.55,
  supportPassBias: 0.25,
  behindNetPassBackBias: 0.35,
  frontSlotShotBias: 0.3,
  highPressAggression: 0.82,
  lowBlockDepth: 0.34,
  sideLaneWidthRatio: 0.31,
  verticalHighDepth: 0.68,
  verticalMiddleDepth: 0.5,
  verticalLowDepth: 0.32,
  bankReboundWallInset: 90,
  manMarkGoalSideOffset: 72,
  zoneGuardWidth: 150,
  debug: {
    phaseLabelColor: '#ffffff',
    panelColor: '#10243ddd',
    zoneAlpha: 0.16,
  },
}
