import type { PlayerAttributeKey } from '../save/saveTypes'
import {
  equipmentRarityInfo,
  type EquipmentItem,
  type EquipmentPerk,
  type EquipmentPerkTier,
  type EquipmentRarity,
  type EquipmentShopId,
  type EquipmentType,
} from './equipmentTypes.ts'
import { equipmentPerkCatalog } from './perkCatalog.ts'

export type LootRollSource =
  | 'shopRefresh'
  | 'postMatch'
  | 'playoffReward'
  | 'leagueTitle'
  | 'topTierSeason'
  | 'sponsorship'

export type LootRollTableId =
  | 'rookie-shop-roll'
  | 'riverside-shop-roll'
  | 'wall-rat-shop-roll'
  | 'crease-foundry-roll'
  | 'apex-shop-roll'
  | 'triumph-vault-roll'
  | 'post-match-cache'
  | 'playoff-upset-cache'
  | 'league-title-cache'
  | 'apex-season-cache'

export type WeightedRarity = {
  rarity: EquipmentRarity
  weight: number
}

export type LootRollTable = {
  id: LootRollTableId
  name: string
  description: string
  source: LootRollSource
  shopId: EquipmentShopId
  leagueId: string
  allowedTypes: EquipmentType[]
  rarityWeights: WeightedRarity[]
  perkPool: EquipmentPerk[]
}

export type LootRollOptions = {
  tableId: LootRollTableId
  seed?: string | number
  rng?: () => number
}

const rookieLeagueId = 'rookie_circuit'
const wallLeagueId = 'wall_rats_circuit'
const creaseLeagueId = 'crease_circuit'
const apexLeagueId = 'apex_circuit'

export const equipmentTypeStatPools: Record<
  EquipmentType,
  PlayerAttributeKey[]
> = {
  stick: ['shotPower', 'shotAccuracy', 'shotSpin'],
  shield: ['toughness', 'reaction'],
  shoes: ['speed', 'reaction'],
  armor: ['toughness'],
}

export const lootRollTables: LootRollTable[] = [
  {
    id: 'rookie-shop-roll',
    name: 'Rookie Shop Roll',
    description:
      'Grey seasonal store stock. Plain gear rolls 0-3 on each type stat.',
    source: 'shopRefresh',
    shopId: 'rookie_depot',
    leagueId: rookieLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [{ rarity: 'common', weight: 1 }],
    perkPool: [],
  },
  {
    id: 'riverside-shop-roll',
    name: 'Riverside Shop Roll',
    description:
      'Green seasonal store stock. Uncommon gear rolls 3-7 on each type stat.',
    source: 'shopRefresh',
    shopId: 'riverside_market',
    leagueId: rookieLeagueId,
    allowedTypes: ['stick', 'shoes', 'armor'],
    rarityWeights: [{ rarity: 'uncommon', weight: 1 }],
    perkPool: [],
  },
  {
    id: 'wall-rat-shop-roll',
    name: 'Wall Rat Shop Roll',
    description:
      'Blue seasonal store stock with one standard type-matched perk.',
    source: 'shopRefresh',
    shopId: 'wall_rat_workshop',
    leagueId: wallLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes'],
    rarityWeights: [{ rarity: 'rare', weight: 1 }],
    perkPool: standardPerks(),
  },
  {
    id: 'crease-foundry-roll',
    name: 'Crease Foundry Roll',
    description:
      'Purple seasonal store stock with two standard type-matched perks.',
    source: 'shopRefresh',
    shopId: 'crease_foundry',
    leagueId: creaseLeagueId,
    allowedTypes: ['stick', 'shield', 'armor'],
    rarityWeights: [{ rarity: 'epic', weight: 1 }],
    perkPool: standardPerks(),
  },
  {
    id: 'apex-shop-roll',
    name: 'Apex Shop Roll',
    description:
      'Orange seasonal store stock with two enhanced type-matched perks.',
    source: 'shopRefresh',
    shopId: 'apex_outfitters',
    leagueId: apexLeagueId,
    allowedTypes: ['stick', 'shoes', 'armor'],
    rarityWeights: [{ rarity: 'legendary', weight: 1 }],
    perkPool: enhancedPerks(),
  },
  {
    id: 'triumph-vault-roll',
    name: 'Triumph Vault Roll',
    description:
      'Red preview stock. Ultra gear rolls 26 on every type stat.',
    source: 'shopRefresh',
    shopId: 'triumph_vault',
    leagueId: apexLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [{ rarity: 'ultra', weight: 1 }],
    perkPool: equipmentPerkCatalog,
  },
  {
    id: 'post-match-cache',
    name: 'Post-Match Cache',
    description:
      'Normal match drop pool. Mostly plain and green, with rare blue spikes.',
    source: 'postMatch',
    shopId: 'rookie_depot',
    leagueId: rookieLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [
      { rarity: 'common', weight: 60 },
      { rarity: 'uncommon', weight: 34 },
      { rarity: 'rare', weight: 6 },
    ],
    perkPool: standardPerks(),
  },
  {
    id: 'playoff-upset-cache',
    name: 'Playoff Upset Cache',
    description:
      'Post-playoff rewards that can punch slightly above the current league.',
    source: 'playoffReward',
    shopId: 'triumph_vault',
    leagueId: wallLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [
      { rarity: 'rare', weight: 70 },
      { rarity: 'epic', weight: 30 },
    ],
    perkPool: standardPerks(),
  },
  {
    id: 'league-title-cache',
    name: 'League Title Cache',
    description:
      'Championship loot with a real chance at orange and red pieces.',
    source: 'leagueTitle',
    shopId: 'triumph_vault',
    leagueId: apexLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [
      { rarity: 'epic', weight: 56 },
      { rarity: 'legendary', weight: 38 },
      { rarity: 'ultra', weight: 6 },
    ],
    perkPool: equipmentPerkCatalog,
  },
  {
    id: 'apex-season-cache',
    name: 'Apex Season Cache',
    description:
      'Repeatable top-tier season loot for indefinite franchise replay.',
    source: 'topTierSeason',
    shopId: 'triumph_vault',
    leagueId: apexLeagueId,
    allowedTypes: ['stick', 'shield', 'shoes', 'armor'],
    rarityWeights: [
      { rarity: 'rare', weight: 18 },
      { rarity: 'epic', weight: 42 },
      { rarity: 'legendary', weight: 30 },
      { rarity: 'ultra', weight: 10 },
    ],
    perkPool: equipmentPerkCatalog,
  },
]

export function getLootRollTable(
  id: LootRollTableId,
): LootRollTable {
  return (
    lootRollTables.find((table) => table.id === id) ??
    lootRollTables[0]
  )
}

export function rollEquipmentDrop(
  options: LootRollOptions,
): EquipmentItem {
  const table = getLootRollTable(options.tableId)
  const rng = options.rng ?? seededRng(options.seed ?? table.id)
  const type = pickArray(table.allowedTypes, rng)
  const rarity = pickWeighted(
    table.rarityWeights,
    (entry) => entry.weight,
    rng,
  ).rarity
  const modifiers = rollModifiers(type, rarity, rng)
  const highestRoll = Math.max(0, ...Object.values(modifiers))
  const perks = rollPerks(table, type, rarity, rng)
  const suffix = Math.floor(rng() * 0xffffff)
    .toString(36)
    .padStart(4, '0')

  return {
    id: `rolled-${table.id}-${rarity}-${type}-${suffix}`,
    name: `${rollNamePrefix(table, rarity, rng)} ${typeName(type)}`,
    type,
    rarity,
    shopId: table.shopId,
    leagueId: table.leagueId,
    price: rollPrice(modifiers, rarity),
    statBudget: highestRoll,
    modifiers,
    description:
      `${table.name} generated ${typeName(type).toLowerCase()} with ` +
      `${equipmentRarityInfo[rarity].label.toLowerCase()} stat rolls.`,
    perks: perks.length > 0 ? perks : undefined,
    unlockHint: `Generated by ${table.description}`,
    cosmeticSlots: type === 'stick' ? ['stickSkin'] : undefined,
    ultraUnique: rarity === 'ultra',
  }
}

function rollModifiers(
  type: EquipmentType,
  rarity: EquipmentRarity,
  rng: () => number,
): Partial<Record<PlayerAttributeKey, number>> {
  const [min, max] = equipmentRarityInfo[rarity].statBudgetRange
  const modifiers: Partial<Record<PlayerAttributeKey, number>> = {}

  for (const key of equipmentTypeStatPools[type]) {
    modifiers[key] = rollInclusive(min, max, rng)
  }

  return modifiers
}

function rollPerks(
  table: LootRollTable,
  type: EquipmentType,
  rarity: EquipmentRarity,
  rng: () => number,
): EquipmentPerk[] {
  const perkRolls = equipmentRarityInfo[rarity].perkRolls
  const selected: EquipmentPerk[] = []

  for (const tier of perkRolls) {
    const candidates = filterPerks(table.perkPool, type, tier).filter(
      (candidate) =>
        !selected.some((chosen) => chosen.id === candidate.id),
    )

    if (candidates.length === 0) {
      continue
    }

    selected.push(
      pickWeighted(candidates, (entry) => entry.rollWeight ?? 1, rng),
    )
  }

  return selected
}

function filterPerks(
  perks: EquipmentPerk[],
  type: EquipmentType,
  tier: EquipmentPerkTier,
): EquipmentPerk[] {
  return perks.filter(
    (perk) =>
      perk.tier === tier &&
      perk.allowedTypes?.includes(type) !== false,
  )
}

function rollPrice(
  modifiers: Partial<Record<PlayerAttributeKey, number>>,
  rarity: EquipmentRarity,
): number {
  const rarityMultiplier: Record<EquipmentRarity, number> = {
    starter: 0,
    common: 18,
    uncommon: 22,
    rare: 30,
    epic: 42,
    legendary: 56,
    ultra: 80,
  }
  const statTotal = Object.values(modifiers).reduce(
    (sum, value) => sum + value,
    0,
  )

  return statTotal * rarityMultiplier[rarity]
}

function rollNamePrefix(
  table: LootRollTable,
  rarity: EquipmentRarity,
  rng: () => number,
): string {
  const sourcePrefixes: Record<LootRollSource, string[]> = {
    shopRefresh: ['Circuit', 'Tuned', 'Workshop'],
    postMatch: ['Match-Worn', 'Scouted', 'Locker'],
    playoffReward: ['Playoff', 'Clutch', 'Upset'],
    leagueTitle: ['Champion', 'Banner', 'Title'],
    topTierSeason: ['Apex', 'Seasoned', 'Prime'],
    sponsorship: ['Sponsor', 'Signature', 'Contract'],
  }
  const rarityPrefixes: Partial<Record<EquipmentRarity, string[]>> = {
    common: ['Plain', 'Grey'],
    uncommon: ['Green', 'Bright'],
    rare: ['Blue', 'Banked'],
    epic: ['Purple', 'Catalyst'],
    legendary: ['Orange', 'Mythic'],
    ultra: ['Redline', 'Impossible'],
  }
  const options = [
    ...(rarityPrefixes[rarity] ?? []),
    ...sourcePrefixes[table.source],
  ]

  return pickArray(options, rng)
}

function typeName(type: EquipmentType): string {
  switch (type) {
    case 'stick':
      return 'Stick'
    case 'shield':
      return 'Keeper Plate'
    case 'shoes':
      return 'Shoes'
    case 'armor':
      return 'Armor'
  }
}

function standardPerks(): EquipmentPerk[] {
  return equipmentPerkCatalog.filter((perk) => perk.tier === 'standard')
}

function enhancedPerks(): EquipmentPerk[] {
  return equipmentPerkCatalog.filter((perk) => perk.tier === 'enhanced')
}

function pickArray<T>(values: T[], rng: () => number): T {
  if (values.length === 0) {
    throw new Error('Cannot pick from an empty loot roll list.')
  }

  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]
}

function pickWeighted<T>(
  values: T[],
  weightFor: (value: T) => number,
  rng: () => number,
): T {
  const total = values.reduce(
    (sum, value) => sum + Math.max(0, weightFor(value)),
    0,
  )

  if (values.length === 0 || total <= 0) {
    throw new Error('Cannot pick from an empty weighted loot roll list.')
  }

  let threshold = rng() * total

  for (const value of values) {
    threshold -= Math.max(0, weightFor(value))

    if (threshold <= 0) {
      return value
    }
  }

  return values[values.length - 1]
}

function rollInclusive(
  min: number,
  max: number,
  rng: () => number,
): number {
  if (min === max) {
    return min
  }

  return min + Math.floor(rng() * (max - min + 1))
}

function seededRng(seed: string | number): () => number {
  let state = hashSeed(String(seed))

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
