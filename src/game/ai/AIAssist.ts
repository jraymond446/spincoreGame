import { aiOffenseConfig } from '../config/aiOffenseConfig'
import type { TeamTacticalQuality } from '../data/matchTypes'
import { teams } from '../data/teams'
import type { Player } from '../entities/Player'

export type AIAssistContext = {
  tacticalQuality: TeamTacticalQuality
  scoringAggression: number
  pressure: number
  difficultyMultiplier?: number
  equipmentModifier?: number
}

export function getConfiguredAiAssistContext(
  player: Player,
  pressure = 0,
): AIAssistContext {
  const team = teams.find(
    (candidate) => candidate.side === player.teamSide,
  )

  return {
    tacticalQuality: team?.tacticalQuality ?? {
      teamTacticalRating: 0.5,
      offenseSchemeQuality: 0.5,
      defenseSchemeQuality: 0.5,
      transitionQuality: 0.5,
    },
    scoringAggression:
      player.teamSide === 'B'
        ? aiOffenseConfig.opponentAiScoringAggression
        : 0.55,
    pressure,
  }
}

export function getAiShotError(
  player: Player,
  context: AIAssistContext,
): number {
  const execution = weightedSkill([
    [player.attributes.shooting, 0.52],
    [player.attributes.accuracy, 0.34],
    [player.attributes.control, 0.08],
    [player.attributes.ballHandling, 0.06],
  ])
  const tactical = offenseQuality(context.tacticalQuality)
  const styleMultiplier =
    player.playStyle === 'technical'
      ? 0.78
      : player.playStyle === 'direct'
        ? 1.08
        : player.playStyle === 'aggressive'
          ? 1.04
          : 1
  const roleMultiplier =
    player.role === 'striker'
      ? 0.9
      : player.role === 'support'
        ? 1
        : 1.16
  const baseError =
    player.teamSide === 'B'
      ? aiOffenseConfig.opponentAiShotError
      : 0.22
  const assist =
    player.teamSide === 'B'
      ? aiOffenseConfig.opponentAiAimAssist
      : 0.45
  const pressurePenalty = 1 + clamp01(context.pressure) * 0.42

  return clamp(
    baseError *
      skillErrorMultiplier(execution, tactical) *
      (1 - assist * 0.58) *
      styleMultiplier *
      roleMultiplier *
      pressurePenalty /
      combinedExternalAssist(context),
    0.012,
    0.5,
  )
}

export function getAiBankShotError(
  player: Player,
  context: AIAssistContext,
): number {
  const execution = weightedSkill([
    [player.attributes.accuracy, 0.5],
    [player.attributes.shooting, 0.24],
    [player.attributes.control, 0.16],
    [player.attributes.ballHandling, 0.1],
  ])
  const tactical = offenseQuality(context.tacticalQuality)
  const technicalMultiplier =
    player.playStyle === 'technical' || player.playStyle === 'creative'
      ? 0.78
      : 1

  return clamp(
    aiOffenseConfig.aiBankShotMaxError *
      skillErrorMultiplier(execution, tactical) *
      (1 - aiOffenseConfig.aiBankShotAimAssist * 0.62) *
      technicalMultiplier *
      (1 + clamp01(context.pressure) * 0.24) /
      combinedExternalAssist(context),
    0.01,
    0.55,
  )
}

export function getAiPassError(
  player: Player,
  context: AIAssistContext,
): number {
  const execution = weightedSkill([
    [player.attributes.passing, 0.5],
    [player.attributes.accuracy, 0.23],
    [player.attributes.control, 0.17],
    [player.attributes.ballHandling, 0.1],
  ])
  const tactical = weightedSkill([
    [context.tacticalQuality.offenseSchemeQuality, 0.62],
    [context.tacticalQuality.transitionQuality, 0.23],
    [context.tacticalQuality.teamTacticalRating, 0.15],
  ])
  const roleMultiplier =
    player.role === 'support'
      ? 0.82
      : player.role === 'striker'
        ? 0.96
        : 1.12
  const styleMultiplier =
    player.playStyle === 'technical'
      ? 0.82
      : player.playStyle === 'creative'
        ? 0.9
        : 1

  const baseError =
    player.teamSide === 'B'
      ? aiOffenseConfig.opponentAiShotError
      : 0.2

  return clamp(
    baseError *
      0.9 *
      skillErrorMultiplier(execution, tactical) *
      roleMultiplier *
      styleMultiplier *
      (1 + clamp01(context.pressure) * 0.34) /
      combinedExternalAssist(context),
    0.01,
    0.48,
  )
}

export function getAiDecisionSpeed(
  player: Player,
  context: AIAssistContext,
): number {
  const readSkill = weightedSkill([
    [player.attributes.reaction, 0.46],
    [player.attributes.control, 0.2],
    [player.attributes.ballHandling, 0.16],
    [player.attributes.passing, 0.1],
    [player.attributes.defense, 0.08],
  ])
  const tactical = weightedSkill([
    [context.tacticalQuality.teamTacticalRating, 0.45],
    [context.tacticalQuality.transitionQuality, 0.3],
    [context.tacticalQuality.offenseSchemeQuality, 0.25],
  ])
  const styleBonus =
    player.playStyle === 'direct' ||
    player.playStyle === 'aggressive' ||
    player.playStyle === 'sweeper'
      ? 0.08
      : player.playStyle === 'conservative'
        ? -0.05
        : 0

  return clamp(
    (0.7 +
      readSkill * 0.38 +
      tactical * 0.25 +
      clamp01(context.scoringAggression) * 0.12 +
      styleBonus) *
      combinedExternalAssist(context),
    0.65,
    2,
  )
}

export function getAiShotSelectionBonus(
  player: Player,
  context: AIAssistContext,
): number {
  const selectionSkill = weightedSkill([
    [player.attributes.shooting, 0.42],
    [player.attributes.accuracy, 0.22],
    [player.attributes.control, 0.14],
    [player.attributes.ballHandling, 0.12],
    [player.attributes.reaction, 0.1],
  ])
  const tactical = offenseQuality(context.tacticalQuality)
  const roleBonus =
    player.role === 'striker'
      ? 0.055
      : player.role === 'support'
        ? 0.018
        : player.role === 'brute'
          ? -0.055
          : -0.08
  const styleBonus =
    player.playStyle === 'direct'
      ? 0.045
      : player.playStyle === 'technical'
        ? 0.035
        : player.playStyle === 'aggressive'
          ? 0.025
          : 0

  return clamp(
    ((selectionSkill - 0.5) * 0.2 +
      (tactical - 0.5) * 0.12 +
      clamp01(context.scoringAggression) * 0.04 +
      roleBonus +
      styleBonus) *
      combinedExternalAssist(context),
    -0.12,
    0.2,
  )
}

export function getAiClearSafetyBonus(
  player: Player,
  context: AIAssistContext,
): number {
  const safetySkill = weightedSkill([
    [player.attributes.defense, 0.43],
    [player.attributes.toughness, 0.24],
    [player.attributes.reaction, 0.18],
    [player.attributes.control, 0.1],
    [player.attributes.accuracy, 0.05],
  ])
  const tactical = weightedSkill([
    [context.tacticalQuality.defenseSchemeQuality, 0.58],
    [context.tacticalQuality.teamTacticalRating, 0.27],
    [context.tacticalQuality.transitionQuality, 0.15],
  ])
  const roleBonus =
    player.role === 'keeper'
      ? 0.07
      : player.role === 'brute'
        ? 0.045
        : 0

  return clamp(
    ((safetySkill - 0.4) * 0.28 +
      (tactical - 0.45) * 0.18 +
      roleBonus) *
      combinedExternalAssist(context),
    0,
    0.32,
  )
}

export function getAiCarryPatienceMultiplier(
  player: Player,
  context: AIAssistContext,
): number {
  const carrySkill = weightedSkill([
    [player.attributes.control, 0.42],
    [player.attributes.ballHandling, 0.4],
    [player.attributes.reaction, 0.1],
    [player.attributes.shooting, 0.08],
  ])
  const tactical = offenseQuality(context.tacticalQuality)

  return clamp(
    0.72 + carrySkill * 0.34 + tactical * 0.12,
    0.72,
    1.2,
  )
}

function offenseQuality(quality: TeamTacticalQuality): number {
  return weightedSkill([
    [quality.offenseSchemeQuality, 0.62],
    [quality.teamTacticalRating, 0.25],
    [quality.transitionQuality, 0.13],
  ])
}

function skillErrorMultiplier(
  executionSkill: number,
  tacticalSkill: number,
): number {
  return lerp(1.45, 0.48, executionSkill * 0.74 + tacticalSkill * 0.26)
}

function combinedExternalAssist(context: AIAssistContext): number {
  return clamp(
    (context.difficultyMultiplier ?? 1) *
      (context.equipmentModifier ?? 1),
    0.6,
    1.6,
  )
}

function weightedSkill(values: Array<[number, number]>): number {
  return clamp01(
    values.reduce(
      (total, [value, weight]) => total + normalizedAttribute(value) * weight,
      0,
    ),
  )
}

function normalizedAttribute(value: number): number {
  return clamp01(value / 1.1)
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp01(amount)
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
