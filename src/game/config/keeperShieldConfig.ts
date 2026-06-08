export type KeeperEquipmentType = 'shield' | 'normalStick'

export const keeperShieldConfig = {
  keeperUsesShieldDefault: true,
  keeperEquipmentType: 'shield' as KeeperEquipmentType,
  keeperShieldWidth: 58,
  keeperShieldDepth: 24,
  keeperShieldDeflectForce: 5,
  keeperShieldDeflectDamping: 0.35,
  keeperShieldClearForce: 8,
  keeperShieldTrapTimeMs: 300,
  keeperShieldMaxDeflectAngle: 1.15,
  keeperShieldOwnGoalSafetyBias: 0.85,
  keeperShieldForwardOffset: 31,
  keeperShieldSideOffset: 7,
  keeperShieldCanTrap: false,
  contactCooldownMs: 135,
  visual: {
    fillAlpha: 0.98,
    outlineColor: 0x15334a,
    outlineAlpha: 0.96,
    outlineWidth: 4,
    faceHighlightAlpha: 0.62,
    blockPulseDistance: 5,
  },
  debug: {
    faceColor: 0x8df0cf,
    contactColor: 0xffd24f,
    safeClearColor: 0x69ecff,
  },
} as const
