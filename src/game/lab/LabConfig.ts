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
  gatherAssistStrength: number
  gatherAssistRadius: number
  gatherAssistMaxSpeed: number
  gatherSnapDistance: number
  gatherSnapEffectEnabled: boolean
  gatherDeflectSuppression: number
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
  supportPreferredSpacing: number
  avoidClusterRadius: number
  teammateRepulsionStrength: number
  enableBehindGoalCuts: boolean
  behindGoalCutChanceSupport: number
  behindGoalCutChanceStriker: number
  bankShotPreference: number
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
  slashCooldownMs: number
  slashStartupMs: number
  slashActiveMs: number
  slashRecoveryMs: number
  slashArcRadians: number
  slashRange: number
  slashFumblePressure: number
  slashOverchargeMultiplier: number
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
  players: Record<string, LabPlayerTuning>
  field: LabFieldTuning
  keeper: LabKeeperTuning
  spacing: LabSpacingTuning
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
