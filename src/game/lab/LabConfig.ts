import type { GameMode } from '../config/gameplayConfig'
import type { KeeperEquipmentType } from '../config/keeperShieldConfig'
import type {
  FormationId,
  KeeperControlMode,
  PlayerAttributes,
  PlayerDefenseTendencies,
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
  StickStyle,
  TeamSide,
} from '../data/matchTypes'
import type {
  DefenseScheme,
  LabTeamStrategy,
  OffenseScheme,
  TransitionScheme,
} from '../tactics/TeamStrategy'

export type ControlledPlayerSelection =
  | 'auto'
  | 'keeper'
  | 'striker'
  | 'flex'

export type LabPlayerTuning = {
  id: string
  role: PlayerRole
  playStyle: PlayerPlayStyle
  handedness: PlayerHandedness
  stickStyle: StickStyle
  attributes: PlayerAttributes
  defenseTendencies: PlayerDefenseTendencies
}

export type LabFieldTuning = {
  arenaWidth: number
  arenaHeight: number
  playerVisualScale: number
  playerPhysicsRadius: number
  stickVisualScale: number
  stickGameplayScale: number
  coreRadius: number
  coreDensity: number
  coreRestitution: number
  goalWidth: number
  goalPostRadius: number
  goalPostRestitution: number
  goalInsetFromEnd: number
  keeperZoneRadius: number
  innerNoBodyRadius: number
  keeperZoneBoundaryBuffer: number
  keeperZonePushStrength: number
  scoringPlaneTolerance: number
  goalScoreCooldownMs: number
  useSweptGoalDetection: boolean
  goalDetectionDebugEnabled: boolean
}

export type LabWallTuning = {
  wallRestitution: number
  wallFriction: number
  wallThickness: number
  coreWallBounceMultiplier: number
  maxWallBounceSpeed: number
  minWallBounceSpeed: number
  coreOutOfBoundsMargin: number
  coreRecoveryDelayMs: number
  coreSafetyBounceEnabled: boolean
  coreSafetyBounceImpulse: number
  coreSafetyResetToCenterAfterMs: number
  wallCarryFumbleEnabled: boolean
  wallCarryImpactSpeedThreshold: number
  wallCarryFumblePressure: number
  wallCarryOverchargeMultiplier: number
  wallCarryPinnedTimeMs: number
  wallCarryPinnedFumblePressure: number
  wallCarryBrushGraceSpeed: number
  wallFumblePopInwardImpulse: number
  wallPinDetectionDistance: number
  wallPinVelocityThreshold: number
  wallImpactVfxEnabled: boolean
  bankShotTrackingEnabled: boolean
}

export type LabKeeperTuning = {
  keeperEquipmentType: KeeperEquipmentType
  keeperShieldWidth: number
  keeperShieldDepth: number
  keeperShieldDeflectForce: number
  keeperShieldDeflectDamping: number
  keeperShieldClearForce: number
  keeperShieldTrapTimeMs: number
  keeperShieldMaxDeflectAngle: number
  keeperShieldOwnGoalSafetyBias: number
  keeperControlMode: KeeperControlMode
  keeperTightTargetRadiusRatio: number
  keeperBalancedTargetRadiusRatio: number
  keeperSweeperTargetRadiusRatio: number
  keeperReactionMultiplier: number
  keeperThreatLookaheadMs: number
  keeperReturnHomeSpeed: number
  keeperClearAggression: number
  keeperDeflectAggression: number
  keeperClearUsesThreatVector: boolean
  keeperOwnGoalPreventionEnabled: boolean
  keeperClearMinAwayDot: number
  keeperClearLateralVariance: number
  keeperClearTowardCenterBias: number
  keeperOrbitSmoothing: number
  keeperMaxLateralSpeed: number
  keeperMoveSpeedMultiplier: number
  keeperAccelerationMultiplier: number
  keeperTurnRateMultiplier: number
  keeperReactionDelayMs: number
  keeperPredictionStrength: number
  keeperPostSaveRecoveryMs: number
  keeperFrontBackRecoveryMultiplier: number
  keeperRepositionDelayMs: number
  keeperHumanBiasEnabled: boolean
  keeperHumanBiasStrength: number
  keeperHumanLateralBiasStrength: number
  keeperHumanDepthBiasStrength: number
  keeperHumanBiasMaxOffset: number
  keeperHumanBiasDecay: number
  autoSwitchOnLooseBall: boolean
  looseBallSwitchCooldownMs: number
  keeperAutoSwitchOnPossession: boolean
  keeperAutoSwitchOnThreat: boolean
  keeperAutoSwitchOnLooseBall: boolean
  preventRapidSwitching: boolean
  controlSwitchCooldownMs: number
  minControlOwnershipMs: number
  keeperPossessionSwitchDelayMs: number
  keeperReturnToFieldAfterReleaseMs: number
  autoSwitchDistanceAdvantageRequired: number
  keeperAutoSwitchThreatRadius: number
}

export type LabStickTuning = {
  stanceResetEnabled: boolean
  stanceResetDelayMs: number
  stanceReturnSmoothing: number
  runningStanceOffsetRadians: number
  aimOnlyWhileActionHeld: boolean
  carryControlEnabled: boolean
  carrySocketLag: number
  carrySocketMaxOffset: number
  carrySocketLateralRange: number
  carrySocketForwardRange: number
  carrySwayAmount: number
  carrySwaySmoothing: number
  carryControlDeadzone: number
  carryControlResponsiveness: number
  carryAimBlend: number
  carryPoseOffsetRadians: number
  carryPoseMaxArcRadians: number
  carryPoseSmoothing: number
  carryPoseRotationLimit: number
  activeGatherEnabled: boolean
  activeGatherRadius: number
  activeGatherStrength: number
  activeGatherMaxSpeed: number
  activeGatherFunnelAngle: number
  activeGatherSnapRadius: number
  activeGatherSnapEnabled: boolean
  passiveGatherEnabled: boolean
  passiveGatherRadius: number
  passiveGatherStrength: number
  passiveGatherMaxSpeed: number
  passiveGatherFunnelAngle: number
  humanCloseGatherRadius: number
  humanPassiveCloseGatherRadius: number
  releaseRegrabCooldownMs: number
  fumbleRegrabCooldownMs: number
  gatherAttemptCooldownMs: number
  failedGatherGraceMs: number
  gatherOverridesStanceReset: boolean
  catchReadyMinHoldMs: number
  catchReadyExitDelayMs: number
  stanceResetDoesNotCancelGather: boolean
  chargeLoadbackDistance: number
  hardChargeEnabled: boolean
  hardChargeHoldMs: number
  hardChargeMultiplier: number
  playerChargeAuraEnabled: boolean
  playerChargeAuraThreshold: number
  maxCradleEntrySpeed: number
  cradleMinRadius: number
  cradleMaxRadius: number
  cradleMinAngle: number
  cradleMaxAngle: number
  cradleCaptureRadius: number
  cradleAssistRadius: number
  cradleAssistStrength: number
  cradleAssistMaxSpeed: number
  stableCradleMs: number
  chargeCradleMs: number
  overchargeMs: number
  fumbleMs: number
  passiveNudgeForce: number
  activeSwingForce: number
  maxDeflectImpulse: number
  releaseForceMin: number
  releaseForceMax: number
  chargeForceExponent: number
  overchargeAccuracyPenalty: number
  chargeLoadbackMinRadians: number
  chargeLoadbackMaxRadians: number
  chargeLoadbackSmoothing: number
  overchargeJitterAmount: number
  overchargeJitterSpeed: number
  releaseWindupMs: number
  releaseSwingMs: number
  releaseFollowThroughMs: number
  releaseSwingArcRadians: number
  releasePointNormalized: number
  releaseTangentialForceMultiplier: number
  releaseForwardForceMultiplier: number
  releaseSpinInfluence: number
  stickTotalLength: number
  stickHandleWidth: number
  stickPocketWidth: number
  stickPocketDepth: number
  stickLipThickness: number
  stickHandleLength: number
  stickInnerHighlight: number
  stickInnerHighlightWidth: number
  stickOutlineAlpha: number
  stickOutlineWidth: number
  stickWoodGrainAlpha: number
  swingTrailAlpha: number
  swingTrailDuration: number
  aimSmoothing: number
  maxStickRotationSpeed: number
  cradleFacingOffsetRadians: number
  stickStanceOffsetRadians: number
  handednessStickOffset: number
  handednessMirrorMultiplier: number
  loadbackAffectsAim: boolean
  visualStickControlsImpulse: boolean
}

export type LabSpacingTuning = {
  maxCorePressersPerTeam: number
  presserSwitchCooldownMs: number
  presserDistanceAdvantageRequired: number
  supportMinSpacingFromCarrier: number
  supportPreferredSpacing: number
  avoidClusterRadius: number
  teammateRepulsionStrength: number
  possessionOffenseTransitionMs: number
  possessionDefenseTransitionMs: number
  offenseSupportMinSpacingFromCarrier: number
  offenseSupportPreferredSpacing: number
  offenseAvoidClusterRadius: number
  offenseTeammateRepulsionStrength: number
  enableBehindGoalCuts: boolean
  behindGoalCutChanceSupport: number
  behindGoalCutChanceStriker: number
  frontSlotSpacing: number
  bankShotPreference: number
  tacticalJobSwitchCooldownMs: number
  highPressAggression: number
  lowBlockDepth: number
}

export type LabAITacticsTuning = {
  tacticalOverrideEnabled: boolean
  jobTargetStrictness: number
  emergencyGatherRadius: number
  receiverCatchRadius: number
  passLaneMinScore: number
  supportPassBias: number
}

export type LabAIOffenseTuning = {
  aiCarrierMinCommitMs: number
  aiCarrierMaxCommitMs: number
  aiCarrierReevaluateAfterMs: number
  aiAimTurnRateRadiansPerSec: number
  aiCarrierBodyTurnRateRadiansPerSec: number
  aiMaxCarryMs: number
  aiSpinDetectionEnabled: boolean
  aiSpinAngularVelocityThreshold: number
  aiSpinDurationMs: number
  aiSpinMinimumRotationRadians: number
  aiCarrySideCommitMs: number
  aiClearChargeMinMs: number
  aiClearChargeMaxMs: number
  aiPassChargeMinMs: number
  aiPassChargeMaxMs: number
  aiDirectShotChargeMinMs: number
  aiDirectShotChargeMaxMs: number
  aiBankShotChargeMinMs: number
  aiBankShotChargeMaxMs: number
  freezeCarrierTacticalJob: boolean
  opponentAiScoringAggression: number
  opponentAiShotFrequency: number
  opponentAiBankShotFrequency: number
  opponentAiPassToShotBias: number
  opponentAiForceShotAfterMs: number
  opponentAiAimAssist: number
  opponentAiShotError: number
  opponentAiDecisionIntervalMs: number
  opponentAiAttackSpacing: number
  aiDirectShotTargetOffsetRatio: number
  aiGoodDirectShotThreshold: number
  aiGoodBankShotThreshold: number
  aiPassBetterShotMargin: number
  aiMaxCarryBeforeShotMs: number
  aiPossessionSettleMs: number
  aiShotCooldownMs: number
  aiMinShotDistance: number
  aiCloseRangeShotBonus: number
  aiBankShotsEnabled: boolean
  aiBankShotPreference: number
  aiBankShotMinScore: number
  aiBankShotAttemptChanceWhenBlocked: number
  aiBankShotAttemptChanceWhenOpen: number
  aiBankShotAimAssist: number
  aiBankShotMaxError: number
  aiBankShotMinCarrierDistanceFromGoal: number
  aiBankShotWallTargetPadding: number
  aiSeekBetterShotAngleEnabled: boolean
  aiShotBlockedThreshold: number
  aiLateralAttackMoveStrength: number
  aiLateralRepositionEnabled: boolean
  aiLateralRepositionDistance: number
  aiLateralRepositionTimeMs: number
  aiWeakSideLanePreference: number
  aiBehindGoalPlayPreference: number
  aiFrontSlotFinishPreference: number
  aiBehindGoalPassEnabled: boolean
  aiFrontSlotPassEnabled: boolean
  aiShotPatienceMs: number
  aiForceShotAfterMs: number
}

export type LabClearSafetyTuning = {
  ownGoalPreventionEnabled: boolean
  ownGoalClearPathCheckEnabled: boolean
  ownGoalDangerConeRadians: number
  ownGoalClearMinAwayDot: number
  ownGoalProjectionDistance: number
  safeClearSideBias: number
  safeClearMidfieldBias: number
  safeClearTeammateBias: number
  safeClearRandomVariance: number
  blockClearIntoOwnGoalHard: boolean
  defensiveDeflectionSafetyEnabled: boolean
  defensiveDeflectionAwayBias: number
  keeperShieldAwayBias: number
  defenderStickAwayBias: number
  nearOwnGoalSafetyRadius: number
  ownGoalPanicClearPowerScale: number
}

export type LabTacticalGuideTuning = {
  tacticalGuidesEnabled: boolean
  tacticalGuideAlpha: number
  tacticalGuideRadius: number
  tacticalGuideShowLabels: boolean
  tacticalGuideOnlyHumanTeam: boolean
}

export type LabCreaseBattleTuning = {
  creaseBattleBreakerEnabled: boolean
  creaseBattleTimeMs: number
  creaseBattleLowSpeedThreshold: number
  creaseBattleClearImpulse: number
  creaseBattleSideBias: number
}

export type LabKeeperZoneRulesTuning = {
  defendersAllowedInOwnKeeperZone: boolean
  attackersBlockedFromOpponentKeeperZone: boolean
  innerRingBlocksAllPlayers: boolean
  maxDefensiveCleanersInZone: number
  defensiveCleanupRadius: number
  defensiveCleanupPriority: number
  creaseOutletSpacing: number
}

export type LabDefenseTuning = {
  truckEnabled: boolean
  slashEnabled: boolean
  truckCooldownMs: number
  truckStartupMs: number
  truckActiveMs: number
  truckRecoveryMs: number
  truckRange: number
  truckArcRadians: number
  truckLungeImpulse: number
  truckBodyImpulse: number
  truckFumblePressure: number
  truckOverchargeMultiplier: number
  bruteTruckMultiplier: number
  nonBruteTruckMultiplier: number
  truckMissRecoveryMovement: number
  truckOffBallSpeedBoostAllowed: boolean
  truckKnockdownThreshold: number
  truckKnockdownMs: number
  truckGetUpMs: number
  truckKnockdownImmunityMs: number
  truckKnockdownFumbleSpeed: number
  slashCooldownMs: number
  slashStartupMs: number
  slashActiveMs: number
  slashRecoveryMs: number
  slashArcRadians: number
  slashRange: number
  slashFumblePressure: number
  slashOverchargeMultiplier: number
  chargingSlashVulnerability: number
  overchargedSlashVulnerability: number
  stableSlashVulnerability: number
  releaseWindupSlashVulnerability: number
  releaseFrameProtectionMs: number
  chargingStealEnabled: boolean
  slashCanInterruptCharge: boolean
  slashChargeFumbleBaseChance: number
  slashOverchargeFumbleBaseChance: number
  slashFreeCoreImpulse: number
  slashBodyImpulse: number
  supportSlashPrecisionMultiplier: number
  bruteSlashPowerMultiplier: number
  fumblePressureThreshold: number
  fumblePressureDecayPerSecond: number
  overchargeFumbleVulnerability: number
  stableCradleFumbleResistance: number
  chargingFumbleResistance: number
  bruteFumbleBonus: number
  supportStealBonus: number
}

export type LabMatchFlowTuning = {
  enableMatchIntro: boolean
  matchIntroMs: number
  initialCountdownStart: number
  initialCountdownStepMs: number
  enableGoalCelebration: boolean
  goalCelebrationMs: number
  goalFlashDurationMs: number
  goalTextDurationMs: number
  enableResetCountdown: boolean
  resetCountdownStart: number
  resetCountdownStepMs: number
}

export type LabTuningState = {
  mode: GameMode
  controlledPlayer: ControlledPlayerSelection
  formations: Record<TeamSide, FormationId>
  strategies: Record<TeamSide, LabTeamStrategy>
  players: Record<string, LabPlayerTuning>
  field: LabFieldTuning
  wall: LabWallTuning
  keeper: LabKeeperTuning
  spacing: LabSpacingTuning
  aiTactics: LabAITacticsTuning
  aiOffense: LabAIOffenseTuning
  clearSafety: LabClearSafetyTuning
  tacticalGuides: LabTacticalGuideTuning
  creaseBattle: LabCreaseBattleTuning
  keeperZoneRules: LabKeeperZoneRulesTuning
  stick: LabStickTuning
  defense: LabDefenseTuning
  matchFlow: LabMatchFlowTuning
}

export const labOptions = {
  modes: [
    { value: 'stickLab', label: 'Stick Lab' },
    { value: 'match3v3', label: '3v3' },
  ] satisfies Array<{ value: GameMode; label: string }>,
  controlledPlayers: [
    { value: 'auto', label: 'Auto' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'striker', label: 'Striker' },
    { value: 'flex', label: 'Flex' },
  ] satisfies Array<{ value: ControlledPlayerSelection; label: string }>,
  keeperControlModes: [
    { value: 'fieldOnlyBiasKeeper', label: 'Field + keeper bias' },
    { value: 'keeperOnPossession', label: 'Keeper on possession' },
    { value: 'manualAll', label: 'Manual all' },
    { value: 'autoNearest', label: 'Auto nearest' },
  ] satisfies Array<{ value: KeeperControlMode; label: string }>,
  keeperEquipmentTypes: [
    { value: 'shield', label: 'Shield / paddle' },
    { value: 'normalStick', label: 'Normal cesta-bat' },
  ] satisfies Array<{ value: KeeperEquipmentType; label: string }>,
  roles: [
    'keeper',
    'striker',
    'support',
    'brute',
  ] satisfies PlayerRole[],
  playStyles: [
    'balanced',
    'aggressive',
    'conservative',
    'technical',
    'creative',
    'direct',
    'disruptive',
    'sweeper',
    'tight',
    'bodyguard',
  ] satisfies PlayerPlayStyle[],
  handedness: ['right', 'left'] satisfies PlayerHandedness[],
  stickStyles: [
    'hook',
    'cradle',
    'hammer',
    'whip',
    'fork',
  ] satisfies StickStyle[],
  formations: [
    'balanced',
    'aggressive',
    'conservative',
    'staggeredLeft',
    'staggeredRight',
    'brutePress',
  ] satisfies FormationId[],
  offenseSchemes: [
    'balanced',
    'behindNet',
    'sideSpread',
    'verticalStack',
    'crashNet',
    'bankHunter',
    'giveAndGo',
  ] satisfies OffenseScheme[],
  defenseSchemes: [
    'zoneTriangle',
    'manMark',
    'lowBlock',
    'highPress',
    'trapBehindGoal',
    'bruteShadow',
  ] satisfies DefenseScheme[],
  transitionSchemes: [
    'balanced',
    'safeOutlet',
    'counterAttack',
    'regroup',
    'pressAfterLoss',
  ] satisfies TransitionScheme[],
  attributes: [
    'speed',
    'control',
    'passing',
    'shooting',
    'defense',
    'power',
    'accuracy',
    'reaction',
    'ballHandling',
    'toughness',
  ] satisfies Array<keyof PlayerAttributes>,
} as const
