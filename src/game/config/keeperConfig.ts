import type { PlayerPlayStyle } from '../data/matchTypes'

export const keeperConfig = {
  keeperTightTargetRadiusRatio: 0.25,
  keeperBalancedTargetRadiusRatio: 0.5,
  keeperSweeperTargetRadiusRatio: 0.75,
  keeperReactionMultiplier: 1.25,
  keeperThreatLookaheadMs: 240,
  keeperReturnHomeSpeed: 0.72,
  keeperClearAggression: 0.86,
  keeperDeflectAggression: 0.9,
  keeperClearUsesThreatVector: true,
  keeperOwnGoalPreventionEnabled: true,
  keeperClearMinAwayDot: 0.25,
  keeperClearLateralVariance: 0.2,
  keeperClearTowardCenterBias: 0.6,
  keeperOrbitSmoothing: 3.4,
  keeperMaxLateralSpeed: 5.6,
  keeperHumanBiasEnabled: true,
  keeperHumanBiasStrength: 0.25,
  keeperHumanLateralBiasStrength: 0.35,
  keeperHumanDepthBiasStrength: 0.2,
  keeperHumanBiasMaxOffset: 25,
  keeperHumanBiasDecay: 7,
  keeperAutoSwitchThreatRadius: 205,
  saveDetectionCooldownMs: 650,
  debug: {
    targetColor: 0xffd24f,
    threatColor: 0xff6f83,
    biasColor: 0x72f0d0,
    legalColor: 0xf8fdff,
    textColor: '#fff8df',
  },
} as const

export function getKeeperTargetRatio(style: PlayerPlayStyle): number {
  if (style === 'tight') {
    return keeperConfig.keeperTightTargetRadiusRatio
  }

  if (style === 'sweeper') {
    return keeperConfig.keeperSweeperTargetRadiusRatio
  }

  return keeperConfig.keeperBalancedTargetRadiusRatio
}
