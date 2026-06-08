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
