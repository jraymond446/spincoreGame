import type { PlayerAttributes } from '../game/data/matchTypes'
import type { CreatedPlayerAttributes } from '../save/saveTypes'
import {
  playerAttributeDefault,
  playerAttributeMax,
  playerAttributeMin,
  playerAttributeUltraMax,
} from '../save/saveTypes.ts'

export function mapCreatedPlayerAttributesToMatchAttributes(
  attributes: CreatedPlayerAttributes,
): PlayerAttributes {
  return {
    speed: runtimeValue(attributes.speed),
    reaction: runtimeValue(attributes.reaction),
    power: runtimeValue(attributes.shotPower),
    shooting: runtimeValue(weightedAverage([
      [attributes.shotPower, 0.48],
      [attributes.shotAccuracy, 0.52],
    ])),
    accuracy: runtimeValue(weightedAverage([
      [attributes.shotAccuracy, 0.68],
      [attributes.shotSpin, 0.32],
    ])),
    control: runtimeValue(weightedAverage([
      [attributes.shotSpin, 0.55],
      [attributes.reaction, 0.3],
      [attributes.shotAccuracy, 0.15],
    ])),
    passing: runtimeValue(weightedAverage([
      [attributes.shotAccuracy, 0.58],
      [attributes.reaction, 0.28],
      [attributes.shotSpin, 0.14],
    ])),
    defense: runtimeValue(weightedAverage([
      [attributes.toughness, 0.62],
      [attributes.reaction, 0.38],
    ])),
    ballHandling: runtimeValue(weightedAverage([
      [attributes.shotSpin, 0.42],
      [attributes.toughness, 0.36],
      [attributes.reaction, 0.22],
    ])),
    toughness: runtimeValue(attributes.toughness),
  }
}

function weightedAverage(values: Array<[number, number]>): number {
  const totalWeight = values.reduce((sum, [, weight]) => sum + weight, 0)

  if (totalWeight <= 0) {
    return playerAttributeDefault
  }

  return values.reduce(
    (sum, [value, weight]) => sum + value * weight,
    0,
  ) / totalWeight
}

function runtimeValue(value: number): number {
  const clampedBase = Math.min(
    playerAttributeMax,
    Math.max(playerAttributeMin, value),
  )
  const normalized =
    clampedBase <= playerAttributeDefault
      ? (clampedBase - playerAttributeMin) /
        (playerAttributeDefault - playerAttributeMin)
      : (clampedBase - playerAttributeDefault) /
        (playerAttributeMax - playerAttributeDefault)
  const runtime =
    clampedBase <= playerAttributeDefault
      ? 0.42 + normalized * 0.4
      : 0.82 + normalized * 0.4
  const ultraBonus =
    value > playerAttributeMax
      ? (value - playerAttributeMax) /
        (playerAttributeUltraMax - playerAttributeMax) *
        0.06
      : 0

  return Math.min(1.28, Math.max(0.42, runtime + ultraBonus))
}
