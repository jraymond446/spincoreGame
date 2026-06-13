import type { PlayerAttributeKey } from '../save/saveTypes'
import type { StickStyle } from '../game/data/matchTypes'

export type StickGameplayModifiers = {
  powerModifier: number
  accuracyModifier: number
  spinModifier: number
  gatherModifier: number
  releaseSpeedModifier: number
  fumbleResistanceModifier: number
}

export type StickType = {
  id: string
  name: string
  description: string
  visualStyle: StickStyle
  modifiers: StickGameplayModifiers
  attributeModifiers: Partial<Record<PlayerAttributeKey, number>>
  summaryModifiers: Array<{
    label: string
    value: number
  }>
}

export const stickTypes: StickType[] = [
  {
    id: 'balanced-cesta',
    name: 'Balanced Cesta',
    description: 'Reliable starter stick for all-around play.',
    visualStyle: 'cradle',
    modifiers: {
      powerModifier: 0,
      accuracyModifier: 1,
      spinModifier: 0,
      gatherModifier: 2,
      releaseSpeedModifier: 0,
      fumbleResistanceModifier: 1,
    },
    attributeModifiers: { reaction: 2, shotAccuracy: 1 },
    summaryModifiers: [
      { label: 'Gather', value: 2 },
      { label: 'Shot Accuracy', value: 1 },
    ],
  },
  {
    id: 'power-bat',
    name: 'Power Bat',
    description: 'Heavy stick that fires hard but demands cleaner aim.',
    visualStyle: 'hammer',
    modifiers: {
      powerModifier: 6,
      accuracyModifier: -4,
      spinModifier: 0,
      gatherModifier: -2,
      releaseSpeedModifier: -1,
      fumbleResistanceModifier: 2,
    },
    attributeModifiers: {
      shotPower: 6,
      shotAccuracy: -4,
      reaction: -2,
      toughness: 2,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 6 },
      { label: 'Shot Accuracy', value: -4 },
      { label: 'Gather', value: -2 },
    ],
  },
  {
    id: 'control-hook',
    name: 'Control Hook',
    description: 'Easier catches and safer possession.',
    visualStyle: 'hook',
    modifiers: {
      powerModifier: -3,
      accuracyModifier: 1,
      spinModifier: 1,
      gatherModifier: 6,
      releaseSpeedModifier: 0,
      fumbleResistanceModifier: 4,
    },
    attributeModifiers: {
      reaction: 4,
      shotPower: -3,
      toughness: 4,
    },
    summaryModifiers: [
      { label: 'Gather', value: 6 },
      { label: 'Reaction', value: 4 },
      { label: 'Shot Power', value: -3 },
    ],
  },
  {
    id: 'spin-sling',
    name: 'Spin Sling',
    description: 'Built for wall angles and trick shots.',
    visualStyle: 'fork',
    modifiers: {
      powerModifier: -1,
      accuracyModifier: 1,
      spinModifier: 8,
      gatherModifier: 1,
      releaseSpeedModifier: 0,
      fumbleResistanceModifier: -3,
    },
    attributeModifiers: {
      shotSpin: 8,
      toughness: -3,
    },
    summaryModifiers: [
      { label: 'Shot Spin', value: 8 },
      { label: 'Bank Assist', value: 3 },
      { label: 'Fumble Resistance', value: -3 },
    ],
  },
  {
    id: 'quick-whip',
    name: 'Quick Whip',
    description: 'Fast handling and quick releases.',
    visualStyle: 'whip',
    modifiers: {
      powerModifier: -4,
      accuracyModifier: 0,
      spinModifier: 2,
      gatherModifier: 2,
      releaseSpeedModifier: 5,
      fumbleResistanceModifier: 0,
    },
    attributeModifiers: {
      speed: 5,
      reaction: 3,
      shotPower: -4,
    },
    summaryModifiers: [
      { label: 'Speed', value: 5 },
      { label: 'Release Speed', value: 5 },
      { label: 'Reaction', value: 3 },
      { label: 'Shot Power', value: -4 },
    ],
  },
]

export function getStickType(id: string | null | undefined): StickType {
  return (
    stickTypes.find((stick) => stick.id === id) ??
    stickTypes[0]
  )
}

export function migrateStickId(id: unknown): string {
  if (typeof id !== 'string') {
    return 'balanced-cesta'
  }

  const direct = stickTypes.find((stick) => stick.id === id)

  if (direct) {
    return direct.id
  }

  switch (id) {
    case 'training-sling':
    case 'bankshot-fork':
      return 'spin-sling'
    case 'backyard-cesta':
      return 'balanced-cesta'
    default:
      return 'balanced-cesta'
  }
}
