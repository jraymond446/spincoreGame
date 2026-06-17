import type { PlayerAttributes } from '../game/data/matchTypes'
import type { CreatedPlayerAttributes } from '../save/saveTypes'
import {
  playerAttributeMax,
  playerAttributeMin,
  playerAttributeUltraMax,
} from '../save/saveTypes'

export function mapCreatedPlayerAttributesToMatchAttributes(
  attributes: CreatedPlayerAttributes,
): PlayerAttributes {
  return {
    speed: runtimeValue(attributes.speed),
    reaction: runtimeValue(attributes.reaction),
    power: runtimeValue(attributes.shotPower),
    shooting: runtimeValue(
      average(attributes.shotPower, attributes.shotAccuracy),
    ),
    accuracy: runtimeValue(
      average(attributes.shotAccuracy, attributes.shotSpin),
    ),
    control: runtimeValue(
      average(attributes.reaction, attributes.shotSpin),
    ),
    passing: runtimeValue(
      average(attributes.shotAccuracy, attributes.reaction),
    ),
    defense: runtimeValue(
      average(attributes.toughness, attributes.reaction),
    ),
    ballHandling: runtimeValue(
      average(
        attributes.toughness,
        attributes.reaction,
        attributes.shotSpin,
      ),
    ),
    toughness: runtimeValue(attributes.toughness),
  }
}

function average(...values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function runtimeValue(value: number): number {
  const normalized =
    (value - playerAttributeMin) /
    (playerAttributeMax - playerAttributeMin)
  const runtime = 0.21 + normalized * 0.98
  const ultraBonus =
    value > playerAttributeMax
      ? (value - playerAttributeMax) /
        (playerAttributeUltraMax - playerAttributeMax) *
        0.07
      : 0

  return Math.min(1.26, Math.max(0.21, runtime + ultraBonus))
}
