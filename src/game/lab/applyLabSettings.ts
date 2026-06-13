import {
  arenaConfig,
  arenaDimensionsConfig,
} from '../config/arenaConfig'
import { aiCarrierConfig } from '../config/aiCarrierConfig'
import { aiOffenseConfig } from '../config/aiOffenseConfig'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { coreConfig } from '../config/entityConfig'
import { controlConfig } from '../config/controlConfig'
import { creaseBattleConfig } from '../config/creaseBattleConfig'
import { defenseConfig } from '../config/defenseConfig'
import { gatherConfig } from '../config/gatherConfig'
import {
  bottomGoalConfig,
  goalConfig,
  topGoalConfig,
} from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperConfig } from '../config/keeperConfig'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { matchFlowConfig } from '../config/matchFlowConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import { stickConfig } from '../config/stickConfig'
import { spacingConfig } from '../config/spacingConfig'
import { tacticsConfig } from '../config/tacticsConfig'
import { tacticalGuideConfig } from '../config/tacticalGuideConfig'
import { stickStanceConfig } from '../config/stickStanceConfig'
import { stickVisualConfig } from '../config/stickVisualConfig'
import { visualConfig } from '../config/visualConfig'
import { wallConfig } from '../config/wallConfig'
import type { LabTuningState } from './LabConfig'

const baseStickVisual = {
  thickness: 12,
  outlineExtra: 5,
  tipAccentRadius: 6,
  forkSpread: 11,
  hammerHeadLength: 30,
  hammerHeadWidth: 12,
  innerEdgeWidth: 3.5,
  innerEdgeOffset: 4,
  socketGlowRadius: 13,
  socketCoreRadius: 4,
}

const baseStickGameplay = {
  length: 92,
  curve: 44,
  deflectRadius: 29,
}

export function applyLabSettings(state: LabTuningState): void {
  const { field, stick } = state
  const stableCradleMs = stick.stableCradleMs
  const chargeCradleMs = Math.max(
    stableCradleMs,
    stick.chargeCradleMs,
  )
  const overchargeMs = Math.max(
    chargeCradleMs,
    stick.overchargeMs,
  )
  const fumbleMs = Math.max(overchargeMs + 100, stick.fumbleMs)
  Object.assign(arenaDimensionsConfig, {
    width: field.arenaWidth,
    height: field.arenaHeight,
  })
  Object.assign(arenaConfig, {
    width: field.arenaWidth,
    height: field.arenaHeight,
    wallThickness: state.wall.wallThickness,
    wallRestitution: state.wall.wallRestitution,
    wallFriction: state.wall.wallFriction,
  })
  Object.assign(wallConfig, state.wall)
  const topY =
    arenaConfig.center.y -
    arenaConfig.height / 2 +
    field.goalInsetFromEnd
  const bottomY =
    arenaConfig.center.y +
    arenaConfig.height / 2 -
    field.goalInsetFromEnd

  Object.assign(playerRuntimeConfig, {
    radius: field.playerPhysicsRadius,
  })
  Object.assign(visualConfig, {
    playerScale: field.playerVisualScale,
  })
  Object.assign(visualConfig.stick, {
    thickness: baseStickVisual.thickness * field.stickVisualScale,
    outlineExtra: baseStickVisual.outlineExtra * field.stickVisualScale,
    tipAccentRadius:
      baseStickVisual.tipAccentRadius * field.stickVisualScale,
    forkSpread: baseStickVisual.forkSpread * field.stickVisualScale,
    hammerHeadLength:
      baseStickVisual.hammerHeadLength * field.stickVisualScale,
    hammerHeadWidth:
      baseStickVisual.hammerHeadWidth * field.stickVisualScale,
    innerEdgeWidth:
      baseStickVisual.innerEdgeWidth * field.stickVisualScale,
    innerEdgeOffset:
      baseStickVisual.innerEdgeOffset * field.stickVisualScale,
    socketGlowRadius:
      baseStickVisual.socketGlowRadius * field.stickVisualScale,
    socketCoreRadius:
      baseStickVisual.socketCoreRadius * field.stickVisualScale,
  })
  Object.assign(coreConfig, {
    radius: field.coreRadius,
    density: field.coreDensity,
    restitution: field.coreRestitution,
  })
  Object.assign(goalConfig, {
    goalPostRadius: field.goalPostRadius,
    goalPostRestitution: field.goalPostRestitution,
    scoringPlaneTolerance: field.scoringPlaneTolerance,
    scoringCooldownMs: field.goalScoreCooldownMs,
    useSweptGoalDetection: field.useSweptGoalDetection,
    goalDetectionDebugEnabled: field.goalDetectionDebugEnabled,
  })
  Object.assign(topGoalConfig, {
    y: topY,
    length: field.goalWidth,
  })
  Object.assign(bottomGoalConfig, {
    y: bottomY,
    length: field.goalWidth,
  })
  Object.assign(keeperAreaConfig, {
    keeperZoneRadius: field.keeperZoneRadius,
    innerNoBodyRadius: field.innerNoBodyRadius,
    keeperZoneBoundaryBuffer: field.keeperZoneBoundaryBuffer,
    keeperZonePushStrength: field.keeperZonePushStrength,
  })
  Object.assign(keeperConfig, {
    keeperTightTargetRadiusRatio:
      state.keeper.keeperTightTargetRadiusRatio,
    keeperBalancedTargetRadiusRatio:
      state.keeper.keeperBalancedTargetRadiusRatio,
    keeperSweeperTargetRadiusRatio:
      state.keeper.keeperSweeperTargetRadiusRatio,
    keeperReactionMultiplier:
      state.keeper.keeperReactionMultiplier,
    keeperThreatLookaheadMs:
      state.keeper.keeperThreatLookaheadMs,
    keeperReturnHomeSpeed:
      state.keeper.keeperReturnHomeSpeed,
    keeperClearAggression:
      state.keeper.keeperClearAggression,
    keeperDeflectAggression:
      state.keeper.keeperDeflectAggression,
    keeperClearUsesThreatVector:
      state.keeper.keeperClearUsesThreatVector,
    keeperOwnGoalPreventionEnabled:
      state.keeper.keeperOwnGoalPreventionEnabled,
    keeperClearMinAwayDot:
      state.keeper.keeperClearMinAwayDot,
    keeperClearLateralVariance:
      state.keeper.keeperClearLateralVariance,
    keeperClearTowardCenterBias:
      state.keeper.keeperClearTowardCenterBias,
    keeperOrbitSmoothing:
      state.keeper.keeperOrbitSmoothing,
    keeperMaxLateralSpeed:
      state.keeper.keeperMaxLateralSpeed,
    keeperMoveSpeedMultiplier:
      state.keeper.keeperMoveSpeedMultiplier,
    keeperAccelerationMultiplier:
      state.keeper.keeperAccelerationMultiplier,
    keeperTurnRateMultiplier:
      state.keeper.keeperTurnRateMultiplier,
    keeperReactionDelayMs:
      state.keeper.keeperReactionDelayMs,
    keeperPredictionStrength:
      state.keeper.keeperPredictionStrength,
    keeperPostSaveRecoveryMs:
      state.keeper.keeperPostSaveRecoveryMs,
    keeperFrontBackRecoveryMultiplier:
      state.keeper.keeperFrontBackRecoveryMultiplier,
    keeperRepositionDelayMs:
      state.keeper.keeperRepositionDelayMs,
    keeperHumanBiasEnabled:
      state.keeper.keeperHumanBiasEnabled,
    keeperHumanBiasStrength:
      state.keeper.keeperHumanBiasStrength,
    keeperHumanLateralBiasStrength:
      state.keeper.keeperHumanLateralBiasStrength,
    keeperHumanDepthBiasStrength:
      state.keeper.keeperHumanDepthBiasStrength,
    keeperHumanBiasMaxOffset:
      state.keeper.keeperHumanBiasMaxOffset,
    keeperHumanBiasDecay:
      state.keeper.keeperHumanBiasDecay,
    keeperAutoSwitchThreatRadius:
      state.keeper.keeperAutoSwitchThreatRadius,
  })
  Object.assign(keeperShieldConfig, {
    keeperEquipmentType: state.keeper.keeperEquipmentType,
    keeperShieldWidth: state.keeper.keeperShieldWidth,
    keeperShieldDepth: state.keeper.keeperShieldDepth,
    keeperShieldDeflectForce:
      state.keeper.keeperShieldDeflectForce,
    keeperShieldDeflectDamping:
      state.keeper.keeperShieldDeflectDamping,
    keeperShieldClearForce:
      state.keeper.keeperShieldClearForce,
    keeperShieldTrapTimeMs:
      state.keeper.keeperShieldTrapTimeMs,
    keeperShieldMaxDeflectAngle:
      state.keeper.keeperShieldMaxDeflectAngle,
    keeperShieldOwnGoalSafetyBias:
      state.keeper.keeperShieldOwnGoalSafetyBias,
  })
  Object.assign(spacingConfig, state.spacing)
  Object.assign(tacticsConfig, {
    tacticalJobSwitchCooldownMs:
      state.spacing.tacticalJobSwitchCooldownMs,
    highPressAggression: state.spacing.highPressAggression,
    lowBlockDepth: state.spacing.lowBlockDepth,
    tacticalOverrideEnabled:
      state.aiTactics.tacticalOverrideEnabled,
    jobTargetStrictness: state.aiTactics.jobTargetStrictness,
    emergencyGatherRadius: state.aiTactics.emergencyGatherRadius,
    receiverCatchRadius: state.aiTactics.receiverCatchRadius,
    passLaneMinScore: state.aiTactics.passLaneMinScore,
    supportPassBias: state.aiTactics.supportPassBias,
  })
  Object.assign(tacticalGuideConfig, state.tacticalGuides)
  Object.assign(aiOffenseConfig, state.aiOffense)
  Object.assign(aiCarrierConfig, {
    aiCarrierMinCommitMs: state.aiOffense.aiCarrierMinCommitMs,
    aiCarrierMaxCommitMs: state.aiOffense.aiCarrierMaxCommitMs,
    aiCarrierReevaluateAfterMs:
      state.aiOffense.aiCarrierReevaluateAfterMs,
    aiAimTurnRateRadiansPerSec:
      state.aiOffense.aiAimTurnRateRadiansPerSec,
    aiCarrierBodyTurnRateRadiansPerSec:
      state.aiOffense.aiCarrierBodyTurnRateRadiansPerSec,
    aiMaxCarryMs: state.aiOffense.aiMaxCarryMs,
    aiSpinDetectionEnabled:
      state.aiOffense.aiSpinDetectionEnabled,
    aiSpinAngularVelocityThreshold:
      state.aiOffense.aiSpinAngularVelocityThreshold,
    aiSpinDurationMs: state.aiOffense.aiSpinDurationMs,
    aiSpinMinimumRotationRadians:
      state.aiOffense.aiSpinMinimumRotationRadians,
    aiCarrySideCommitMs: state.aiOffense.aiCarrySideCommitMs,
    aiClearChargeMinMs: state.aiOffense.aiClearChargeMinMs,
    aiClearChargeMaxMs: state.aiOffense.aiClearChargeMaxMs,
    aiPassChargeMinMs: state.aiOffense.aiPassChargeMinMs,
    aiPassChargeMaxMs: state.aiOffense.aiPassChargeMaxMs,
    aiDirectShotChargeMinMs:
      state.aiOffense.aiDirectShotChargeMinMs,
    aiDirectShotChargeMaxMs:
      state.aiOffense.aiDirectShotChargeMaxMs,
    aiBankShotChargeMinMs:
      state.aiOffense.aiBankShotChargeMinMs,
    aiBankShotChargeMaxMs:
      state.aiOffense.aiBankShotChargeMaxMs,
    freezeCarrierTacticalJob:
      state.aiOffense.freezeCarrierTacticalJob,
  })
  Object.assign(clearSafetyConfig, state.clearSafety)
  Object.assign(keeperConfig, {
    keeperOwnGoalPreventionEnabled:
      state.clearSafety.ownGoalPreventionEnabled,
    keeperClearMinAwayDot:
      state.clearSafety.ownGoalClearMinAwayDot,
  })
  Object.assign(keeperShieldConfig, {
    keeperShieldOwnGoalSafetyBias:
      state.clearSafety.keeperShieldAwayBias,
  })
  Object.assign(creaseBattleConfig, state.creaseBattle)
  Object.assign(keeperZoneRulesConfig, state.keeperZoneRules)
  for (const side of ['A', 'B'] as const) {
    Object.assign(tacticsConfig.teamStrategies[side], {
      formation: state.formations[side],
      ...state.strategies[side],
    })
  }
  Object.assign(stickStanceConfig, {
    stanceResetEnabled: stick.stanceResetEnabled,
    stanceResetDelayMs: stick.stanceResetDelayMs,
    stanceReturnSmoothing: stick.stanceReturnSmoothing,
    runningStanceOffsetRadians:
      stick.runningStanceOffsetRadians,
    aimOnlyWhileActionHeld: stick.aimOnlyWhileActionHeld,
  })
  Object.assign(gatherConfig, {
    activeGatherEnabled: stick.activeGatherEnabled,
    activeGatherRadius: stick.activeGatherRadius,
    activeGatherStrength: stick.activeGatherStrength,
    activeGatherMaxSpeed: stick.activeGatherMaxSpeed,
    activeGatherFunnelAngle: stick.activeGatherFunnelAngle,
    activeGatherSnapRadius: stick.activeGatherSnapRadius,
    activeGatherSnapEnabled: stick.activeGatherSnapEnabled,
    passiveGatherEnabled: stick.passiveGatherEnabled,
    passiveGatherRadius: stick.passiveGatherRadius,
    passiveGatherStrength: stick.passiveGatherStrength,
    passiveGatherMaxSpeed: stick.passiveGatherMaxSpeed,
    passiveGatherFunnelAngle: stick.passiveGatherFunnelAngle,
    humanCloseGatherRadius: stick.humanCloseGatherRadius,
    humanPassiveCloseGatherRadius:
      stick.humanPassiveCloseGatherRadius,
    releaseRegrabCooldownMs: stick.releaseRegrabCooldownMs,
    fumbleRegrabCooldownMs: stick.fumbleRegrabCooldownMs,
    gatherAttemptCooldownMs: stick.gatherAttemptCooldownMs,
    failedGatherGraceMs: stick.failedGatherGraceMs,
    gatherOverridesStanceReset: stick.gatherOverridesStanceReset,
    catchReadyMinHoldMs: stick.catchReadyMinHoldMs,
    catchReadyExitDelayMs: stick.catchReadyExitDelayMs,
    stanceResetDoesNotCancelGather:
      stick.stanceResetDoesNotCancelGather,
  })
  Object.assign(controlConfig, {
    keeperControlMode: state.keeper.keeperControlMode,
    autoSwitchOnLooseBall: state.keeper.autoSwitchOnLooseBall,
    looseBallSwitchCooldownMs:
      state.keeper.looseBallSwitchCooldownMs,
    keeperAutoSwitchOnPossession:
      state.keeper.keeperAutoSwitchOnPossession,
    keeperAutoSwitchOnThreat:
      state.keeper.keeperAutoSwitchOnThreat,
    keeperAutoSwitchOnLooseBall:
      state.keeper.keeperAutoSwitchOnLooseBall,
    preventRapidSwitching:
      state.keeper.preventRapidSwitching,
    controlSwitchCooldownMs:
      state.keeper.controlSwitchCooldownMs,
    minControlOwnershipMs:
      state.keeper.minControlOwnershipMs,
    keeperPossessionSwitchDelayMs:
      state.keeper.keeperPossessionSwitchDelayMs,
    keeperReturnToFieldAfterReleaseMs:
      state.keeper.keeperReturnToFieldAfterReleaseMs,
    autoSwitchDistanceAdvantageRequired:
      state.keeper.autoSwitchDistanceAdvantageRequired,
  })
  Object.assign(keeperAreaConfig.areas.A, {
    x: bottomGoalConfig.x,
    y: bottomY,
  })
  Object.assign(keeperAreaConfig.areas.B, {
    x: topGoalConfig.x,
    y: topY,
  })
  Object.assign(stickConfig.visual, {
    length: baseStickGameplay.length * field.stickGameplayScale,
    curve: baseStickGameplay.curve * field.stickGameplayScale,
  })
  Object.assign(possessionFeelConfig, {
    carryControlEnabled: stick.carryControlEnabled,
    carrySocketLag: stick.carrySocketLag,
    carrySocketMaxOffset: stick.carrySocketMaxOffset,
    carrySocketLateralRange: stick.carrySocketLateralRange,
    carrySocketForwardRange: stick.carrySocketForwardRange,
    carrySwayAmount: stick.carrySwayAmount,
    carrySwaySmoothing: stick.carrySwaySmoothing,
    carryControlDeadzone: stick.carryControlDeadzone,
    carryControlResponsiveness: stick.carryControlResponsiveness,
    carryAimBlend: stick.carryAimBlend,
    carryPoseOffsetRadians: stick.carryPoseOffsetRadians,
    carryPoseMaxArcRadians: stick.carryPoseMaxArcRadians,
    carryPoseSmoothing: stick.carryPoseSmoothing,
    carryPoseRotationLimit: stick.carryPoseRotationLimit,
    chargeLoadbackDistance: stick.chargeLoadbackDistance,
    hardChargeEnabled: stick.hardChargeEnabled,
    hardChargeHoldMs: stick.hardChargeHoldMs,
    hardChargeMultiplier: stick.hardChargeMultiplier,
    playerChargeAuraEnabled: stick.playerChargeAuraEnabled,
    playerChargeAuraThreshold: stick.playerChargeAuraThreshold,
    loadbackAffectsAim: stick.loadbackAffectsAim,
    visualStickControlsImpulse: stick.visualStickControlsImpulse,
  })
  Object.assign(stickConfig, {
    deflectRadius:
      baseStickGameplay.deflectRadius * field.stickGameplayScale,
    maxCradleEntrySpeed: stick.maxCradleEntrySpeed,
    cradleMinRadius: stick.cradleMinRadius,
    cradleMaxRadius: stick.cradleMaxRadius,
    cradleMinAngle: stick.cradleMinAngle,
    cradleMaxAngle: stick.cradleMaxAngle,
    cradleCaptureRadius: stick.cradleCaptureRadius,
    cradleAssistRadius: stick.cradleAssistRadius,
    cradleAssistStrength: stick.cradleAssistStrength,
    cradleAssistMaxSpeed: stick.cradleAssistMaxSpeed,
    stableCradleMs,
    chargeCradleMs,
    overchargeMs,
    fumbleMs,
    passiveNudgeForce: stick.passiveNudgeForce,
    activeSwingForce: stick.activeSwingForce,
    maxDeflectImpulse: stick.maxDeflectImpulse,
    releaseForceMin: Math.min(
      stick.releaseForceMin,
      stick.releaseForceMax,
    ),
    releaseForceMax: Math.max(
      stick.releaseForceMin,
      stick.releaseForceMax,
    ),
    chargeForceExponent: stick.chargeForceExponent,
    overchargeAccuracyPenalty: stick.overchargeAccuracyPenalty,
    chargeLoadbackMinRadians: stick.chargeLoadbackMinRadians,
    chargeLoadbackMaxRadians: stick.chargeLoadbackMaxRadians,
    chargeLoadbackSmoothing: stick.chargeLoadbackSmoothing,
    overchargeJitterAmount: stick.overchargeJitterAmount,
    overchargeJitterSpeed: stick.overchargeJitterSpeed,
    releaseWindupMs: stick.releaseWindupMs,
    releaseSwingMs: stick.releaseSwingMs,
    releaseFollowThroughMs: stick.releaseFollowThroughMs,
    releaseSwingArcRadians: stick.releaseSwingArcRadians,
    releasePointNormalized: stick.releasePointNormalized,
    releaseTangentialForceMultiplier:
      stick.releaseTangentialForceMultiplier,
    releaseForwardForceMultiplier:
      stick.releaseForwardForceMultiplier,
    releaseSpinInfluence: stick.releaseSpinInfluence,
    aimSmoothing: stick.aimSmoothing,
    maxStickRotationSpeed: stick.maxStickRotationSpeed,
    cradleFacingOffsetRadians: stick.cradleFacingOffsetRadians,
    readyStanceOffsetRadians: stick.stickStanceOffsetRadians,
    rightHandedStickOffset: Math.abs(stick.handednessStickOffset),
    leftHandedStickOffset: -Math.abs(stick.handednessStickOffset),
    handednessMirrorMultiplier: stick.handednessMirrorMultiplier,
  })
  Object.assign(stickVisualConfig, {
    totalStickLength: stick.stickTotalLength,
    handleWidth: stick.stickHandleWidth,
    pocketWidthScale: stick.stickPocketWidth,
    pocketDepth: stick.stickPocketDepth,
    lipThicknessScale: stick.stickLipThickness,
    handleLengthScale: stick.stickHandleLength,
    innerHighlightAlpha: stick.stickInnerHighlight,
    innerHighlightWidth: stick.stickInnerHighlightWidth,
    outlineAlpha: stick.stickOutlineAlpha,
    outlineWidth: stick.stickOutlineWidth,
    woodGrainAlpha: stick.stickWoodGrainAlpha,
    swingTrailAlpha: stick.swingTrailAlpha,
    swingTrailDurationMs: stick.swingTrailDuration,
  })
  Object.assign(defenseConfig, state.defense)
  Object.assign(matchFlowConfig, state.matchFlow)
}
