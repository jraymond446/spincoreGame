import { equipmentRarityInfo } from './equipmentTypes.ts'
import { getEquipmentPerk } from './perkCatalog.ts'
import {
  equipmentTypeStatPools,
  getLootRollTable,
  rollEquipmentDrop,
  type LootRollTableId,
} from './lootRollTables.ts'

const snapPass = getEquipmentPerk('snap-pass')
assertEqual(snapPass?.name, 'Snap Feed', 'shared perk lookup')
assertEqual(snapPass?.tier, 'standard', 'shared perk tier')

const firstRoll = rollEquipmentDrop({
  tableId: 'wall-rat-shop-roll',
  seed: 'same-season-same-card',
})
const secondRoll = rollEquipmentDrop({
  tableId: 'wall-rat-shop-roll',
  seed: 'same-season-same-card',
})
assertEqual(
  JSON.stringify(firstRoll),
  JSON.stringify(secondRoll),
  'seeded loot roll determinism',
)

const tableIds = [
  'rookie-shop-roll',
  'riverside-shop-roll',
  'wall-rat-shop-roll',
  'crease-foundry-roll',
  'apex-shop-roll',
  'triumph-vault-roll',
  'post-match-cache',
  'playoff-upset-cache',
  'league-title-cache',
  'apex-season-cache',
] satisfies LootRollTableId[]

for (const tableId of tableIds) {
  for (let index = 0; index < 8; index += 1) {
    const table = getLootRollTable(tableId)
    const item = rollEquipmentDrop({
      tableId,
      seed: `${tableId}-${index}`,
    })
    const rarity = equipmentRarityInfo[item.rarity]
    const [minRoll, maxRoll] = rarity.statBudgetRange
    const statKeys = Object.keys(item.modifiers)
    const expectedStats = equipmentTypeStatPools[item.type]

    assert(
      table.allowedTypes.includes(item.type),
      `${tableId} rolled disallowed type ${item.type}`,
    )
    assert(
      table.rarityWeights.some((weight) => weight.rarity === item.rarity),
      `${tableId} rolled disallowed rarity ${item.rarity}`,
    )
    assertEqual(
      statKeys.length,
      expectedStats.length,
      `${tableId} rolled stat count for ${item.type}`,
    )

    for (const key of statKeys) {
      assert(
        expectedStats.includes(key as (typeof expectedStats)[number]),
        `${tableId} rolled ${key} on ${item.type}`,
      )
      const value = item.modifiers[key as keyof typeof item.modifiers]
      assert(
        typeof value === 'number' &&
          value >= minRoll &&
          value <= maxRoll,
        `${tableId} rolled ${key}=${value} outside ${item.rarity}`,
      )
    }

    assertEqual(
      item.statBudget,
      Math.max(...Object.values(item.modifiers)),
      `${tableId} statBudget tracks highest rolled stat`,
    )
    assertEqual(
      item.perks?.length ?? 0,
      rarity.perkRolls.length,
      `${tableId} perk count for ${item.rarity}`,
    )

    for (const [perkIndex, perkTier] of rarity.perkRolls.entries()) {
      assertEqual(
        item.perks?.[perkIndex]?.tier,
        perkTier,
        `${tableId} perk ${perkIndex} tier for ${item.rarity}`,
      )
      assert(
        item.perks?.[perkIndex]?.allowedTypes?.includes(item.type) !== false,
        `${tableId} perk ${perkIndex} disallowed on ${item.type}`,
      )
    }
  }
}

const ultraRoll = rollEquipmentDrop({
  tableId: 'triumph-vault-roll',
  rng: sequenceRng([
    0.26, // type: shield
    0, // rarity: ultra
    0.2, // toughness roll, ignored because min/max both 26
    0.8, // reaction roll, ignored because min/max both 26
    0.1, // enhanced perk
    0.1, // exotic perk
    0.3, // suffix
    0.4, // name prefix
  ]),
})
assertEqual(ultraRoll.rarity, 'ultra', 'scripted ultra roll rarity')
assertEqual(ultraRoll.statBudget, 26, 'scripted ultra highest stat')
assertEqual(ultraRoll.modifiers.toughness, 26, 'ultra toughness guaranteed')
assertEqual(ultraRoll.modifiers.reaction, 26, 'ultra reaction guaranteed')
assertEqual(ultraRoll.perks?.length, 2, 'scripted ultra perk count')
assertEqual(ultraRoll.perks?.[0]?.tier, 'enhanced', 'ultra enhanced perk')
assertEqual(ultraRoll.perks?.[1]?.tier, 'exotic', 'ultra exotic perk')
assertEqual(ultraRoll.ultraUnique, true, 'scripted ultra unique flag')

console.info('Loot roll table cases passed: 51')

function sequenceRng(values: number[]): () => number {
  let index = 0

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0
    index += 1
    return value
  }
}

function assert(
  condition: boolean,
  label: string,
): void {
  if (!condition) {
    throw new Error(label)
  }
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    )
  }
}
