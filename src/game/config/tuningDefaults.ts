import { playerArchetypes } from '../data/playerArchetypes'
import { teams } from '../data/teams'
import type { LabTuningState } from '../lab/LabConfig'

export function createDefaultLabTuning(): LabTuningState {
  const players: LabTuningState['players'] = Object.fromEntries(
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
  )
  const controlledStriker = players['a-striker']

  if (controlledStriker) {
    controlledStriker.role = 'striker'
    controlledStriker.playStyle = 'aggressive'
    controlledStriker.handedness = 'right'
    controlledStriker.stickStyle = 'hook'
    controlledStriker.attributes = {
      speed: 0.96,
      control: 0.82,
      passing: 0.52,
      shooting: 1.02,
      defense: 0.38,
      power: 0.78,
      accuracy: 0.88,
      reaction: 0.78,
      ballHandling: 0.7,
    }
    controlledStriker.defenseTendencies = {
      bodyCheckAggression: 0.24,
      stickSwipeAggression: 0.46,
      fumblePressurePreference: 0.55,
    }
  }

  return {
    mode: 'match3v3',
    controlledPlayer: 'auto',
    formations: {
      A: 'balanced',
      B: 'brutePress',
    },
    players,
    field: {
      arenaWidth: 940,
      arenaHeight: 1460,
      playerVisualScale: 0.76,
      playerPhysicsRadius: 23,
      stickVisualScale: 0.64,
      stickGameplayScale: 0.7,
      coreRadius: 11,
      coreDensity: 0.0026,
      coreRestitution: 0.86,
      goalWidth: 150,
      goalPostRadius: 11,
      goalPostRestitution: 0.82,
      goalInsetFromEnd: 330,
      keeperZoneRadius: 116,
      keeperZoneBoundaryBuffer: 8,
      keeperZonePushStrength: 0.85,
      scoringPlaneTolerance: 5,
    },
    stick: {
      maxCradleEntrySpeed: 34,
      cradleMinRadius: 26,
      cradleMaxRadius: 88,
      cradleMinAngle: 8,
      cradleMaxAngle: 74,
      cradleCaptureRadius: 44,
      cradleAssistRadius: 52,
      cradleAssistStrength: 0.28,
      cradleAssistMaxSpeed: 3.4,
      passiveNudgeForce: 0.34,
      activeSwingForce: 5.4,
      maxDeflectImpulse: 5.2,
      releaseForceMin: 7.2,
      releaseForceMax: 17.2,
      chargeForceExponent: 1.55,
      overchargeAccuracyPenalty: 0.16,
      releaseWindupMs: 40,
      releaseSwingMs: 90,
      releaseFollowThroughMs: 120,
      releaseSwingArcRadians: 0.75,
      releaseSwingPowerTiming: 0.65,
      releaseTangentialForceMultiplier: 0.35,
      releaseForwardForceMultiplier: 0.85,
      releaseSpinInfluence: 0.2,
      stickPocketWidth: 1,
      stickLipThickness: 1,
      stickHandleLength: 1,
      stickInnerHighlight: 0.78,
      stickOutlineAlpha: 0.94,
      swingTrailAlpha: 0.62,
      swingTrailDuration: 180,
      aimSmoothing: 15,
      maxStickRotationSpeed: 6.8,
      cradleFacingOffsetRadians: -0.35,
      stickStanceOffsetRadians: 0.55,
      handednessStickOffset: 9,
      handednessMirrorMultiplier: 1,
    },
    defense: {
      bodyCheckEnabled: true,
      stickSwipeEnabled: true,
      bodyCheckCooldownMs: 1250,
      bodyCheckStartupMs: 120,
      bodyCheckActiveMs: 150,
      bodyCheckRecoveryMs: 430,
      bodyCheckRange: 78,
      bodyCheckArcRadians: 0.95,
      bodyCheckImpulse: 5.1,
      bodyCheckFumblePressure: 0.4,
      bodyCheckOverchargeMultiplier: 1.9,
      bruteCheckMultiplier: 1.45,
      nonBruteCheckMultiplier: 0.58,
      bodyCheckMissRecoveryPenalty: 0.56,
      stickSwipeCooldownMs: 720,
      stickSwipeStartupMs: 55,
      stickSwipeActiveMs: 120,
      stickSwipeRecoveryMs: 190,
      stickSwipeArcRadians: 1.25,
      stickSwipeRange: 88,
      stickSwipeFumblePressure: 0.3,
      stickSwipeOverchargeMultiplier: 1.75,
      stickSwipeFreeCoreImpulse: 3.5,
      supportSwipePrecisionMultiplier: 1.28,
      bruteSwipePowerMultiplier: 1.1,
      fumblePressureThreshold: 1.12,
      fumblePressureDecayPerSecond: 0.28,
      overchargeFumbleVulnerability: 1.7,
      stableCradleFumbleResistance: 0.78,
      chargingFumbleResistance: 0.94,
      bruteFumbleBonus: 0.22,
      supportStealBonus: 0.16,
    },
    matchFlow: {
      enableGoalCelebration: true,
      goalCelebrationMs: 1200,
      goalFlashDurationMs: 720,
      goalTextDurationMs: 1050,
      enableResetCountdown: true,
      resetCountdownStart: 3,
      resetCountdownStepMs: 700,
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
