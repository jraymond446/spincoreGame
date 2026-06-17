import type { StickStyle } from '../game/data/matchTypes'
import type { PlayerAttributeKey } from '../save/saveTypes'
import { equipmentPerks } from './perkCatalog.ts'
import type {
  EquipmentPerk,
  EquipmentRarity,
  EquipmentShopId,
} from './equipmentTypes'

export type StickGameplayModifiers = {
  powerModifier: number
  accuracyModifier: number
  spinModifier: number
  gatherModifier: number
  releaseSpeedModifier: number
  fumbleResistanceModifier: number
}

export type StickCatalogMeta = {
  rarity: EquipmentRarity
  price: number
  shopId: EquipmentShopId
  leagueId: string
  statBudget: number
  perks?: EquipmentPerk[]
  unlockHint?: string
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
  availableAtCreation?: boolean
  catalog: StickCatalogMeta
}

const rookieLeagueId = 'rookie_circuit'
const wallLeagueId = 'wall_rats_circuit'
const apexLeagueId = 'apex_circuit'

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
    attributeModifiers: { shotAccuracy: 1 },
    summaryModifiers: [
      { label: 'Shot Accuracy', value: 1 },
    ],
    availableAtCreation: true,
    catalog: {
      rarity: 'starter',
      price: 0,
      shopId: 'rookie_depot',
      leagueId: rookieLeagueId,
      statBudget: 0,
    },
  },
  {
    id: 'power-bat',
    name: 'Power Bat',
    description: 'Heavy stick that fires hard but demands cleaner aim.',
    visualStyle: 'hammer',
    modifiers: {
      powerModifier: 3,
      accuracyModifier: -2,
      spinModifier: 0,
      gatherModifier: -1,
      releaseSpeedModifier: -1,
      fumbleResistanceModifier: 2,
    },
    attributeModifiers: {
      shotPower: 2,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 2 },
      { label: 'Gather', value: -1 },
    ],
    availableAtCreation: true,
    catalog: {
      rarity: 'common',
      price: 70,
      shopId: 'rookie_depot',
      leagueId: rookieLeagueId,
      statBudget: 2,
    },
  },
  {
    id: 'control-hook',
    name: 'Control Hook',
    description: 'Easier catches and safer possession.',
    visualStyle: 'hook',
    modifiers: {
      powerModifier: -2,
      accuracyModifier: 1,
      spinModifier: 1,
      gatherModifier: 4,
      releaseSpeedModifier: 0,
      fumbleResistanceModifier: 3,
    },
    attributeModifiers: {
      shotAccuracy: 3,
      shotSpin: 3,
    },
    summaryModifiers: [
      { label: 'Shot Accuracy', value: 3 },
      { label: 'Shot Spin', value: 3 },
    ],
    availableAtCreation: true,
    catalog: {
      rarity: 'uncommon',
      price: 140,
      shopId: 'riverside_market',
      leagueId: rookieLeagueId,
      statBudget: 3,
    },
  },
  {
    id: 'spin-sling',
    name: 'Spin Sling',
    description: 'Built for wall angles and trick shots.',
    visualStyle: 'fork',
    modifiers: {
      powerModifier: -1,
      accuracyModifier: 1,
      spinModifier: 5,
      gatherModifier: 1,
      releaseSpeedModifier: 0,
      fumbleResistanceModifier: -2,
    },
    attributeModifiers: {
      shotSpin: 5,
      shotAccuracy: 3,
    },
    summaryModifiers: [
      { label: 'Shot Spin', value: 5 },
      { label: 'Shot Accuracy', value: 3 },
    ],
    availableAtCreation: true,
    catalog: {
      rarity: 'uncommon',
      price: 160,
      shopId: 'riverside_market',
      leagueId: rookieLeagueId,
      statBudget: 5,
    },
  },
  {
    id: 'quick-whip',
    name: 'Quick Whip',
    description: 'Fast handling and quick releases.',
    visualStyle: 'whip',
    modifiers: {
      powerModifier: -2,
      accuracyModifier: 0,
      spinModifier: 2,
      gatherModifier: 2,
      releaseSpeedModifier: 3,
      fumbleResistanceModifier: 0,
    },
    attributeModifiers: {
      shotPower: 3,
      shotAccuracy: 3,
      shotSpin: 3,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 3 },
      { label: 'Shot Accuracy', value: 3 },
      { label: 'Shot Spin', value: 3 },
    ],
    availableAtCreation: true,
    catalog: {
      rarity: 'uncommon',
      price: 150,
      shopId: 'riverside_market',
      leagueId: rookieLeagueId,
      statBudget: 3,
    },
  },
  {
    id: 'bank-reader-hook',
    name: 'Bank Reader Hook',
    description: 'A blue-tier hook built for cleaner wall recoveries.',
    visualStyle: 'hook',
    modifiers: {
      powerModifier: -1,
      accuracyModifier: 2,
      spinModifier: 2,
      gatherModifier: 6,
      releaseSpeedModifier: 1,
      fumbleResistanceModifier: 4,
    },
    attributeModifiers: {
      shotAccuracy: 8,
      shotSpin: 8,
    },
    summaryModifiers: [
      { label: 'Shot Accuracy', value: 8 },
      { label: 'Shot Spin', value: 8 },
    ],
    catalog: {
      rarity: 'rare',
      price: 320,
      shopId: 'wall_rat_workshop',
      leagueId: wallLeagueId,
      statBudget: 8,
      perks: [equipmentPerks.wallMagnet],
      unlockHint: 'Normally unlocked after reaching the Wall Rats circuit.',
    },
  },
  {
    id: 'arc-fork',
    name: 'Arc Fork',
    description: 'A rare split-head stick for bank-shot specialists.',
    visualStyle: 'fork',
    modifiers: {
      powerModifier: 0,
      accuracyModifier: 3,
      spinModifier: 7,
      gatherModifier: 2,
      releaseSpeedModifier: 1,
      fumbleResistanceModifier: -1,
    },
    attributeModifiers: {
      shotSpin: 12,
      shotAccuracy: 8,
    },
    summaryModifiers: [
      { label: 'Shot Spin', value: 12 },
      { label: 'Shot Accuracy', value: 8 },
    ],
    catalog: {
      rarity: 'rare',
      price: 360,
      shopId: 'wall_rat_workshop',
      leagueId: wallLeagueId,
      statBudget: 8,
      perks: [equipmentPerks.bankReverse],
      unlockHint: 'Normally unlocked after beating a bank-shot club.',
    },
  },
  {
    id: 'crash-hammer',
    name: 'Crash Hammer',
    description: 'A rare heavy club for crease battles and hard clears.',
    visualStyle: 'hammer',
    modifiers: {
      powerModifier: 7,
      accuracyModifier: -2,
      spinModifier: 0,
      gatherModifier: -1,
      releaseSpeedModifier: -1,
      fumbleResistanceModifier: 6,
    },
    attributeModifiers: {
      shotPower: 12,
      shotAccuracy: 8,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 12 },
      { label: 'Shot Accuracy', value: 8 },
    ],
    catalog: {
      rarity: 'rare',
      price: 380,
      shopId: 'crease_foundry',
      leagueId: wallLeagueId,
      statBudget: 12,
      perks: [equipmentPerks.longCharge],
      unlockHint: 'Normally unlocked after reaching a crease-heavy league.',
    },
  },
  {
    id: 'cyclone-whip',
    name: 'Cyclone Whip',
    description: 'Epic release speed for players who live off cuts.',
    visualStyle: 'whip',
    modifiers: {
      powerModifier: -1,
      accuracyModifier: 2,
      spinModifier: 5,
      gatherModifier: 4,
      releaseSpeedModifier: 7,
      fumbleResistanceModifier: 2,
    },
    attributeModifiers: {
      shotPower: 13,
      shotAccuracy: 13,
      shotSpin: 13,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 13 },
      { label: 'Shot Accuracy', value: 13 },
      { label: 'Shot Spin', value: 13 },
    ],
    catalog: {
      rarity: 'epic',
      price: 760,
      shopId: 'apex_outfitters',
      leagueId: apexLeagueId,
      statBudget: 13,
      perks: [equipmentPerks.snapPass, equipmentPerks.wallMagnet],
      unlockHint: 'Normally unlocked after entering faster upper leagues.',
    },
  },
  {
    id: 'prism-cesta',
    name: 'Prism Cesta',
    description: 'Legendary all-court control with premium release feel.',
    visualStyle: 'cradle',
    modifiers: {
      powerModifier: 4,
      accuracyModifier: 5,
      spinModifier: 5,
      gatherModifier: 8,
      releaseSpeedModifier: 4,
      fumbleResistanceModifier: 6,
    },
    attributeModifiers: {
      shotPower: 20,
      shotAccuracy: 20,
      shotSpin: 20,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 20 },
      { label: 'Shot Accuracy', value: 20 },
      { label: 'Shot Spin', value: 20 },
    ],
    catalog: {
      rarity: 'legendary',
      price: 1450,
      shopId: 'apex_outfitters',
      leagueId: apexLeagueId,
      statBudget: 20,
      perks: [
        equipmentPerks.snapPassEnhanced,
        equipmentPerks.longChargeEnhanced,
      ],
      unlockHint: 'Normally unlocked in the highest league stores.',
    },
  },
  {
    id: 'orbit-breaker',
    name: 'Orbit Breaker',
    description: 'Ultra triumph stick. One-of-one tech for impossible banks.',
    visualStyle: 'fork',
    modifiers: {
      powerModifier: 6,
      accuracyModifier: 6,
      spinModifier: 9,
      gatherModifier: 6,
      releaseSpeedModifier: 5,
      fumbleResistanceModifier: 4,
    },
    attributeModifiers: {
      shotPower: 26,
      shotAccuracy: 26,
      shotSpin: 26,
    },
    summaryModifiers: [
      { label: 'Shot Power', value: 26 },
      { label: 'Shot Accuracy', value: 26 },
      { label: 'Shot Spin', value: 26 },
    ],
    catalog: {
      rarity: 'ultra',
      price: 2600,
      shopId: 'triumph_vault',
      leagueId: apexLeagueId,
      statBudget: 26,
      perks: [
        equipmentPerks.bankReverseEnhanced,
        equipmentPerks.exoticOrbit,
      ],
      unlockHint: 'Future triumph: win a league title with 3 bank goals.',
    },
  },
]

export const startingStickTypes = stickTypes.filter(
  (stick) => stick.availableAtCreation !== false,
)

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
