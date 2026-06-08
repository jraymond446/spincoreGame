import {
  arenaConfig,
  arenaDimensionsConfig,
} from '../config/arenaConfig'
import { coreConfig } from '../config/entityConfig'
import { controlConfig } from '../config/controlConfig'
import { defenseConfig } from '../config/defenseConfig'
import {
  bottomGoalConfig,
  goalConfig,
  topGoalConfig,
} from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperConfig } from '../config/keeperConfig'
import { matchFlowConfig } from '../config/matchFlowConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import { stickConfig } from '../config/stickConfig'
import { stickVisualConfig } from '../config/stickVisualConfig'
import { visualConfig } from '../config/visualConfig'
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
  Object.assign(arenaDimensionsConfig, {
    width: field.arenaWidth,
    height: field.arenaHeight,
  })
  Object.assign(arenaConfig, {
    width: field.arenaWidth,
    height: field.arenaHeight,
  })
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
    gatherAssistStrength: stick.gatherAssistStrength,
    gatherAssistRadius: stick.gatherAssistRadius,
    gatherAssistMaxSpeed: stick.gatherAssistMaxSpeed,
    gatherSnapDistance: stick.gatherSnapDistance,
    gatherSnapEffectEnabled: stick.gatherSnapEffectEnabled,
    gatherDeflectSuppression: stick.gatherDeflectSuppression,
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
