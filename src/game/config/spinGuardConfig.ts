export const spinGuardConfig = {
  enabled: true,
  lockPlayerBodyRotation: true,
  maxAllowedPlayerAngularVelocity: 0.15,
  triggerPlayerAngularVelocity: 4,
  facingDeltaThreshold: 5.5,
  aimDeltaThreshold: 5.5,
  movementDeltaThreshold: 4.5,
  windowMs: 600,
  orbitMaxDisplacement: 90,
  autoRecover: true,
  recoveryMs: 200,
} as const
