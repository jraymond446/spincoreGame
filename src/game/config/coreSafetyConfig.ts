export const coreSafetyConfig = {
  coreOutOfBoundsMargin: 90,
  coreRecoveryDelayMs: 750,
  coreStuckDetectionEnabled: true,
  coreStuckNearWallDistance: 48,
  coreStuckSpeedThreshold: 0.42,
  coreStuckMovementThreshold: 7,
  coreStuckRecoveryDelayMs: 1800,
  coreResetImpulseAfterRecovery: 0,
  recoveredMessageMs: 1800,
} as const
