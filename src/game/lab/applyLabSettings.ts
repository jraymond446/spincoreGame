import {
  arenaConfig,
  arenaDimensionsConfig,
} from '../config/arenaConfig'
import { coreConfig } from '../config/entityConfig'
import { defenseConfig } from '../config/defenseConfig'
import {
  bottomGoalConfig,
  goalConfig,
  topGoalConfig,
} from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { stickConfig } from '../config/stickConfig'
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
    keeperZoneBoundaryBuffer: field.keeperZoneBoundaryBuffer,
    keeperZonePushStrength: field.keeperZonePushStrength,
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
    aimSmoothing: stick.aimSmoothing,
    maxStickRotationSpeed: stick.maxStickRotationSpeed,
    cradleFacingOffsetRadians: stick.cradleFacingOffsetRadians,
    readyStanceOffsetRadians: stick.stickStanceOffsetRadians,
    rightHandedStickOffset: Math.abs(stick.handednessStickOffset),
    leftHandedStickOffset: -Math.abs(stick.handednessStickOffset),
    handednessMirrorMultiplier: stick.handednessMirrorMultiplier,
  })
  Object.assign(defenseConfig, state.defense)
}
