import type { EquipmentItem } from '../equipment/equipmentTypes'
import type { SaveGame } from '../save/saveTypes'
import { createSpincoreBadge } from './SpincoreBadge'
import { createSpincoreButton } from './SpincoreButton'

export function createSpincoreEquipmentCard(options: {
  item: EquipmentItem
  save: SaveGame
  onBuy: () => void
  onEquip: () => void
}): HTMLElement {
  const { item, save } = options
  const card = document.createElement('article')
  card.className = `store-item spincore-equipment-card is-${item.rarity}`
  const meta = document.createElement('div')
  meta.className = 'store-item-meta'
  meta.append(
    createSpincoreBadge(titleCase(item.type), 'blue'),
    createSpincoreBadge(titleCase(item.rarity), rarityTone(item.rarity)),
  )
  const icon = document.createElement('div')
  icon.className = `spincore-equipment-icon is-${item.type}`
  icon.textContent =
    item.type === 'stick' ? 'STK' : item.type === 'shield' ? 'SHD' : 'SPD'
  const name = document.createElement('h2')
  name.textContent = item.name
  const description = document.createElement('p')
  description.textContent = item.description
  const modifiers = document.createElement('div')
  modifiers.className = 'store-modifiers'
  const modifierEntries = Object.entries(item.modifiers)

  if (modifierEntries.length === 0) {
    modifiers.appendChild(createSpincoreBadge('STANDARD ISSUE', 'navy'))
  } else {
    for (const [key, value] of modifierEntries) {
      modifiers.appendChild(
        createSpincoreBadge(`+${value} ${titleCase(key)}`, 'mint'),
      )
    }
  }

  const owned = save.equipment.inventory.includes(item.id)
  const equipped = Object.values(save.equipment.equipped).includes(item.id)
  const footer = document.createElement('div')
  footer.className = 'store-item-footer'
  const price = document.createElement('strong')
  price.textContent = item.price === 0 ? 'ISSUED' : `$${item.price}`
  const action = owned
    ? createSpincoreButton(
        equipped ? 'Equipped' : 'Equip',
        options.onEquip,
        {
          tone: equipped ? 'quiet' : 'secondary',
          disabled: equipped,
        },
      )
    : createSpincoreButton('Buy', options.onBuy, {
        tone: 'primary',
        disabled: save.wallet.money < item.price,
      })
  footer.append(price, action)
  card.append(meta, icon, name, description, modifiers, footer)
  return card
}

function rarityTone(
  rarity: EquipmentItem['rarity'],
): 'navy' | 'rose' | 'gold' {
  if (rarity === 'rare') {
    return 'rose'
  }

  return rarity === 'starter' ? 'navy' : 'gold'
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
