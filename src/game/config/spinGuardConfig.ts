export const spinGuardConfig = {
  enabled: true,
  lockPlayerBodyRotation: true,
  maxAllowedPlayerAngularVelocity: 0.15,
  triggerPlayerAngularVelocity: 4,
  facingDeltaThreshold: 4.2,
  aimDeltaThreshold: 4.2,
  stickDeltaThreshold: 4.2,
  movementDeltaThreshold: 4.5,
  windowMs: 600,
  orbitMaxDisplacement: 90,
  autoRecover: true,
  recoveryMs: 200,
} as const
