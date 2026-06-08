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
      toughness: 0.56,
    }
    controlledStriker.defenseTendencies = {
      truckAggression: 0.24,
      slashAggression: 0.46,
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
      stickVisualScale: 0.58,
      stickGameplayScale: 0.7,
      coreRadius: 11,
      coreDensity: 0.0026,
      coreRestitution: 0.86,
      goalWidth: 125,
      goalPostRadius: 11,
      goalPostRestitution: 0.82,
      goalInsetFromEnd: 300,
      keeperZoneRadius: 210,
      innerNoBodyRadius: 40,
      keeperZoneBoundaryBuffer: 8,
      keeperZonePushStrength: 0.85,
      scoringPlaneTolerance: 5,
    },
    keeper: {
      keeperControlMode: 'keeperOnPossession',
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
      autoSwitchOnLooseBall: false,
      looseBallSwitchCooldownMs: 1500,
      keeperAutoSwitchOnPossession: true,
      keeperAutoSwitchOnThreat: false,
      keeperAutoSwitchOnLooseBall: false,
      preventRapidSwitching: true,
      controlSwitchCooldownMs: 900,
      minControlOwnershipMs: 1000,
      keeperPossessionSwitchDelayMs: 0,
      keeperReturnToFieldAfterReleaseMs: 650,
      autoSwitchDistanceAdvantageRequired: 9999,
      keeperAutoSwitchThreatRadius: 205,
    },
    stick: {
      carryControlEnabled: true,
      carrySocketLag: 0.08,
      carrySocketMaxOffset: 18,
      carrySocketLateralRange: 16,
      carrySocketForwardRange: 10,
      carrySwayAmount: 0.18,
      carrySwaySmoothing: 12,
      carryControlDeadzone: 0.12,
      carryControlResponsiveness: 10,
      carryAimBlend: 0.35,
      carryPoseOffsetRadians: 0.45,
      carryPoseMaxArcRadians: 0.65,
      carryPoseSmoothing: 14,
      carryPoseRotationLimit: 6.5,
      gatherAssistStrength: 0.34,
      gatherAssistRadius: 58,
      gatherAssistMaxSpeed: 3.8,
      gatherSnapDistance: 20,
      gatherSnapEffectEnabled: true,
      gatherDeflectSuppression: 0.35,
      chargeLoadbackDistance: 18,
      hardChargeEnabled: true,
      hardChargeHoldMs: 550,
      hardChargeMultiplier: 1.15,
      playerChargeAuraEnabled: true,
      playerChargeAuraThreshold: 0.72,
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
      chargeLoadbackMinRadians: 0.08,
      chargeLoadbackMaxRadians: 0.78,
      chargeLoadbackSmoothing: 13,
      overchargeJitterAmount: 0.06,
      overchargeJitterSpeed: 18,
      releaseWindupMs: 0,
      releaseSwingMs: 90,
      releaseFollowThroughMs: 120,
      releaseSwingArcRadians: 0.95,
      releasePointNormalized: 0.55,
      releaseTangentialForceMultiplier: 0.32,
      releaseForwardForceMultiplier: 0.88,
      releaseSpinInfluence: 0.18,
      stickTotalLength: 84,
      stickHandleWidth: 9,
      stickPocketWidth: 1,
      stickPocketDepth: 29,
      stickLipThickness: 1,
      stickHandleLength: 1,
      stickInnerHighlight: 0.78,
      stickInnerHighlightWidth: 4,
      stickOutlineAlpha: 0.94,
      stickOutlineWidth: 3,
      stickWoodGrainAlpha: 0.08,
      swingTrailAlpha: 0.54,
      swingTrailDuration: 155,
      aimSmoothing: 15,
      maxStickRotationSpeed: 6.8,
      cradleFacingOffsetRadians: -0.35,
      stickStanceOffsetRadians: 0.55,
      handednessStickOffset: 9,
      handednessMirrorMultiplier: 1,
      loadbackAffectsAim: false,
      visualStickControlsImpulse: false,
    },
    defense: {
      truckEnabled: true,
      slashEnabled: true,
      truckCooldownMs: 1200,
      truckStartupMs: 80,
      truckActiveMs: 160,
      truckRecoveryMs: 380,
      truckRange: 78,
      truckArcRadians: 0.95,
      truckLungeImpulse: 4.8,
      truckBodyImpulse: 5.2,
      truckFumblePressure: 0.38,
      truckOverchargeMultiplier: 1.85,
      bruteTruckMultiplier: 1.45,
      nonBruteTruckMultiplier: 0.58,
      truckMissRecoveryMovement: 0.58,
      truckOffBallSpeedBoostAllowed: true,
      slashCooldownMs: 650,
      slashStartupMs: 45,
      slashActiveMs: 110,
      slashRecoveryMs: 180,
      slashArcRadians: 1.2,
      slashRange: 84,
      slashFumblePressure: 0.32,
      slashOverchargeMultiplier: 1.75,
      slashFreeCoreImpulse: 3.2,
      slashBodyImpulse: 0.25,
      supportSlashPrecisionMultiplier: 1.25,
      bruteSlashPowerMultiplier: 1.05,
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
  truckAggression: number
  slashAggression: number
  fumblePressurePreference: number
} {
  switch (role) {
    case 'brute':
      return {
        truckAggression: 1,
        slashAggression: 0.55,
        fumblePressurePreference: 1,
      }
    case 'support':
      return {
        truckAggression: 0.2,
        slashAggression: 0.92,
        fumblePressurePreference: 0.86,
      }
    case 'keeper':
      return {
        truckAggression: 0.35,
        slashAggression: 0.82,
        fumblePressurePreference: 0.78,
      }
    default:
      return {
        truckAggression: 0.38,
        slashAggression: 0.68,
        fumblePressurePreference: 0.68,
      }
  }
}
