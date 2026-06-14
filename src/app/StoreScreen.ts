import type { EquipmentItem } from '../equipment/equipmentTypes'
import type { SaveGame } from '../save/saveTypes'
import {
  createSpincoreButton,
  createSpincoreEquipmentCard,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
} from '../ui'

type StoreFilter = 'all' | EquipmentItem['type']

export function createStoreScreen(options: {
  save: SaveGame
  catalog: EquipmentItem[]
  onBack: () => void
  onBuy: (item: EquipmentItem) => void
  onEquip: (item: EquipmentItem) => void
}): HTMLElement {
  const { root, body, header } = createSpincoreScreenFrame({
    eyebrow: 'EQUIPMENT DEPOT / STARTER STOCK',
    title: 'Stick Store',
    subtitle:
      'Buy a stick once, equip it freely, and take its modifiers into the next match.',
  })
  const balance = document.createElement('div')
  balance.className = 'store-header-balance'
  balance.append(
    createSpincoreMetric('Available Funds', `$${options.save.wallet.money}`, true),
  )
  header.appendChild(balance)

  const inventoryPanel = createSpincorePanel({
    eyebrow: 'INVENTORY',
    title: 'Equipment',
    copy: 'Buy once, then swap owned gear freely.',
  })
  const filters = document.createElement('div')
  filters.className = 'store-filter-tabs'
  const grid = document.createElement('div')
  grid.className = 'store-grid'
  let activeFilter: StoreFilter = 'all'
  const filterOptions: Array<[StoreFilter, string]> = [
    ['all', 'All Gear'],
    ['stick', 'Sticks'],
    ['shield', 'Shields'],
    ['shoes', 'Shoes'],
  ]

  const renderGrid = (): void => {
    const visibleItems = options.catalog.filter(
      (item) => activeFilter === 'all' || item.type === activeFilter,
    )
    grid.replaceChildren(
      ...visibleItems.map((item) =>
        createSpincoreEquipmentCard({
          item,
          save: options.save,
          onBuy: () => options.onBuy(item),
          onEquip: () => options.onEquip(item),
        }),
      ),
    )

    for (const button of filters.querySelectorAll('button')) {
      button.classList.toggle(
        'is-active',
        button.dataset.filter === activeFilter,
      )
    }
  }

  for (const [filter, label] of filterOptions) {
    const button = createSpincoreButton(label, () => {
      activeFilter = filter
      renderGrid()
    }, {
      tone: 'quiet',
      compact: true,
    })
    button.dataset.filter = filter
    filters.appendChild(button)
  }

  renderGrid()
  inventoryPanel.content.append(filters, grid)
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
  )
  body.append(inventoryPanel.panel, actions)
  return root
}
