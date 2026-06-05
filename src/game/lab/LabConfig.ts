import type { GameMode } from '../config/gameplayConfig'
import type {
  FormationId,
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
  keeperZoneBoundaryBuffer: number
  keeperZonePushStrength: number
  scoringPlaneTolerance: number
}

export type LabStickTuning = {
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
  aimSmoothing: number
  maxStickRotationSpeed: number
  cradleFacingOffsetRadians: number
  stickStanceOffsetRadians: number
  handednessStickOffset: number
  handednessMirrorMultiplier: number
}

export type LabDefenseTuning = {
  bodyCheckCooldownMs: number
  bodyCheckStartupMs: number
  bodyCheckActiveMs: number
  bodyCheckRecoveryMs: number
  bodyCheckRange: number
  bodyCheckArcRadians: number
  bodyCheckImpulse: number
  bodyCheckFumblePressure: number
  bodyCheckOverchargeMultiplier: number
  bruteCheckMultiplier: number
  nonBruteCheckMultiplier: number
  bodyCheckMissRecoveryPenalty: number
  stickSwipeCooldownMs: number
  stickSwipeStartupMs: number
  stickSwipeActiveMs: number
  stickSwipeRecoveryMs: number
  stickSwipeArcRadians: number
  stickSwipeRange: number
  stickSwipeFumblePressure: number
  stickSwipeOverchargeMultiplier: number
  stickSwipeFreeCoreImpulse: number
  supportSwipePrecisionMultiplier: number
  bruteSwipePowerMultiplier: number
  fumblePressureThreshold: number
  fumblePressureDecayPerSecond: number
  overchargeFumbleVulnerability: number
  stableCradleFumbleResistance: number
  chargingFumbleResistance: number
  bruteFumbleBonus: number
  supportStealBonus: number
}

export type LabTuningState = {
  mode: GameMode
  controlledPlayer: ControlledPlayerSelection
  formations: Record<TeamSide, FormationId>
  players: Record<string, LabPlayerTuning>
  field: LabFieldTuning
  stick: LabStickTuning
  defense: LabDefenseTuning
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
  ] satisfies Array<keyof PlayerAttributes>,
} as const
