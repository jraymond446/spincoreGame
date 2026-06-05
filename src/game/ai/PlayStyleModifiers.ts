import type {
  PlayerPlayStyle,
  PlayerRole,
} from '../data/matchTypes'

export type PlayStyleModifiers = {
  effectiveStyle: PlayerPlayStyle
  keeperDepth: number
  releaseDelayMultiplier: number
  shotSpreadMultiplier: number
  passSpreadMultiplier: number
  passLeadMultiplier: number
  supportSpacingMultiplier: number
  pressBlend: number
  defensiveRetreat: number
  bruteCheckMultiplier: number
  strikerPassThresholdMultiplier: number
  supportShotDistanceMultiplier: number
}

const balancedModifiers: PlayStyleModifiers = {
  effectiveStyle: 'balanced',
  keeperDepth: 0.68,
  releaseDelayMultiplier: 1,
  shotSpreadMultiplier: 1,
  passSpreadMultiplier: 1,
  passLeadMultiplier: 1,
  supportSpacingMultiplier: 1,
  pressBlend: 0.82,
  defensiveRetreat: 0,
  bruteCheckMultiplier: 1,
  strikerPassThresholdMultiplier: 1,
  supportShotDistanceMultiplier: 1,
}

const validStyles: Record<PlayerRole, PlayerPlayStyle[]> = {
  keeper: ['balanced', 'tight', 'sweeper'],
  striker: ['balanced', 'aggressive', 'technical', 'direct'],
  support: ['balanced', 'creative', 'conservative', 'technical'],
  brute: [
    'balanced',
    'disruptive',
    'bodyguard',
    'conservative',
    'aggressive',
  ],
}

export function getPlayStyleModifiers(
  role: PlayerRole,
  requestedStyle: PlayerPlayStyle,
): PlayStyleModifiers {
  const effectiveStyle = validStyles[role].includes(requestedStyle)
    ? requestedStyle
    : 'balanced'

  return {
    ...balancedModifiers,
    ...styleOverrides[effectiveStyle],
    effectiveStyle,
  }
}

const styleOverrides: Partial<
  Record<PlayerPlayStyle, Partial<PlayStyleModifiers>>
> = {
  aggressive: {
    releaseDelayMultiplier: 0.8,
    shotSpreadMultiplier: 1.08,
    pressBlend: 1,
    bruteCheckMultiplier: 1.16,
    strikerPassThresholdMultiplier: 1.65,
  },
  conservative: {
    releaseDelayMultiplier: 1.08,
    passSpreadMultiplier: 0.82,
    passLeadMultiplier: 0.7,
    supportSpacingMultiplier: 0.86,
    pressBlend: 0.54,
    defensiveRetreat: 0.24,
    bruteCheckMultiplier: 0.86,
    supportShotDistanceMultiplier: 0.72,
  },
  technical: {
    releaseDelayMultiplier: 1.14,
    shotSpreadMultiplier: 0.68,
    passSpreadMultiplier: 0.72,
    passLeadMultiplier: 1.08,
    supportSpacingMultiplier: 1.1,
    strikerPassThresholdMultiplier: 0.78,
  },
  creative: {
    releaseDelayMultiplier: 1.04,
    passSpreadMultiplier: 1.12,
    passLeadMultiplier: 1.48,
    supportSpacingMultiplier: 1.18,
    supportShotDistanceMultiplier: 1.08,
  },
  direct: {
    releaseDelayMultiplier: 0.72,
    shotSpreadMultiplier: 1.16,
    pressBlend: 0.94,
    strikerPassThresholdMultiplier: 2.1,
  },
  disruptive: {
    releaseDelayMultiplier: 0.86,
    pressBlend: 1,
    bruteCheckMultiplier: 1.34,
  },
  sweeper: {
    keeperDepth: 0.94,
    releaseDelayMultiplier: 0.86,
    pressBlend: 0.95,
  },
  tight: {
    keeperDepth: 0.46,
    releaseDelayMultiplier: 1.08,
    pressBlend: 0.48,
    defensiveRetreat: 0.18,
  },
  bodyguard: {
    pressBlend: 0.46,
    defensiveRetreat: 0.22,
    bruteCheckMultiplier: 0.92,
  },
}
