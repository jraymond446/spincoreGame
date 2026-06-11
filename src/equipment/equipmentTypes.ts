import type {
  PlayerAttributeKey,
} from '../save/saveTypes'

export type EquipmentType = 'stick' | 'shield' | 'shoes'
export type EquipmentRarity = 'starter' | 'common' | 'rare'

export type EquipmentItem = {
  id: string
  name: string
  type: EquipmentType
  rarity: EquipmentRarity
  price: number
  modifiers: Partial<Record<PlayerAttributeKey, number>>
  description: string
}

