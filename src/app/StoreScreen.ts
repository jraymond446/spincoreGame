import type { EquipmentItem } from '../equipment/equipmentTypes'
import type { SaveGame } from '../save/saveTypes'
import {
  createButton,
  createMetric,
  createScreenFrame,
  titleCase,
} from './ui'

export function createStoreScreen(options: {
  save: SaveGame
  catalog: EquipmentItem[]
  onBack: () => void
  onBuy: (item: EquipmentItem) => void
  onEquip: (item: EquipmentItem) => void
}): HTMLElement {
  const { root, body } = createScreenFrame({
    eyebrow: 'EQUIPMENT DEPOT',
    title: 'Circuit Store',
    subtitle:
      'Starter inventory is live. Equipment modifiers already feed your exhibition attributes.',
  })
  const balance = document.createElement('section')
  balance.className = 'store-balance'
  balance.append(
    createMetric('Available Funds', `$${options.save.wallet.money}`, true),
  )
  const grid = document.createElement('div')
  grid.className = 'store-grid'

  for (const item of options.catalog) {
    const card = document.createElement('article')
    card.className = `store-item is-${item.rarity}`
    const meta = document.createElement('div')
    meta.className = 'store-item-meta'
    const type = document.createElement('span')
    type.textContent = titleCase(item.type)
    const rarity = document.createElement('span')
    rarity.textContent = titleCase(item.rarity)
    meta.append(type, rarity)
    const name = document.createElement('h2')
    name.textContent = item.name
    const description = document.createElement('p')
    description.textContent = item.description
    const modifiers = document.createElement('p')
    modifiers.className = 'store-modifiers'
    const modifierText = Object.entries(item.modifiers)
      .map(([key, value]) => `+${value} ${titleCase(key)}`)
      .join(' · ')
    modifiers.textContent = modifierText || 'Standard issue'
    const owned = options.save.equipment.inventory.includes(item.id)
    const equipped = Object.values(options.save.equipment.equipped).includes(
      item.id,
    )
    const footer = document.createElement('div')
    footer.className = 'store-item-footer'
    const price = document.createElement('strong')
    price.textContent = item.price === 0 ? 'OWNED' : `$${item.price}`
    const action = owned
      ? createButton(
          equipped ? 'Equipped' : 'Equip',
          () => options.onEquip(item),
          {
            tone: equipped ? 'quiet' : 'secondary',
            disabled: equipped,
          },
        )
      : createButton('Buy', () => options.onBuy(item), {
          tone: 'primary',
          disabled: options.save.wallet.money < item.price,
        })
    action.setAttribute(
      'aria-label',
      owned
        ? equipped
          ? `${item.name} equipped`
          : `Equip ${item.name}`
        : `Buy ${item.name}`,
    )
    footer.append(price, action)
    card.append(meta, name, description, modifiers, footer)
    grid.appendChild(card)
  }

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(createButton('Back', options.onBack, { tone: 'quiet' }))
  body.append(balance, grid, actions)
  return root
}
