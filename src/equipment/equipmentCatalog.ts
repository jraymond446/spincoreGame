import { stickTypes } from './stickTypes'
import type { EquipmentItem } from './equipmentTypes'

export const equipmentCatalog: EquipmentItem[] = [
  ...stickTypes.map(
    (stick): EquipmentItem => ({
      id: stick.id,
      name: stick.name,
      type: 'stick',
      rarity: 'starter',
      price: 0,
      modifiers: stick.attributeModifiers,
      description: stick.description,
    }),
  ),
  {
    id: 'brickwall-shield',
    name: 'Brickwall Keeper Shield',
    type: 'shield',
    rarity: 'common',
    price: 80,
    modifiers: { toughness: 3, reaction: 1 },
    description: 'A compact keeper plate built for hard deflections.',
  },
  {
    id: 'light-court-shoes',
    name: 'Light Court Shoes',
    type: 'shoes',
    rarity: 'common',
    price: 55,
    modifiers: { speed: 3, reaction: 1 },
    description: 'Low-profile grip for quicker cuts and recoveries.',
  },
]
