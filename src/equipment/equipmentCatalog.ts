import { stickTypes, equipmentPerks, migrateStickId } from './stickTypes'
import type {
  EquipmentItem,
  EquipmentShop,
  EquipmentShopId,
  EquipmentType,
} from './equipmentTypes'

export const equipmentShops: EquipmentShop[] = [
  {
    id: 'rookie_depot',
    name: 'Rookie Depot',
    leagueId: 'rookie_circuit',
    tierLabel: 'Grey stock',
    description:
      'Issued gear and cheap first upgrades. Small bumps, no perks.',
    prototypeAvailable: true,
  },
  {
    id: 'riverside_market',
    name: 'Riverside Market',
    leagueId: 'rookie_circuit',
    tierLabel: 'Green stock',
    description:
      'Early identity gear for speed, catches, and cleaner handling.',
    prototypeAvailable: true,
  },
  {
    id: 'wall_rat_workshop',
    name: 'Wall Rat Workshop',
    leagueId: 'wall_rats_circuit',
    tierLabel: 'Blue stock',
    description:
      'First perk shop. Bank shots, rebounds, and wall play start to matter.',
    prototypeAvailable: true,
  },
  {
    id: 'crease_foundry',
    name: 'Crease Foundry',
    leagueId: 'crease_circuit',
    tierLabel: 'Blue/Purple stock',
    description:
      'Heavy gear for contact, keeper play, and charge protection.',
    prototypeAvailable: true,
  },
  {
    id: 'apex_outfitters',
    name: 'Apex Outfitters',
    leagueId: 'apex_circuit',
    tierLabel: 'Purple/Orange stock',
    description:
      'Premium league gear with big budgets and build-defining perks.',
    prototypeAvailable: true,
  },
  {
    id: 'triumph_vault',
    name: 'Triumph Vault',
    leagueId: 'apex_circuit',
    tierLabel: 'Red ultra previews',
    description:
      'Future title, sponsorship, and triumph awards. Open for prototype testing.',
    prototypeAvailable: true,
  },
]

export const equipmentCatalog: EquipmentItem[] = [
  ...stickTypes.map(
    (stick): EquipmentItem => ({
      id: stick.id,
      name: stick.name,
      type: 'stick',
      rarity: stick.catalog.rarity,
      shopId: stick.catalog.shopId,
      leagueId: stick.catalog.leagueId,
      price: stick.catalog.price,
      statBudget: stick.catalog.statBudget,
      modifiers: stick.attributeModifiers,
      description: stick.description,
      perks: stick.catalog.perks,
      unlockHint: stick.catalog.unlockHint,
      cosmeticSlots:
        stick.catalog.rarity === 'ultra'
          ? ['stickSkin', 'trail', 'goalBurst']
          : ['stickSkin'],
      ultraUnique: stick.catalog.rarity === 'ultra',
    }),
  ),
  createItem({
    id: 'rookie-guard-shield',
    name: 'Rookie Guard Shield',
    type: 'shield',
    rarity: 'common',
    shopId: 'rookie_depot',
    leagueId: 'rookie_circuit',
    price: 65,
    statBudget: 2,
    modifiers: { toughness: 1, reaction: 1 },
    description: 'Compact keeper plate. Just enough bite to matter.',
  }),
  createItem({
    id: 'court-grip-shoes',
    name: 'Court Grip Shoes',
    type: 'shoes',
    rarity: 'common',
    shopId: 'rookie_depot',
    leagueId: 'rookie_circuit',
    price: 55,
    statBudget: 2,
    modifiers: { speed: 1, reaction: 1 },
    description: 'Cheap traction for the first step after a loose core.',
  }),
  createItem({
    id: 'padded-kit',
    name: 'Padded Kit',
    type: 'armor',
    rarity: 'common',
    shopId: 'rookie_depot',
    leagueId: 'rookie_circuit',
    price: 60,
    statBudget: 2,
    modifiers: { toughness: 2 },
    description: 'Basic padding for players tired of getting bounced.',
  }),
  createItem({
    id: 'slide-step-shoes',
    name: 'Slide Step Shoes',
    type: 'shoes',
    rarity: 'uncommon',
    shopId: 'riverside_market',
    leagueId: 'rookie_circuit',
    price: 145,
    statBudget: 4,
    modifiers: { speed: 3, reaction: 1 },
    description: 'Green-tier speed shoes for cleaner support cuts.',
  }),
  createItem({
    id: 'focus-sleeves',
    name: 'Focus Sleeves',
    type: 'armor',
    rarity: 'uncommon',
    shopId: 'riverside_market',
    leagueId: 'rookie_circuit',
    price: 160,
    statBudget: 5,
    modifiers: { shotAccuracy: 2, reaction: 2, toughness: 1 },
    description: 'Light armor that keeps hands calm under pressure.',
  }),
  createItem({
    id: 'pocket-plate',
    name: 'Pocket Plate',
    type: 'shield',
    rarity: 'uncommon',
    shopId: 'riverside_market',
    leagueId: 'rookie_circuit',
    price: 150,
    statBudget: 4,
    modifiers: { toughness: 2, reaction: 2 },
    description: 'A small shield for fast keepers who still want contact.',
  }),
  createItem({
    id: 'bank-step-shoes',
    name: 'Bank Step Shoes',
    type: 'shoes',
    rarity: 'rare',
    shopId: 'wall_rat_workshop',
    leagueId: 'wall_rats_circuit',
    price: 340,
    statBudget: 7,
    modifiers: { speed: 2, reaction: 2, shotSpin: 3 },
    description: 'Blue-tier shoes tuned for cuts after wall rebounds.',
    perks: [equipmentPerks.wallMagnet],
    unlockHint: 'Normally unlocked by reaching the Wall Rats shop.',
  }),
  createItem({
    id: 'angle-plate',
    name: 'Angle Plate',
    type: 'shield',
    rarity: 'rare',
    shopId: 'wall_rat_workshop',
    leagueId: 'wall_rats_circuit',
    price: 360,
    statBudget: 8,
    modifiers: { reaction: 4, toughness: 2, shotAccuracy: 2 },
    description: 'Keeper tech for reading strange wall exits.',
    perks: [equipmentPerks.wallMagnet],
  }),
  createItem({
    id: 'brickwall-shield',
    name: 'Brickwall Keeper Shield',
    type: 'shield',
    rarity: 'rare',
    shopId: 'crease_foundry',
    leagueId: 'crease_circuit',
    price: 390,
    statBudget: 9,
    modifiers: { toughness: 5, reaction: 4 },
    description: 'A compact keeper plate built for hard deflections.',
    perks: [equipmentPerks.longCharge],
  }),
  createItem({
    id: 'crash-padding',
    name: 'Crash Padding',
    type: 'armor',
    rarity: 'epic',
    shopId: 'crease_foundry',
    leagueId: 'crease_circuit',
    price: 740,
    statBudget: 13,
    modifiers: { toughness: 8, reaction: 3, shotPower: 2 },
    description: 'Purple armor for bruisers who want to keep possession.',
    perks: [equipmentPerks.longCharge, equipmentPerks.snapPass],
  }),
  createItem({
    id: 'apex-runners',
    name: 'Apex Runners',
    type: 'shoes',
    rarity: 'epic',
    shopId: 'apex_outfitters',
    leagueId: 'apex_circuit',
    price: 820,
    statBudget: 14,
    modifiers: { speed: 6, reaction: 5, shotAccuracy: 3 },
    description: 'Fast upper-league shoes for space creation.',
    perks: [equipmentPerks.snapPass, equipmentPerks.wallMagnet],
  }),
  createItem({
    id: 'sponsor-exoshell',
    name: 'Sponsor Exoshell',
    type: 'armor',
    rarity: 'legendary',
    shopId: 'apex_outfitters',
    leagueId: 'apex_circuit',
    price: 1500,
    statBudget: 20,
    modifiers: {
      toughness: 7,
      reaction: 5,
      speed: 3,
      shotPower: 5,
    },
    description: 'Orange-tier armor for late-league stars.',
    perks: [equipmentPerks.longCharge, equipmentPerks.snapPass],
    unlockHint: 'Future sponsorship reward candidate.',
  }),
  createItem({
    id: 'redline-spikes',
    name: 'Redline Spikes',
    type: 'shoes',
    rarity: 'ultra',
    shopId: 'triumph_vault',
    leagueId: 'apex_circuit',
    price: 2600,
    statBudget: 26,
    modifiers: {
      speed: 6,
      reaction: 6,
      shotAccuracy: 5,
      shotSpin: 5,
      toughness: 4,
    },
    description: 'Ultra shoes for impossible cuts. Future triumph loot.',
    perks: [equipmentPerks.ultraOrbit],
    unlockHint: 'Future triumph: win a league title with 5 steals.',
    ultraUnique: true,
    cosmeticSlots: ['trail', 'goalBurst'],
  }),
]

export function getEquipmentShop(id: EquipmentShopId): EquipmentShop {
  return (
    equipmentShops.find((shop) => shop.id === id) ??
    equipmentShops[0]
  )
}

export function getEquipmentItem(
  id: string | null | undefined,
): EquipmentItem | null {
  return equipmentCatalog.find((item) => item.id === id) ?? null
}

export function getEquipmentItemsForShop(
  shopId: EquipmentShopId,
): EquipmentItem[] {
  return equipmentCatalog.filter((item) => item.shopId === shopId)
}

export function migrateEquipmentId(id: unknown): string | null {
  if (typeof id !== 'string') {
    return null
  }

  const direct = getEquipmentItem(id)

  if (direct) {
    return direct.id
  }

  const migratedStickId = migrateStickId(id)
  return getEquipmentItem(migratedStickId)?.id ?? null
}

export function isEquipmentType(
  item: EquipmentItem | null,
  type: EquipmentType,
): item is EquipmentItem {
  return item?.type === type
}

function createItem(item: EquipmentItem): EquipmentItem {
  return item
}
