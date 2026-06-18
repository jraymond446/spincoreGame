import type { EquipmentItem } from '../equipment/equipmentTypes'
import { equipmentRarityInfo } from '../equipment/equipmentTypes'
import {
  getInventoryItemCount,
} from '../equipment/equipmentInventory'
import {
  getAvailableLoadoutCopies,
  getCreatedPlayerRosterSlot,
} from '../franchise/teamRoster'
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

  const ownedCount = getInventoryItemCount(save.equipment.inventory, item.id)
  const owned = ownedCount > 0
  const equipped = Object.values(save.equipment.equipped).includes(item.id)
  const canAfford = save.wallet.money >= item.price
  const canBuyCopy = canAfford && (!item.ultraUnique || !owned)
  const canEquip =
    owned &&
    !equipped &&
    getAvailableLoadoutCopies(save, item.id, {
      excludeSlotId: getCreatedPlayerRosterSlot(save.player),
    }) > 0
  const footer = document.createElement('div')
  footer.className = 'store-item-footer'
  const priceBlock = document.createElement('div')
  priceBlock.className = 'store-price-block'
  const price = document.createElement('strong')
  price.className = `store-price ${
    owned ? 'is-owned' : canAfford ? 'is-affordable' : 'is-unaffordable'
  }`
  price.textContent = owned
    ? `Own ${ownedCount}x`
    : priceLabel(item.price)
  priceBlock.appendChild(price)

  if (owned) {
    const copyPrice = document.createElement('span')
    copyPrice.className =
      `store-copy-price ${canAfford ? 'is-affordable' : 'is-unaffordable'}`
    copyPrice.textContent = item.ultraUnique
      ? 'Unique item'
      : `Copy ${priceLabel(item.price)}`
    priceBlock.appendChild(copyPrice)
  }

  const actions = document.createElement('div')
  actions.className = 'store-item-actions'

  if (owned) {
    actions.appendChild(
      createSpincoreButton(
        equipped ? 'Equipped' : canEquip ? 'Equip' : 'No Copy',
        options.onEquip,
        {
          tone: equipped || !canEquip ? 'quiet' : 'secondary',
          compact: true,
          disabled: equipped || !canEquip,
        },
      ),
    )
  }

  actions.appendChild(
    createSpincoreButton(
      owned
        ? item.ultraUnique
          ? 'Unique'
          : item.price === 0
            ? 'Claim Copy'
            : 'Buy Copy'
        : item.price === 0
          ? 'Claim'
          : 'Buy',
      options.onBuy,
      {
        tone: canBuyCopy ? 'primary' : 'quiet',
        compact: owned,
        disabled: !canBuyCopy,
      },
    ),
  )
  footer.append(priceBlock, actions)
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

function priceLabel(price: number): string {
  return price === 0 ? 'Free' : `$${price}`
}
