import { createDefaultLabTuning } from '../config/tuningDefaults'
import type { LabTuningState } from './LabConfig'
import { sanitizeLabSettings } from './labValidation'
import {
  ARENA_PLAYER_RENDER_SCALE_RANGE,
  ARENA_STICK_RENDER_SCALE_RANGE,
  DEFAULT_ARENA_PLAYER_RENDER_SCALE,
  DEFAULT_ARENA_STICK_RENDER_SCALE,
} from '../arena/ArenaCharacterAssets'
import { arenaProceduralAnimationDefaults } from '../rendering/ArenaProceduralAnimation'

const storageKey = 'spincore_lab_settings_v1'
const previousStorageKey = 'spincore:lab-settings:v3'
const legacyStorageKey = 'spincore:lab-settings:v2'
const settingsVersion = 6

type StoredLabSettings = {
  version: number
  settings: unknown
}

export function loadLabSettings(): LabTuningState | null {
  try {
    const current = window.localStorage.getItem(storageKey)
    const previous = window.localStorage.getItem(previousStorageKey)
    const legacy = window.localStorage.getItem(legacyStorageKey)

    if (!current && !previous && !legacy) {
      return null
    }

    const parsed = JSON.parse(
      current ?? previous ?? legacy ?? 'null',
    ) as unknown
    const candidate = migrateGameplayDefaults(
      current || previous ? readVersionedSettings(parsed) : parsed,
    )
    const result = sanitizeLabSettings(
      fillMissingSettings(
        candidate,
        createDefaultLabTuning(),
      ),
    )

    if (result.invalidSettingCount > 0) {
      console.warn(
        '[Lab Validation] Saved settings required fallback values.',
        result.warnings,
      )
      if (current) {
        discardStoredSettings()
        return null
      }
    }

    if (!current) {
      saveLabSettings(result.state)
      window.localStorage.removeItem(previousStorageKey)
      window.localStorage.removeItem(legacyStorageKey)
    } else {
      saveLabSettings(result.state)
    }

    return result.state
  } catch (error) {
    console.error('[Lab Save Error] Unable to load saved settings.', error)
    discardStoredSettings()
    return null
  }
}

export function saveLabSettings(state: LabTuningState): boolean {
  try {
    const plainData = JSON.parse(
      JSON.stringify(state),
    ) as LabTuningState
    const stored: StoredLabSettings = {
      version: settingsVersion,
      settings: plainData,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(stored))
    return true
  } catch (error) {
    console.error('[Lab Save Error] Unable to save Lab settings.', error)
    return false
  }
}

export function resetSavedLabSettings(): void {
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(previousStorageKey)
  window.localStorage.removeItem(legacyStorageKey)
}

function readVersionedSettings(parsed: unknown): unknown {
  if (
    !isStoredLabSettings(parsed) ||
    ![3, 4, 5, settingsVersion].includes(parsed.version)
  ) {
    throw new Error('Unsupported or invalid Lab settings schema.')
  }

  if (parsed.version < 5) {
    migrateArenaAnimationV5(parsed.settings)
  }
  if (parsed.version < 6) {
    migrateArenaAnimationV6(parsed.settings)
  }

  return parsed.settings
}

function migrateArenaAnimationV5(settings: unknown): void {
  if (!settings || typeof settings !== 'object') {
    return
  }

  const arenaVisual =
    'arenaVisual' in settings &&
    settings.arenaVisual &&
    typeof settings.arenaVisual === 'object'
      ? settings.arenaVisual as Record<string, unknown>
      : null

  if (!arenaVisual) {
    return
  }

  const previousBob = arenaVisual.bobAmplitude
  const previousBobSpeed = arenaVisual.bobSpeed
  const previousLean = arenaVisual.leanAmount

  arenaVisual.playerScaleMultiplier =
    arenaProceduralAnimationDefaults.playerScaleMultiplier
  arenaVisual.idleBobAmount = arenaProceduralAnimationDefaults.idleBobAmount
  arenaVisual.movementBobAmount =
    typeof previousBob === 'number' &&
    previousBob !== 2.15 &&
    previousBob !== 2.8
      ? previousBob
      : arenaProceduralAnimationDefaults.movementBobAmount
  arenaVisual.movementBobSpeed =
    typeof previousBobSpeed === 'number' &&
    previousBobSpeed !== 1 &&
    previousBobSpeed !== 1.1
      ? previousBobSpeed
      : arenaProceduralAnimationDefaults.movementBobSpeed
  arenaVisual.squashStretchAmount =
    arenaProceduralAnimationDefaults.squashStretchAmount
  arenaVisual.leanAmount =
    typeof previousLean === 'number' &&
    previousLean !== 5 &&
    previousLean !== 6.5
      ? previousLean
      : arenaProceduralAnimationDefaults.leanAmount
  arenaVisual.lateralSwayAmount =
    arenaProceduralAnimationDefaults.lateralSwayAmount
  arenaVisual.footShuffle = false
  replaceLegacyDefault(arenaVisual, 'shadowPulseAmount', 0.14, 0.12)
}

function migrateArenaAnimationV6(settings: unknown): void {
  if (!settings || typeof settings !== 'object') {
    return
  }

  const arenaVisual =
    'arenaVisual' in settings &&
    settings.arenaVisual &&
    typeof settings.arenaVisual === 'object'
      ? settings.arenaVisual as Record<string, unknown>
      : null

  if (!arenaVisual) {
    return
  }

  const previousStickLag = arenaVisual.stickLagAmount
  const previousActionSnap = arenaVisual.actionSnapAmount

  arenaVisual.hoverRunEnabled = true
  arenaVisual.footShuffle = false
  replaceLegacyDefault(arenaVisual, 'idleBobAmount', 0.65, 0.6)
  replaceLegacyDefault(arenaVisual, 'movementBobAmount', 2.2, 1.8)
  replaceLegacyDefault(arenaVisual, 'squashStretchAmount', 0.035, 0.05)
  replaceLegacyDefault(arenaVisual, 'leanAmount', 4, 5)
  replaceLegacyDefault(arenaVisual, 'lateralSwayAmount', 0.05, 0)
  arenaVisual.coreTrackingEnabled = true
  arenaVisual.stickFollowStrength =
    typeof previousStickLag === 'number' && previousStickLag !== 0.16
      ? previousStickLag
      : arenaProceduralAnimationDefaults.stickFollowStrength
  arenaVisual.stickMaxTurnRate =
    arenaProceduralAnimationDefaults.stickMaxTurnRate
  arenaVisual.stickLagClamp = arenaProceduralAnimationDefaults.stickLagClamp
  arenaVisual.slashWindupMs = arenaProceduralAnimationDefaults.slashWindupMs
  arenaVisual.slashSweepMs = arenaProceduralAnimationDefaults.slashSweepMs
  arenaVisual.slashRecoverMs = arenaProceduralAnimationDefaults.slashRecoverMs
  arenaVisual.slashArcDegrees =
    arenaProceduralAnimationDefaults.slashArcDegrees
  arenaVisual.chargeLoadAngleMax =
    arenaProceduralAnimationDefaults.chargeLoadAngleMax
  arenaVisual.releaseSnapAmount =
    typeof previousActionSnap === 'number' && previousActionSnap !== 0.7
      ? previousActionSnap
      : arenaProceduralAnimationDefaults.releaseSnapAmount
  arenaVisual.releaseRecoilAmount =
    arenaProceduralAnimationDefaults.releaseRecoilAmount
  arenaVisual.quickPassThreshold =
    arenaProceduralAnimationDefaults.quickPassThreshold
  arenaVisual.firmPassThreshold =
    arenaProceduralAnimationDefaults.firmPassThreshold
  arenaVisual.heavyShotThreshold =
    arenaProceduralAnimationDefaults.heavyShotThreshold
  arenaVisual.fullChargeThreshold =
    arenaProceduralAnimationDefaults.fullChargeThreshold
  arenaVisual.slashTrailEnabled = true
  arenaVisual.releaseTrailEnabled = true
  arenaVisual.fullChargeBurstEnabled = true
  delete arenaVisual.stickLagAmount
  delete arenaVisual.actionSnapAmount
}

function isStoredLabSettings(value: unknown): value is StoredLabSettings {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'version' in value &&
      'settings' in value,
  )
}

function discardStoredSettings(): void {
  try {
    resetSavedLabSettings()
  } catch {
    // Storage may be unavailable or blocked.
  }
}

function migrateGameplayDefaults(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== 'object') {
    return candidate
  }

  const migrated = structuredClone(candidate) as Record<string, unknown>
  const aiOffense =
    migrated.aiOffense &&
    typeof migrated.aiOffense === 'object'
      ? migrated.aiOffense as Record<string, unknown>
      : null
  const stick =
    migrated.stick &&
    typeof migrated.stick === 'object'
      ? migrated.stick as Record<string, unknown>
      : null
  const defense =
    migrated.defense &&
    typeof migrated.defense === 'object'
      ? migrated.defense as Record<string, unknown>
      : null
  const field =
    migrated.field &&
    typeof migrated.field === 'object'
      ? migrated.field as Record<string, unknown>
      : null
  const keeper =
    migrated.keeper &&
    typeof migrated.keeper === 'object'
      ? migrated.keeper as Record<string, unknown>
      : null
  const spacing =
    migrated.spacing &&
    typeof migrated.spacing === 'object'
      ? migrated.spacing as Record<string, unknown>
      : null
  const aiTactics =
    migrated.aiTactics &&
    typeof migrated.aiTactics === 'object'
      ? migrated.aiTactics as Record<string, unknown>
      : null
  const clearSafety =
    migrated.clearSafety &&
    typeof migrated.clearSafety === 'object'
      ? migrated.clearSafety as Record<string, unknown>
      : null
  const arenaVisual =
    migrated.arenaVisual &&
    typeof migrated.arenaVisual === 'object'
      ? migrated.arenaVisual as Record<string, unknown>
      : null

  replaceLegacyDefault(aiOffense, 'aiMaxCarryMs', 2200, 2950)
  replaceLegacyDefault(
    aiOffense,
    'opponentAiForceShotAfterMs',
    2000,
    2450,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiMaxCarryBeforeShotMs',
    2000,
    2450,
  )
  replaceLegacyDefault(aiOffense, 'aiForceShotAfterMs', 2000, 2450)
  replaceLegacyDefault(aiOffense, 'aiSpinDurationMs', 500, 650)
  replaceLegacyDefault(
    aiOffense,
    'aiGoodDirectShotThreshold',
    0.55,
    0.62,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiGoodBankShotThreshold',
    0.45,
    0.55,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiBankShotMinScore',
    0.45,
    0.55,
  )
  replaceLegacyDefault(stick, 'fumbleMs', 2150, 2500)
  replaceLegacyDefault(
    defense,
    'truckKnockdownThreshold',
    0.08,
    -0.06,
  )
  replaceLegacyDefault(defense, 'truckKnockdownMs', 760, 900)
  replaceLegacyDefault(
    defense,
    'truckKnockdownFumbleSpeed',
    4.4,
    4.8,
  )
  replaceLegacyDefault(field, 'goalPostRadius', 11, 8)
  replaceLegacyDefault(keeper, 'keeperShieldWidth', 58, 52)
  replaceLegacyDefault(keeper, 'keeperShieldDepth', 24, 22)
  replaceLegacyDefault(
    keeper,
    'keeperShieldOwnGoalSafetyBias',
    0.85,
    0.95,
  )
  replaceLegacyDefault(
    keeper,
    'keeperShieldOwnGoalSafetyBias',
    0.92,
    0.95,
  )
  replaceLegacyDefault(
    keeper,
    'keeperClearMinAwayDot',
    0.25,
    0.4,
  )
  replaceLegacyDefault(
    clearSafety,
    'ownGoalDangerConeRadians',
    0.75,
    0.95,
  )
  replaceLegacyDefault(
    clearSafety,
    'ownGoalClearMinAwayDot',
    0.25,
    0.4,
  )
  replaceLegacyDefault(
    clearSafety,
    'safeClearSideBias',
    0.45,
    0.4,
  )
  replaceLegacyDefault(
    clearSafety,
    'safeClearMidfieldBias',
    0.55,
    0.65,
  )
  replaceLegacyDefault(
    clearSafety,
    'defensiveDeflectionAwayBias',
    0.7,
    0.85,
  )
  replaceLegacyDefault(
    clearSafety,
    'keeperShieldAwayBias',
    0.85,
    0.95,
  )
  replaceLegacyDefault(
    clearSafety,
    'keeperShieldAwayBias',
    0.92,
    0.95,
  )
  replaceLegacyDefault(
    clearSafety,
    'defenderStickAwayBias',
    0.55,
    0.72,
  )
  replaceLegacyDefault(
    clearSafety,
    'nearOwnGoalSafetyRadius',
    260,
    320,
  )
  replaceLegacyDefault(field, 'arenaWidth', 940, 1000)
  replaceLegacyDefault(field, 'arenaHeight', 1460, 1600)
  replaceLegacyDefault(field, 'arenaHeight', 1500, 1600)
  replaceLegacyDefault(field, 'playerVisualScale', 0.76, 0.72)
  replaceLegacyDefault(field, 'playerPhysicsRadius', 23, 21.5)
  replaceLegacyDefault(keeper, 'keeperShieldWidth', 52, 42)
  replaceLegacyDefault(keeper, 'keeperShieldDepth', 22, 18)
  replaceLegacyDefault(keeper, 'keeperOrbitSmoothing', 3.4, 4.4)
  replaceLegacyDefault(keeper, 'keeperMaxLateralSpeed', 5.6, 6.6)
  replaceLegacyDefault(keeper, 'keeperMoveSpeedMultiplier', 0.68, 0.84)
  replaceLegacyDefault(keeper, 'keeperAccelerationMultiplier', 0.72, 1.05)
  replaceLegacyDefault(keeper, 'keeperTurnRateMultiplier', 0.75, 1.05)
  replaceLegacyDefault(keeper, 'keeperReactionDelayMs', 120, 75)
  replaceLegacyDefault(keeper, 'keeperPredictionStrength', 0.65, 0.78)
  replaceLegacyDefault(
    keeper,
    'keeperFrontBackRecoveryMultiplier',
    0.65,
    0.78,
  )
  replaceLegacyDefault(keeper, 'keeperRepositionDelayMs', 120, 65)
  replaceLegacyDefault(spacing, 'presserSwitchCooldownMs', 900, 780)
  replaceLegacyDefault(spacing, 'supportMinSpacingFromCarrier', 140, 150)
  replaceLegacyDefault(spacing, 'supportPreferredSpacing', 210, 235)
  replaceLegacyDefault(spacing, 'avoidClusterRadius', 130, 148)
  replaceLegacyDefault(spacing, 'teammateRepulsionStrength', 0.45, 0.52)
  replaceLegacyDefault(
    spacing,
    'offenseSupportMinSpacingFromCarrier',
    158,
    185,
  )
  replaceLegacyDefault(
    spacing,
    'offenseSupportPreferredSpacing',
    240,
    295,
  )
  replaceLegacyDefault(spacing, 'offenseAvoidClusterRadius', 152, 178)
  replaceLegacyDefault(
    spacing,
    'offenseTeammateRepulsionStrength',
    0.6,
    0.74,
  )
  replaceLegacyDefault(spacing, 'frontSlotSpacing', 120, 155)
  replaceLegacyDefault(spacing, 'bankShotPreference', 0.35, 0.42)
  replaceLegacyDefault(
    spacing,
    'tacticalJobSwitchCooldownMs',
    700,
    580,
  )
  replaceLegacyDefault(aiTactics, 'jobTargetStrictness', 0.55, 0.68)
  replaceLegacyDefault(aiTactics, 'emergencyGatherRadius', 75, 82)
  replaceLegacyDefault(aiTactics, 'receiverCatchRadius', 95, 108)
  replaceLegacyDefault(aiTactics, 'passLaneMinScore', 0.45, 0.38)
  replaceLegacyDefault(aiTactics, 'supportPassBias', 0.25, 0.34)
  replaceLegacyDefault(aiOffense, 'aiCarrierMinCommitMs', 350, 280)
  replaceLegacyDefault(aiOffense, 'aiCarrierMaxCommitMs', 2100, 1900)
  replaceLegacyDefault(
    aiOffense,
    'aiCarrierReevaluateAfterMs',
    650,
    480,
  )
  replaceLegacyDefault(aiOffense, 'aiMaxCarryMs', 2950, 2600)
  replaceLegacyDefault(aiOffense, 'aiCarrySideCommitMs', 900, 700)
  replaceLegacyDefault(aiOffense, 'aiPassChargeMinMs', 500, 260)
  replaceLegacyDefault(aiOffense, 'aiPassChargeMaxMs', 800, 520)
  replaceLegacyDefault(aiOffense, 'aiDirectShotChargeMinMs', 900, 760)
  replaceLegacyDefault(aiOffense, 'aiDirectShotChargeMaxMs', 1200, 1060)
  replaceLegacyDefault(aiOffense, 'aiBankShotChargeMinMs', 1150, 980)
  replaceLegacyDefault(aiOffense, 'aiBankShotChargeMaxMs', 1500, 1320)
  replaceLegacyDefault(aiOffense, 'opponentAiShotFrequency', 0.7, 0.78)
  replaceLegacyDefault(
    aiOffense,
    'opponentAiBankShotFrequency',
    0.45,
    0.52,
  )
  replaceLegacyDefault(
    aiOffense,
    'opponentAiPassToShotBias',
    0.55,
    0.72,
  )
  replaceLegacyDefault(
    aiOffense,
    'opponentAiForceShotAfterMs',
    2450,
    2150,
  )
  replaceLegacyDefault(aiOffense, 'opponentAiAttackSpacing', 120, 155)
  replaceLegacyDefault(
    aiOffense,
    'aiDirectShotTargetOffsetRatio',
    0.2,
    0.42,
  )
  replaceLegacyDefault(aiOffense, 'aiGoodDirectShotThreshold', 0.62, 0.5)
  replaceLegacyDefault(aiOffense, 'aiGoodBankShotThreshold', 0.55, 0.45)
  replaceLegacyDefault(aiOffense, 'aiPassBetterShotMargin', 0.18, 0.08)
  replaceLegacyDefault(aiOffense, 'aiMaxCarryBeforeShotMs', 2450, 2150)
  replaceLegacyDefault(aiOffense, 'aiPossessionSettleMs', 550, 300)
  replaceLegacyDefault(aiOffense, 'aiShotCooldownMs', 500, 420)
  replaceLegacyDefault(aiOffense, 'aiBankShotMinScore', 0.55, 0.5)
  replaceLegacyDefault(
    aiOffense,
    'aiBankShotAttemptChanceWhenBlocked',
    0.55,
    0.65,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiBankShotAttemptChanceWhenOpen',
    0.18,
    0.24,
  )
  replaceLegacyDefault(aiOffense, 'aiShotBlockedThreshold', 0.55, 0.48)
  replaceLegacyDefault(aiOffense, 'aiLateralRepositionDistance', 120, 145)
  replaceLegacyDefault(aiOffense, 'aiLateralRepositionTimeMs', 500, 460)
  replaceLegacyDefault(aiOffense, 'aiWeakSideLanePreference', 0.5, 0.65)
  replaceLegacyDefault(
    aiOffense,
    'aiBehindGoalPlayPreference',
    0.45,
    0.55,
  )
  replaceLegacyDefault(aiOffense, 'aiFrontSlotFinishPreference', 0.6, 0.68)
  replaceLegacyDefault(aiOffense, 'aiShotPatienceMs', 520, 540)
  replaceLegacyDefault(aiOffense, 'aiForceShotAfterMs', 2450, 2150)
  replaceLegacyDefault(stick, 'stanceResetDelayMs', 120, 170)
  replaceLegacyDefault(stick, 'stanceReturnSmoothing', 12, 10)
  replaceLegacyDefault(stick, 'runningStanceOffsetRadians', 0.55, 0.48)
  replaceLegacyDefault(stick, 'carrySocketLag', 0.08, 0.045)
  replaceLegacyDefault(stick, 'carrySocketMaxOffset', 18, 13)
  replaceLegacyDefault(stick, 'carrySocketLateralRange', 16, 12)
  replaceLegacyDefault(stick, 'carrySocketForwardRange', 10, 8)
  replaceLegacyDefault(stick, 'carrySwayAmount', 0.18, 0.1)
  replaceLegacyDefault(stick, 'carryControlDeadzone', 0.12, 0.08)
  replaceLegacyDefault(stick, 'carryControlResponsiveness', 10, 16)
  replaceLegacyDefault(stick, 'carryAimBlend', 0.35, 0.25)
  replaceLegacyDefault(stick, 'carryPoseOffsetRadians', 0.45, 0.38)
  replaceLegacyDefault(stick, 'carryPoseSmoothing', 14, 18)
  replaceLegacyDefault(stick, 'carryPoseRotationLimit', 6.5, 8)
  replaceLegacyDefault(stick, 'activeGatherRadius', 84, 96)
  replaceLegacyDefault(stick, 'activeGatherStrength', 0.58, 0.7)
  replaceLegacyDefault(stick, 'activeGatherMaxSpeed', 16, 19)
  replaceLegacyDefault(stick, 'activeGatherFunnelAngle', 1.65, 1.9)
  replaceLegacyDefault(stick, 'activeGatherSnapRadius', 44, 52)
  replaceLegacyDefault(stick, 'passiveGatherRadius', 52, 58)
  replaceLegacyDefault(stick, 'passiveGatherStrength', 0.26, 0.32)
  replaceLegacyDefault(stick, 'passiveGatherMaxSpeed', 9.5, 11)
  replaceLegacyDefault(stick, 'passiveGatherFunnelAngle', 1.1, 1.25)
  replaceLegacyDefault(stick, 'humanCloseGatherRadius', 30, 38)
  replaceLegacyDefault(stick, 'humanPassiveCloseGatherRadius', 20, 26)
  replaceLegacyDefault(stick, 'gatherAttemptCooldownMs', 30, 20)
  replaceLegacyDefault(stick, 'failedGatherGraceMs', 160, 220)
  replaceLegacyDefault(stick, 'catchReadyMinHoldMs', 120, 70)
  replaceLegacyDefault(stick, 'catchReadyExitDelayMs', 80, 120)
  replaceLegacyDefault(stick, 'cradleCaptureRadius', 52, 58)
  replaceLegacyDefault(stick, 'cradleAssistRadius', 66, 74)
  replaceLegacyDefault(stick, 'cradleAssistStrength', 0.28, 0.34)
  replaceLegacyDefault(stick, 'cradleAssistMaxSpeed', 3.4, 4.4)
  replaceLegacyDefault(stick, 'hardChargeHoldMs', 1250, 1100)
  replaceLegacyDefault(stick, 'chargeCradleMs', 1250, 1100)
  replaceLegacyDefault(stick, 'overchargeMs', 1850, 1750)
  replaceLegacyDefault(stick, 'releaseForceMin', 7.2, 9.2)
  replaceLegacyDefault(stick, 'releaseForceMax', 17.2, 19.8)
  replaceLegacyDefault(stick, 'releaseSwingMs', 90, 75)
  replaceLegacyDefault(defense, 'truckKnockdownThreshold', -0.06, -0.02)
  replaceLegacyDefault(defense, 'truckFumblePressure', 0.38, 0.42)
  replaceLegacyDefault(
    defense,
    'chargingSlashVulnerability',
    1.45,
    1.75,
  )
  replaceLegacyDefault(
    defense,
    'slashChargeFumbleBaseChance',
    0.45,
    0.58,
  )
  replaceLegacyDefault(
    defense,
    'chargingFumbleResistance',
    0.94,
    1.14,
  )
  replaceLegacyDefault(defense, 'slashFumblePressure', 0.32, 0.34)
  replaceLegacyDefault(defense, 'stableSlashVulnerability', 0.75, 0.82)
  replaceLegacyDefault(defense, 'fumblePressureThreshold', 1.12, 1.05)
  replaceLegacyDefault(defense, 'supportStealBonus', 0.16, 0.2)
  migrateArenaPlayerRenderScale(arenaVisual)
  migrateArenaStickRenderScale(arenaVisual)

  return migrated
}

function replaceLegacyDefault(
  values: Record<string, unknown> | null,
  key: string,
  previous: number,
  next: number,
): void {
  if (values?.[key] === previous) {
    values[key] = next
  }
}

function migrateArenaStickRenderScale(
  values: Record<string, unknown> | null,
): void {
  if (!values) {
    return
  }

  const scale = values.arenaStickScale

  if (typeof scale !== 'number') {
    return
  }

  if (scale > ARENA_STICK_RENDER_SCALE_RANGE.max) {
    values.arenaStickScale = DEFAULT_ARENA_STICK_RENDER_SCALE
  }
}

function migrateArenaPlayerRenderScale(
  values: Record<string, unknown> | null,
): void {
  if (!values) {
    return
  }

  const scale = values.spriteScale

  if (scale === 1 || scale === undefined) {
    values.spriteScale = DEFAULT_ARENA_PLAYER_RENDER_SCALE
    return
  }

  if (
    typeof scale === 'number' &&
    scale > ARENA_PLAYER_RENDER_SCALE_RANGE.max
  ) {
    values.spriteScale = ARENA_PLAYER_RENDER_SCALE_RANGE.max
  }
}

function fillMissingSettings(
  candidate: unknown,
  defaults: unknown,
): unknown {
  if (
    !defaults ||
    typeof defaults !== 'object' ||
    Array.isArray(defaults)
  ) {
    return candidate === undefined ? defaults : candidate
  }

  const source =
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? candidate as Record<string, unknown>
      : {}
  const result: Record<string, unknown> = {}

  for (const [key, fallback] of Object.entries(defaults)) {
    result[key] = fillMissingSettings(source[key], fallback)
  }

  return result
}
