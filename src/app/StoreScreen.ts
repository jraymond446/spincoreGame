import type {
  EquipmentItem,
  EquipmentShop,
} from '../equipment/equipmentTypes'
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
  shops: EquipmentShop[]
  onBack: () => void
  onBuy: (item: EquipmentItem) => void
  onEquip: (item: EquipmentItem) => void
}): HTMLElement {
  const { root, body, header } = createSpincoreScreenFrame({
    eyebrow: 'EQUIPMENT DEPOT / PROTOTYPE LOOT PASS',
    title: 'League Shops',
    subtitle:
      'All storefronts are open for testing. Later, shops unlock as you climb leagues.',
  })
  const balance = document.createElement('div')
  balance.className = 'store-header-balance'
  balance.append(
    createSpincoreMetric('Available Funds', `$${options.save.wallet.money}`, true),
  )
  header.appendChild(balance)

  const filters = document.createElement('div')
  filters.className = 'store-filter-tabs'
  let activeFilter: StoreFilter = 'all'
  const filterOptions: Array<[StoreFilter, string]> = [
    ['all', 'All Gear'],
    ['stick', 'Sticks'],
    ['shield', 'Shields'],
    ['shoes', 'Shoes'],
    ['armor', 'Armor'],
  ]

  const shopStack = document.createElement('section')
  shopStack.className = 'store-shop-stack'

  const renderShops = (): void => {
    shopStack.replaceChildren()

    for (const shop of options.shops) {
      const items = options.catalog.filter(
        (item) =>
          item.shopId === shop.id &&
          (activeFilter === 'all' || item.type === activeFilter),
      )

      if (items.length === 0) {
        continue
      }

      const panel = createSpincorePanel({
        eyebrow: shop.tierLabel,
        title: shop.name,
        copy: shop.description,
        tone: shop.id === 'triumph_vault' ? 'featured' : undefined,
      })
      const note = document.createElement('p')
      note.className = 'store-shop-note'
      note.textContent = shop.prototypeAvailable
        ? 'Prototype: available now.'
        : 'Locked until this league is reached.'
      const grid = document.createElement('div')
      grid.className = 'store-grid'
      grid.replaceChildren(
        ...items.map((item) =>
          createSpincoreEquipmentCard({
            item,
            save: options.save,
            onBuy: () => options.onBuy(item),
            onEquip: () => options.onEquip(item),
          }),
        ),
      )
      panel.content.append(note, grid)
      shopStack.appendChild(panel.panel)
    }

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
      renderShops()
    }, {
      tone: 'quiet',
      compact: true,
    })
    button.dataset.filter = filter
    filters.appendChild(button)
  }

  renderShops()
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
  )
  body.append(filters, shopStack, actions)
  return root
}
