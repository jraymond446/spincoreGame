import { playerArchetypes } from '../data/playerArchetypes'
import { teams } from '../data/teams'
import type { LabTuningState } from '../lab/LabConfig'

export function createDefaultLabTuning(): LabTuningState {
  return {
    mode: 'stickLab',
    controlledPlayer: 'auto',
    formations: {
      A: 'balanced',
      B: 'brutePress',
    },
    players: Object.fromEntries(
      teams.flatMap((team) =>
        team.roster.map((entry) => [
          entry.id,
          {
            id: entry.id,
            role: entry.role,
            playStyle: entry.playStyle,
            handedness: entry.handedness,
            stickStyle: entry.stickStyle,
            attributes: {
              ...playerArchetypes[entry.archetypeId].attributes,
            },
            defenseTendencies: defaultDefenseTendencies(entry.role),
          },
        ]),
      ),
    ),
    field: {
      arenaWidth: 900,
      arenaHeight: 1400,
      playerVisualScale: 0.82,
      playerPhysicsRadius: 25,
      stickVisualScale: 0.82,
      stickGameplayScale: 0.84,
      coreRadius: 14,
      coreDensity: 0.003,
      coreRestitution: 0.92,
      goalWidth: 185,
      goalPostRadius: 14,
      goalPostRestitution: 0.9,
      goalInsetFromEnd: 260,
      keeperZoneRadius: 145,
      keeperZoneBoundaryBuffer: 7,
      keeperZonePushStrength: 1,
      scoringPlaneTolerance: 4,
    },
    stick: {
      maxCradleEntrySpeed: 38,
      cradleMinRadius: 36,
      cradleMaxRadius: 112,
      cradleMinAngle: 4,
      cradleMaxAngle: 66,
      cradleCaptureRadius: 54,
      cradleAssistRadius: 60,
      cradleAssistStrength: 0.22,
      cradleAssistMaxSpeed: 4.2,
      passiveNudgeForce: 0.72,
      activeSwingForce: 6.6,
      maxDeflectImpulse: 7.4,
      releaseForceMin: 8.2,
      releaseForceMax: 18.4,
      chargeForceExponent: 1.75,
      overchargeAccuracyPenalty: 0.1,
      aimSmoothing: 12,
      maxStickRotationSpeed: Math.PI * 3,
      cradleFacingOffsetRadians: -0.26,
      stickStanceOffsetRadians: 0.34,
      handednessStickOffset: 11,
      handednessMirrorMultiplier: 1,
    },
    defense: {
      bodyCheckCooldownMs: 1050,
      bodyCheckStartupMs: 90,
      bodyCheckActiveMs: 130,
      bodyCheckRecoveryMs: 330,
      bodyCheckRange: 92,
      bodyCheckArcRadians: 1.18,
      bodyCheckImpulse: 5.8,
      bodyCheckFumblePressure: 0.46,
      bodyCheckOverchargeMultiplier: 1.7,
      bruteCheckMultiplier: 1.35,
      nonBruteCheckMultiplier: 0.78,
      bodyCheckMissRecoveryPenalty: 0.7,
      stickSwipeCooldownMs: 620,
      stickSwipeStartupMs: 55,
      stickSwipeActiveMs: 120,
      stickSwipeRecoveryMs: 190,
      stickSwipeArcRadians: 1.55,
      stickSwipeRange: 112,
      stickSwipeFumblePressure: 0.34,
      stickSwipeOverchargeMultiplier: 1.55,
      stickSwipeFreeCoreImpulse: 4.4,
      supportSwipePrecisionMultiplier: 1.22,
      bruteSwipePowerMultiplier: 1.18,
      fumblePressureThreshold: 1,
      fumblePressureDecayPerSecond: 0.2,
      overchargeFumbleVulnerability: 1.45,
      stableCradleFumbleResistance: 0.68,
      chargingFumbleResistance: 0.86,
      bruteFumbleBonus: 0.18,
      supportStealBonus: 0.14,
    },
  }
}

function defaultDefenseTendencies(
  role: 'keeper' | 'striker' | 'support' | 'brute',
): {
  bodyCheckAggression: number
  stickSwipeAggression: number
  fumblePressurePreference: number
} {
  switch (role) {
    case 'brute':
      return {
        bodyCheckAggression: 1,
        stickSwipeAggression: 0.55,
        fumblePressurePreference: 1,
      }
    case 'support':
      return {
        bodyCheckAggression: 0.2,
        stickSwipeAggression: 0.92,
        fumblePressurePreference: 0.86,
      }
    case 'keeper':
      return {
        bodyCheckAggression: 0.35,
        stickSwipeAggression: 0.82,
        fumblePressurePreference: 0.78,
      }
    default:
      return {
        bodyCheckAggression: 0.38,
        stickSwipeAggression: 0.68,
        fumblePressurePreference: 0.68,
      }
  }
}
