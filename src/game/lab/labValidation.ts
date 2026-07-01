import { createDefaultLabTuning } from '../config/tuningDefaults'
import { labOptions, type LabTuningState } from './LabConfig'
import {
  ARENA_PLAYER_RENDER_SCALE_RANGE,
  ARENA_STICK_RENDER_SCALE_RANGE,
} from '../arena/ArenaCharacterAssets'
import { arenaProceduralAnimationRanges } from '../rendering/ArenaProceduralAnimation'

type NumericRule = {
  min: number
  max: number
}

export type LabValidationResult = {
  state: LabTuningState
  sanitizedSettingCount: number
  invalidSettingCount: number
  warnings: string[]
}

const numericRules: Record<string, NumericRule> = {
  'field.arenaWidth': { min: 700, max: 1050 },
  'field.arenaHeight': { min: 1100, max: 1700 },
  'field.playerVisualScale': { min: 0.65, max: 1.15 },
  'field.playerPhysicsRadius': { min: 18, max: 34 },
  'field.stickVisualScale': { min: 0.45, max: 1.2 },
  'field.stickGameplayScale': { min: 0.6, max: 1.15 },
  'field.coreRadius': { min: 10, max: 26 },
  'field.coreDensity': { min: 0.001, max: 0.009 },
  'field.coreRestitution': { min: 0.2, max: 1.2 },
  'field.goalWidth': { min: 90, max: 260 },
  'field.goalPostRadius': { min: 8, max: 28 },
  'field.goalPostRestitution': { min: 0.2, max: 1.2 },
  'field.goalInsetFromEnd': { min: 130, max: 360 },
  'field.keeperZoneRadius': { min: 100, max: 260 },
  'field.innerNoBodyRadius': { min: 20, max: 72 },
  'field.keeperZoneBoundaryBuffer': { min: 0, max: 20 },
  'field.keeperZonePushStrength': { min: 0.1, max: 1 },
  'field.scoringPlaneTolerance': { min: 0, max: 18 },
  'field.goalScoreCooldownMs': { min: 250, max: 2000 },
  'arenaVisual.manualAttendance': { min: 0, max: 1 },
  'arenaVisual.spriteScale': {
    min: ARENA_PLAYER_RENDER_SCALE_RANGE.min,
    max: ARENA_PLAYER_RENDER_SCALE_RANGE.max,
  },
  'arenaVisual.arenaStickScale': {
    min: ARENA_STICK_RENDER_SCALE_RANGE.min,
    max: ARENA_STICK_RENDER_SCALE_RANGE.max,
  },
  'arenaVisual.arenaStickAngle': { min: -1.57, max: 1.57 },
  'arenaVisual.chargePreview': { min: 0, max: 1 },
  'arenaVisual.playerScaleMultiplier':
    arenaProceduralAnimationRanges.playerScaleMultiplier,
  'arenaVisual.idleBobAmount':
    arenaProceduralAnimationRanges.idleBobAmount,
  'arenaVisual.movementBobAmount':
    arenaProceduralAnimationRanges.movementBobAmount,
  'arenaVisual.movementBobSpeed':
    arenaProceduralAnimationRanges.movementBobSpeed,
  'arenaVisual.squashStretchAmount':
    arenaProceduralAnimationRanges.squashStretchAmount,
  'arenaVisual.leanAmount': arenaProceduralAnimationRanges.leanAmount,
  'arenaVisual.lateralSwayAmount':
    arenaProceduralAnimationRanges.lateralSwayAmount,
  'arenaVisual.shadowPulseAmount':
    arenaProceduralAnimationRanges.shadowPulseAmount,
  'arenaVisual.frontArcDegrees':
    arenaProceduralAnimationRanges.frontArcDegrees,
  'arenaVisual.sideReachArcDegrees':
    arenaProceduralAnimationRanges.sideReachArcDegrees,
  'arenaVisual.readyCarriageAngle':
    arenaProceduralAnimationRanges.readyCarriageAngle,
  'arenaVisual.stickBiasStrength':
    arenaProceduralAnimationRanges.stickBiasStrength,
  'arenaVisual.stickClampAmount':
    arenaProceduralAnimationRanges.stickClampAmount,
  'arenaVisual.stickFollowStrength':
    arenaProceduralAnimationRanges.stickFollowStrength,
  'arenaVisual.stickMaxTurnRate':
    arenaProceduralAnimationRanges.stickMaxTurnRate,
  'arenaVisual.stickLagClamp':
    arenaProceduralAnimationRanges.stickLagClamp,
  'arenaVisual.slashWindupMs':
    arenaProceduralAnimationRanges.slashWindupMs,
  'arenaVisual.slashSweepMs':
    arenaProceduralAnimationRanges.slashSweepMs,
  'arenaVisual.slashRecoverMs':
    arenaProceduralAnimationRanges.slashRecoverMs,
  'arenaVisual.slashArcDegrees':
    arenaProceduralAnimationRanges.slashArcDegrees,
  'arenaVisual.slashAnimationSpeed':
    arenaProceduralAnimationRanges.slashAnimationSpeed,
  'arenaVisual.chargeLoadAngleMax':
    arenaProceduralAnimationRanges.chargeLoadAngleMax,
  'arenaVisual.releaseSnapAmount':
    arenaProceduralAnimationRanges.releaseSnapAmount,
  'arenaVisual.releaseRecoilAmount':
    arenaProceduralAnimationRanges.releaseRecoilAmount,
  'arenaVisual.quickPassThreshold':
    arenaProceduralAnimationRanges.quickPassThreshold,
  'arenaVisual.firmPassThreshold':
    arenaProceduralAnimationRanges.firmPassThreshold,
  'arenaVisual.heavyShotThreshold':
    arenaProceduralAnimationRanges.heavyShotThreshold,
  'arenaVisual.fullChargeThreshold':
    arenaProceduralAnimationRanges.fullChargeThreshold,
  'arenaVisual.animationSpeed':
    arenaProceduralAnimationRanges.animationSpeedMultiplier,
  'keeper.keeperMoveSpeedMultiplier': { min: 0.2, max: 1.2 },
  'keeper.goalieQuickShotDeflectPower': { min: 1, max: 14 },
  'keeper.quickShotReboundBias': { min: 0, max: 0.8 },
  'keeper.keeperAccelerationMultiplier': { min: 0.2, max: 1.2 },
  'keeper.keeperTurnRateMultiplier': { min: 0.2, max: 1.2 },
  'keeper.keeperReactionDelayMs': { min: 0, max: 500 },
  'keeper.keeperPredictionStrength': { min: 0, max: 1 },
  'keeper.keeperPostSaveRecoveryMs': { min: 0, max: 900 },
  'keeper.keeperFrontBackRecoveryMultiplier': { min: 0.1, max: 1 },
  'keeper.keeperRepositionDelayMs': { min: 0, max: 500 },
  'keeper.keeperClearMinAwayDot': { min: -0.2, max: 0.8 },
  'clearSafety.ownGoalClearMinAwayDot': { min: -0.2, max: 0.8 },
  'clearSafety.ownGoalProjectionDistance': { min: 80, max: 500 },
  'clearSafety.ownGoalPanicClearPowerScale': { min: 0.4, max: 1 },
  'stick.runningStanceOffsetRadians': { min: -1.2, max: 1.2 },
  'stick.carryPoseOffsetRadians': { min: -1.2, max: 1.2 },
  'stick.cradleFacingOffsetRadians': { min: -1.2, max: 1.2 },
  'stick.stickStanceOffsetRadians': { min: -1.2, max: 1.2 },
  'stick.activeGatherRadius': { min: 20, max: 140 },
  'stick.activeGatherStrength': { min: 0, max: 1 },
  'stick.activeGatherMaxSpeed': { min: 0, max: 24 },
  'stick.activeGatherFunnelAngle': { min: 0.1, max: 2.8 },
  'stick.activeGatherSnapRadius': { min: 0, max: 70 },
  'stick.passiveGatherRadius': { min: 12, max: 100 },
  'stick.passiveGatherStrength': { min: 0, max: 1 },
  'stick.passiveGatherMaxSpeed': { min: 0, max: 18 },
  'stick.passiveGatherFunnelAngle': { min: 0.1, max: 2.2 },
  'stick.humanCloseGatherRadius': { min: 0, max: 60 },
  'stick.humanPassiveCloseGatherRadius': { min: 0, max: 40 },
  'stick.releaseRegrabCooldownMs': { min: 0, max: 1500 },
  'stick.quickReleasePower': { min: 0.35, max: 0.75 },
  'stick.quickReleaseWindupMs': { min: 0, max: 120 },
  'stick.quickReleaseRecoveryMs': { min: 80, max: 300 },
  'stick.quickReleaseSpin': { min: 0, max: 0.6 },
  'stick.quickPassAssist': { min: 0, max: 0.75 },
  'stick.fumbleRegrabCooldownMs': { min: 0, max: 1500 },
  'stick.gatherAttemptCooldownMs': { min: 0, max: 500 },
  'stick.failedGatherGraceMs': { min: 0, max: 600 },
  'stick.catchReadyMinHoldMs': { min: 0, max: 500 },
  'stick.catchReadyExitDelayMs': { min: 0, max: 500 },
  'stick.stableCradleMs': { min: 200, max: 1400 },
  'stick.chargeCradleMs': { min: 400, max: 1900 },
  'stick.overchargeMs': { min: 800, max: 2400 },
  'stick.fumbleMs': { min: 1000, max: 3500 },
  'defense.truckKnockdownThreshold': { min: -0.3, max: 0.7 },
  'defense.truckKnockdownMs': { min: 250, max: 1800 },
  'defense.truckGetUpMs': { min: 180, max: 1200 },
  'defense.truckKnockdownImmunityMs': { min: 0, max: 2500 },
  'defense.truckKnockdownFumbleSpeed': { min: 1, max: 10 },
  'defense.chargingSlashVulnerability': { min: 0.2, max: 3 },
  'defense.slashVsChargingBaseFumble': { min: 0.1, max: 1.2 },
  'defense.slashVsFullChargeBaseFumble': { min: 0.1, max: 1.4 },
  'defense.checkVsChargingBaseFumble': { min: 0.1, max: 1.4 },
  'defense.stableFumbleMultiplier': { min: 0.2, max: 1.5 },
  'defense.chargingFumbleMultiplier': { min: 0.5, max: 3 },
  'defense.highChargeFumbleMultiplier': { min: 0.5, max: 4 },
  'defense.fullChargeFumbleMultiplier': { min: 0.5, max: 5 },
  'defense.overchargedSlashVulnerability': { min: 0.2, max: 4 },
  'defense.stableSlashVulnerability': { min: 0.2, max: 2 },
  'defense.releaseWindupSlashVulnerability': { min: 0.2, max: 3 },
  'defense.releaseFrameProtectionMs': { min: 0, max: 120 },
  'defense.slashChargeFumbleBaseChance': { min: 0, max: 1 },
  'defense.slashOverchargeFumbleBaseChance': { min: 0, max: 1 },
  'matchFlow.matchIntroMs': { min: 0, max: 3000 },
  'matchFlow.initialCountdownStart': { min: 1, max: 5 },
  'matchFlow.initialCountdownStepMs': { min: 250, max: 1500 },
  'spacing.possessionOffenseTransitionMs': { min: 0, max: 1200 },
  'spacing.possessionDefenseTransitionMs': { min: 0, max: 1600 },
  'spacing.supportMinSpacingFromCarrier': { min: 80, max: 260 },
  'spacing.supportPreferredSpacing': { min: 100, max: 360 },
  'spacing.avoidClusterRadius': { min: 60, max: 240 },
  'spacing.teammateRepulsionStrength': { min: 0, max: 1 },
  'spacing.offenseSupportMinSpacingFromCarrier': { min: 80, max: 280 },
  'spacing.offenseSupportPreferredSpacing': { min: 120, max: 380 },
  'spacing.offenseAvoidClusterRadius': { min: 60, max: 260 },
  'spacing.offenseTeammateRepulsionStrength': { min: 0, max: 1 },
  'aiOffense.opponentAiScoringAggression': { min: 0, max: 1 },
  'aiOffense.aiCarrierMinCommitMs': { min: 100, max: 1200 },
  'aiOffense.aiCarrierMaxCommitMs': { min: 400, max: 3000 },
  'aiOffense.aiCarrierReevaluateAfterMs': { min: 150, max: 1800 },
  'aiOffense.aiAimTurnRateRadiansPerSec': { min: 1, max: 14 },
  'aiOffense.aiCarrierBodyTurnRateRadiansPerSec': { min: 0.5, max: 8 },
  'aiOffense.aiMaxCarryMs': { min: 600, max: 4000 },
  'aiOffense.aiSpinAngularVelocityThreshold': { min: 1, max: 12 },
  'aiOffense.aiSpinDurationMs': { min: 100, max: 1500 },
  'aiOffense.aiSpinMinimumRotationRadians': { min: 1, max: 12 },
  'aiOffense.aiCarrySideCommitMs': { min: 200, max: 2200 },
  'aiOffense.aiClearChargeMinMs': { min: 0, max: 1200 },
  'aiOffense.aiClearChargeMaxMs': { min: 100, max: 1600 },
  'aiOffense.aiPassChargeMinMs': { min: 100, max: 1600 },
  'aiOffense.aiPassChargeMaxMs': { min: 200, max: 1900 },
  'aiOffense.aiDirectShotChargeMinMs': { min: 100, max: 1900 },
  'aiOffense.aiDirectShotChargeMaxMs': { min: 180, max: 2200 },
  'aiOffense.aiBankShotChargeMinMs': { min: 500, max: 2100 },
  'aiOffense.aiBankShotChargeMaxMs': { min: 700, max: 2400 },
  'aiOffense.opponentAiShotFrequency': { min: 0, max: 1 },
  'aiOffense.opponentAiBankShotFrequency': { min: 0, max: 1 },
  'aiOffense.opponentAiPassToShotBias': { min: 0, max: 1 },
  'aiOffense.opponentAiForceShotAfterMs': { min: 300, max: 5000 },
  'aiOffense.opponentAiAimAssist': { min: 0, max: 1 },
  'aiOffense.opponentAiShotError': { min: 0, max: 0.6 },
  'aiOffense.opponentAiDecisionIntervalMs': { min: 80, max: 800 },
  'aiOffense.opponentAiAttackSpacing': { min: 40, max: 320 },
  'aiOffense.aiDirectShotTargetOffsetRatio': { min: 0, max: 0.55 },
  'aiOffense.aiGoodDirectShotThreshold': { min: 0.1, max: 1 },
  'aiOffense.aiGoodBankShotThreshold': { min: 0.1, max: 1 },
  'aiOffense.aiPassBetterShotMargin': { min: 0, max: 0.6 },
  'aiOffense.aiMaxCarryBeforeShotMs': { min: 300, max: 5000 },
  'aiOffense.aiPossessionSettleMs': { min: 0, max: 1600 },
  'aiOffense.aiShotCooldownMs': { min: 100, max: 2000 },
  'aiOffense.aiMinShotDistance': { min: 0, max: 500 },
  'aiOffense.aiCloseRangeShotBonus': { min: 0, max: 0.6 },
  'aiOffense.aiBankShotAttemptChanceWhenBlocked': { min: 0, max: 1 },
  'aiOffense.aiBankShotAttemptChanceWhenOpen': { min: 0, max: 1 },
  'aiOffense.aiBankShotAimAssist': { min: 0, max: 1 },
  'aiOffense.aiBankShotMaxError': { min: 0, max: 0.6 },
  'aiOffense.aiBankShotMinCarrierDistanceFromGoal': { min: 0, max: 600 },
  'aiOffense.aiBankShotWallTargetPadding': { min: 10, max: 160 },
  'aiOffense.aiLateralRepositionDistance': { min: 40, max: 300 },
  'aiOffense.aiLateralRepositionTimeMs': { min: 100, max: 2000 },
  'aiOffense.aiWeakSideLanePreference': { min: 0, max: 1 },
  'aiOffense.aiBehindGoalPlayPreference': { min: 0, max: 1 },
  'aiOffense.aiFrontSlotFinishPreference': { min: 0, max: 1 },
}

export function sanitizeLabSettings(input: unknown): LabValidationResult {
  const defaults = createDefaultLabTuning()
  const warnings: string[] = []
  let sanitizedSettingCount = 0
  let invalidSettingCount = 0

  const warn = (path: string, reason: string): void => {
    invalidSettingCount += 1
    warnings.push(`${path}: ${reason}`)
  }

  const sanitizeNode = (
    candidate: unknown,
    fallback: unknown,
    path: string,
  ): unknown => {
    if (typeof fallback === 'number') {
      sanitizedSettingCount += 1
      const parsed =
        typeof candidate === 'number'
          ? candidate
          : typeof candidate === 'string' && candidate.trim() !== ''
            ? Number(candidate)
            : Number.NaN
      const finite = Number.isFinite(parsed) ? parsed : fallback

      if (!Number.isFinite(parsed)) {
        warn(path, 'invalid number; default used')
      }

      const rule = numericRules[path] ?? inferNumericRule(fallback)
      const clamped = Math.min(rule.max, Math.max(rule.min, finite))

      if (clamped !== finite) {
        warn(path, `clamped to ${clamped}`)
      }

      return clamped
    }

    if (typeof fallback === 'boolean') {
      sanitizedSettingCount += 1
      if (typeof candidate !== 'boolean') {
        warn(path, 'invalid boolean; default used')
        return fallback
      }
      return candidate
    }

    if (typeof fallback === 'string') {
      sanitizedSettingCount += 1
      const allowed = allowedStringValues(path)

      if (
        typeof candidate !== 'string' ||
        candidate.trim() === '' ||
        (allowed && !allowed.has(candidate))
      ) {
        warn(path, 'invalid option; default used')
        return fallback
      }

      return candidate
    }

    if (fallback && typeof fallback === 'object') {
      const source =
        candidate && typeof candidate === 'object'
          ? candidate as Record<string, unknown>
          : {}
      const result: Record<string, unknown> = {}

      if (!candidate || typeof candidate !== 'object') {
        warn(path || 'root', 'invalid object; defaults used')
      }

      for (const [key, fallbackValue] of Object.entries(fallback)) {
        const childPath = path ? `${path}.${key}` : key
        result[key] = sanitizeNode(source[key], fallbackValue, childPath)
      }

      return result
    }

    return fallback
  }

  const state = sanitizeNode(input, defaults, '') as LabTuningState

  return {
    state: JSON.parse(JSON.stringify(state)) as LabTuningState,
    sanitizedSettingCount,
    invalidSettingCount,
    warnings,
  }
}

function inferNumericRule(fallback: number): NumericRule {
  if (fallback >= 0 && fallback <= 2) {
    return { min: 0, max: 4 }
  }

  if (fallback >= 0) {
    return {
      min: 0,
      max: Math.max(100, fallback * 10),
    }
  }

  const magnitude = Math.max(10, Math.abs(fallback) * 10)
  return { min: -magnitude, max: magnitude }
}

function allowedStringValues(path: string): Set<string> | null {
  if (path === 'mode') {
    return new Set(labOptions.modes.map((option) => option.value))
  }
  if (path === 'controlledPlayer') {
    return new Set(
      labOptions.controlledPlayers.map((option) => option.value),
    )
  }
  if (/^formations\.[AB]$/.test(path)) {
    return new Set(labOptions.formations)
  }
  if (/^strategies\.[AB]\.offenseScheme$/.test(path)) {
    return new Set(labOptions.offenseSchemes)
  }
  if (/^strategies\.[AB]\.defenseScheme$/.test(path)) {
    return new Set(labOptions.defenseSchemes)
  }
  if (/^strategies\.[AB]\.transitionScheme$/.test(path)) {
    return new Set(labOptions.transitionSchemes)
  }
  if (/^players\.[^.]+\.role$/.test(path)) {
    return new Set(labOptions.roles)
  }
  if (/^players\.[^.]+\.playStyle$/.test(path)) {
    return new Set(labOptions.playStyles)
  }
  if (/^players\.[^.]+\.handedness$/.test(path)) {
    return new Set(labOptions.handedness)
  }
  if (/^players\.[^.]+\.stickStyle$/.test(path)) {
    return new Set(labOptions.stickStyles)
  }
  if (path === 'keeper.keeperControlMode') {
    return new Set(
      labOptions.keeperControlModes.map((option) => option.value),
    )
  }
  if (path === 'keeper.keeperEquipmentType') {
    return new Set(
      labOptions.keeperEquipmentTypes.map((option) => option.value),
    )
  }
  if (path === 'arenaVisual.themeId') {
    return new Set(['rookie'])
  }
  if (path === 'arenaVisual.homeCrestMode') {
    return new Set(['team', 'league', 'none'])
  }
  if (path === 'arenaVisual.playerHairStyle') {
    return new Set(['hair01', 'hair02', 'hair03', 'hair04'])
  }
  if (path === 'arenaVisual.playerRole') {
    return new Set(labOptions.roles)
  }
  if (path === 'arenaVisual.playerHandedness') {
    return new Set(labOptions.handedness)
  }
  if (path === 'arenaVisual.characterRendererMode') {
    return new Set(['legacy', 'asset', 'automatic'])
  }
  if (path === 'arenaVisual.characterRendererScope') {
    return new Set(['controlled', 'all'])
  }
  if (path === 'arenaVisual.arenaBodyId') {
    return new Set(['field-player-01'])
  }
  if (path === 'arenaVisual.arenaHairId') {
    return new Set(['arena-hair-01'])
  }
  if (path === 'arenaVisual.arenaStickId') {
    return new Set(['rookie-cesta-01'])
  }
  if (path === 'arenaVisual.stickLayerMode') {
    return new Set(['automatic', 'above', 'below'])
  }

  return null
}
