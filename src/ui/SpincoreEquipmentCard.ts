import type { EquipmentItem } from '../equipment/equipmentTypes'
import { equipmentRarityInfo } from '../equipment/equipmentTypes'
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
  const rarity = equipmentRarityInfo[item.rarity]
  meta.append(
    createSpincoreBadge(titleCase(item.type), 'blue'),
    createSpincoreBadge(rarity.label, rarityTone(item.rarity)),
    createSpincoreBadge(`${item.statBudget} PTS`, 'navy'),
  )
  const icon = document.createElement('div')
  icon.className =
    `spincore-equipment-icon is-${item.type} is-${item.rarity}`
  icon.textContent =
    item.type === 'stick'
      ? 'STK'
      : item.type === 'shield'
        ? 'SHD'
        : item.type === 'armor'
          ? 'ARM'
          : 'SPD'
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
        createSpincoreBadge(
          `${value > 0 ? '+' : ''}${value} ${titleCase(key)}`,
          value > 0 ? 'mint' : 'rose',
        ),
      )
    }
  }

  if (item.perks?.length) {
    for (const perk of item.perks) {
      modifiers.appendChild(
        createSpincoreBadge(
          `${perk.tier.toUpperCase()}: ${perk.name}`,
          perk.tier === 'exotic'
            ? 'rose'
            : perk.tier === 'enhanced'
              ? 'gold'
              : 'blue',
        ),
      )
    }
  }

  if (item.cosmeticSlots?.length) {
    modifiers.appendChild(
      createSpincoreBadge(
        `${item.cosmeticSlots.length} COSMETIC HOOKS`,
        'gold',
      ),
    )
  }

  if (item.unlockHint) {
    const hint = document.createElement('small')
    hint.className = 'store-unlock-hint'
    hint.textContent = item.unlockHint
    modifiers.appendChild(hint)
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
): 'navy' | 'rose' | 'gold' | 'blue' | 'mint' {
  switch (rarity) {
    case 'starter':
    case 'common':
      return 'navy'
    case 'uncommon':
      return 'mint'
    case 'rare':
      return 'blue'
    case 'epic':
    case 'ultra':
      return 'rose'
    case 'legendary':
      return 'gold'
  }
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
