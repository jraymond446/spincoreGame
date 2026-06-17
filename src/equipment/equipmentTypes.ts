import type {
  PlayerAttributeKey,
} from '../save/saveTypes'

export type EquipmentType = 'stick' | 'shield' | 'shoes' | 'armor'
export type EquipmentRarity =
  | 'starter'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'ultra'
export type EquipmentShopId =
  | 'rookie_depot'
  | 'riverside_market'
  | 'wall_rat_workshop'
  | 'crease_foundry'
  | 'apex_outfitters'
  | 'triumph_vault'
export type EquipmentPerkTier = 'standard' | 'enhanced' | 'exotic'
export type EquipmentPerkTag =
  | 'bank'
  | 'charge'
  | 'defense'
  | 'gather'
  | 'passing'
  | 'release'
  | 'wall'
  | 'ultra'

export type EquipmentPerk = {
  id: string
  name: string
  tier: EquipmentPerkTier
  description: string
  tags?: readonly EquipmentPerkTag[]
  allowedTypes?: readonly EquipmentType[]
  rollWeight?: number
}

export type EquipmentCosmeticSlot =
  | 'stickSkin'
  | 'trail'
  | 'uniformAccent'
  | 'goalBurst'

export type EquipmentShop = {
  id: EquipmentShopId
  name: string
  leagueId: string
  tierLabel: string
  description: string
  prototypeAvailable: boolean
}

export type EquipmentRarityInfo = {
  label: string
  color: 'grey' | 'green' | 'blue' | 'purple' | 'orange' | 'red'
  statBudgetRange: readonly [number, number]
  perkSlots: number
  perkRolls: readonly EquipmentPerkTier[]
  description: string
}

export const equipmentRarityInfo: Record<
  EquipmentRarity,
  EquipmentRarityInfo
> = {
  starter: {
    label: 'Starter',
    color: 'grey',
    statBudgetRange: [0, 0],
    perkSlots: 0,
    perkRolls: [],
    description: 'Issued gear. No cost, no flair, dependable baseline.',
  },
  common: {
    label: 'Common',
    color: 'grey',
    statBudgetRange: [0, 3],
    perkSlots: 0,
    perkRolls: [],
    description: 'Small stat bumps for early builds.',
  },
  uncommon: {
    label: 'Uncommon',
    color: 'green',
    statBudgetRange: [3, 7],
    perkSlots: 0,
    perkRolls: [],
    description: 'Early identity pieces with a clear direction.',
  },
  rare: {
    label: 'Rare',
    color: 'blue',
    statBudgetRange: [8, 12],
    perkSlots: 1,
    perkRolls: ['standard'],
    description: 'First perk tier. Gear starts changing play style.',
  },
  epic: {
    label: 'Epic',
    color: 'purple',
    statBudgetRange: [13, 19],
    perkSlots: 2,
    perkRolls: ['standard', 'standard'],
    description: 'Build-defining equipment with sharper tradeoffs.',
  },
  legendary: {
    label: 'Legendary',
    color: 'orange',
    statBudgetRange: [20, 25],
    perkSlots: 2,
    perkRolls: ['enhanced', 'enhanced'],
    description: 'Endgame league loot with premium stat budgets.',
  },
  ultra: {
    label: 'Ultra',
    color: 'red',
    statBudgetRange: [26, 26],
    perkSlots: 2,
    perkRolls: ['enhanced', 'exotic'],
    description: 'Scale-breaking triumph loot. Only one ultra should be worn.',
  },
}

export type EquipmentItem = {
  id: string
  name: string
  type: EquipmentType
  rarity: EquipmentRarity
  shopId: EquipmentShopId
  leagueId: string
  price: number
  statBudget: number
  modifiers: Partial<Record<PlayerAttributeKey, number>>
  description: string
  perks?: EquipmentPerk[]
  unlockHint?: string
  cosmeticSlots?: EquipmentCosmeticSlot[]
  ultraUnique?: boolean
}
