import type { EquipmentItem } from './equipmentTypes'

export const equipmentCatalog: EquipmentItem[] = [
  {
    id: 'backyard-cesta',
    name: 'Backyard Cesta',
    type: 'stick',
    rarity: 'starter',
    price: 0,
    modifiers: {},
    description: 'A dependable starter scoop with no surprises.',
  },
  {
    id: 'training-sling',
    name: 'Training Sling',
    type: 'stick',
    rarity: 'common',
    price: 60,
    modifiers: { control: 2, passing: 2 },
    description: 'Soft pocketing makes catches and outlet passes cleaner.',
  },
  {
    id: 'brickwall-shield',
    name: 'Brickwall Keeper Shield',
    type: 'shield',
    rarity: 'common',
    price: 80,
    modifiers: { defense: 3, reaction: 1 },
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
  {
    id: 'bankshot-fork',
    name: 'Bankshot Fork',
    type: 'stick',
    rarity: 'rare',
    price: 140,
    modifiers: { accuracy: 4, shooting: 2 },
    description: 'A rigid split lip for players who live off the wall.',
  },
]

