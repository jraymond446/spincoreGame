import {
  getEquipmentItem,
} from '../equipment/equipmentCatalog'
import {
  getInventoryItemCount,
  getUniqueInventoryItemIds,
} from '../equipment/equipmentInventory'
import type { EquipmentItem } from '../equipment/equipmentTypes'
import {
  applyLoadoutModifiersToCreatedAttributes,
  createNeutralRosterAttributes,
  getLoadoutAttributeModifiers,
  getLoadoutAssignmentCount,
  getTeamRosterLoadout,
  getTeamRosterSlotProfile,
} from '../franchise/teamRoster'
import type {
  EquipmentSlot,
  SaveGame,
  TeamRosterSlotId,
} from '../save/saveTypes'
import {
  equipmentSlotKeys,
  playerAttributeKeys,
  playerEffectiveAttributeMax,
} from '../save/saveTypes'
import {
  characterPortraitOptionsFromAppearance,
  createCharacterPortrait,
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  createSpincoreStatBar,
  titleCase,
} from '../ui'

export function createTeamLoadoutScreen(options: {
  save: SaveGame
  slotId: TeamRosterSlotId
  origin?: 'team' | 'playerRoom'
  onBack: () => void
  onStore: () => void
  onEquip: (slotId: TeamRosterSlotId, item: EquipmentItem) => void
  onClear: (slotId: TeamRosterSlotId, slot: EquipmentSlot) => void
}): HTMLElement {
  const fromPlayerRoom = options.origin === 'playerRoom'
  const profile = getTeamRosterSlotProfile(options.save, options.slotId)
  const equipment = getTeamRosterLoadout(options.save, options.slotId)
  const { root, body, header } = createSpincoreScreenFrame({
    eyebrow: fromPlayerRoom
      ? 'PLAYER ROOM / GEAR CHEST'
      : 'TEAM HQ / LOCKER ASSIGNMENT',
    title: `${profile.name} Loadout`,
    subtitle:
      fromPlayerRoom
        ? 'Build your match loadout from every owned item in the team locker.'
        : profile.isCreatedPlayer
          ? 'Your player still belongs in the Player Room, but Team HQ can jump straight to their match gear.'
          : 'Assign owned locker gear to AI teammates so the whole roster can start reflecting the build.',
  })
  const assignedItems = equipmentSlotKeys.filter((slot) => equipment[slot])
  const headerMetrics = document.createElement('div')
  headerMetrics.className = 'spincore-header-metrics'
  headerMetrics.append(
    createSpincoreMetric('Role', profile.roleLabel, true),
    createSpincoreMetric('Gear Slots', `${assignedItems.length}/4`),
    createSpincoreMetric(
      'Owned Copies',
      options.save.equipment.inventory.length,
    ),
  )
  header.appendChild(headerMetrics)

  const layout = document.createElement('section')
  layout.className = 'team-loadout-layout'
  layout.append(
    createLoadoutOverviewPanel(options.save, options.slotId).panel,
    createEquippedPanel(options.save, options.slotId, options.onClear).panel,
    createLockerPanel(options).panel,
  )

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton(
      fromPlayerRoom ? 'Back to Player Room' : 'Back to Team HQ',
      options.onBack,
      {
        tone: 'quiet',
      },
    ),
    createSpincoreButton('Visit Shop Row', options.onStore, {
      tone: 'secondary',
    }),
  )
  body.append(layout, actions)
  return root
}

function createLoadoutOverviewPanel(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): ReturnType<typeof createSpincorePanel> {
  const profile = getTeamRosterSlotProfile(save, slotId)
  const equipment = getTeamRosterLoadout(save, slotId)
  const baseAttributes = profile.isCreatedPlayer
    ? save.player.attributes
    : createNeutralRosterAttributes()
  const totalAttributes = applyLoadoutModifiersToCreatedAttributes(
    baseAttributes,
    equipment,
  )
  const modifiers = getLoadoutAttributeModifiers(equipment)
  const panel = createSpincorePanel({
    eyebrow: profile.isCreatedPlayer ? 'PLAYER ROOM LINK' : 'AI TEAMMATE',
    title: profile.name,
    copy:
      profile.meta +
      (profile.isCreatedPlayer
        ? ' This is the same loadout shown on your profile.'
        : ' House players use neutral baseline stats until real signings arrive.'),
    tone: profile.isCreatedPlayer ? 'featured' : 'plain',
  })
  const card = document.createElement('div')
  card.className = 'team-loadout-player-card'
  const crest = profile.appearance
    ? createCharacterPortrait({
        ...characterPortraitOptionsFromAppearance(profile.appearance),
        animated: false,
        selected: false,
        size: 'sm',
        className: 'team-loadout-portrait',
        label: `${profile.name} portrait`,
      }).element
    : document.createElement('div')

  if (!profile.appearance) {
    crest.textContent = profile.isCreatedPlayer
      ? String(save.player.jerseyNumber)
      : slotInitials(profile.roleLabel)
  }
  const copy = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = profile.name
  const meta = document.createElement('span')
  meta.textContent = profile.meta
  const badges = document.createElement('div')
  badges.append(
    createSpincoreBadge(profile.roleLabel, 'blue'),
    createSpincoreBadge(
      profile.isCreatedPlayer ? 'Created Player' : 'House Contract',
      profile.isCreatedPlayer ? 'gold' : 'mint',
    ),
  )
  copy.append(name, meta, badges)
  card.append(crest, copy)

  const stats = document.createElement('div')
  stats.className = 'team-loadout-stat-list'

  for (const key of playerAttributeKeys) {
    const base = baseAttributes[key]
    const item = totalAttributes[key] - base
    stats.appendChild(
      createSpincoreStatBar({
        label: titleCase(key),
        value: totalAttributes[key],
        max: playerEffectiveAttributeMax,
        segments: {
          base,
          item,
        },
        detailSegments: {
          base,
          item,
          total: totalAttributes[key],
        },
      }),
    )
  }

  const note = document.createElement('p')
  note.className = 'team-loadout-note'
  note.textContent =
    Object.keys(modifiers).length === 0
      ? 'No locker boosts assigned yet.'
      : 'Blue is player/house baseline. Green is the assigned item boost.'
  panel.content.append(card, stats, note)
  return panel
}

function createEquippedPanel(
  save: SaveGame,
  slotId: TeamRosterSlotId,
  onClear: (slotId: TeamRosterSlotId, slot: EquipmentSlot) => void,
): ReturnType<typeof createSpincorePanel> {
  const equipment = getTeamRosterLoadout(save, slotId)
  const profile = getTeamRosterSlotProfile(save, slotId)
  const panel = createSpincorePanel({
    eyebrow: 'CURRENT BUILD',
    title: 'Equipped Gear',
    copy:
      'Each slot pulls from the shared team locker. One item can only be assigned to one roster slot at a time.',
  })
  const list = document.createElement('div')
  list.className = 'team-loadout-equipped-list'

  for (const slot of equipmentSlotKeys) {
    const item = getEquipmentItem(equipment[slot])
    const row = document.createElement('article')
    row.className = 'team-loadout-equipped-row'
    const copy = document.createElement('div')
    const label = document.createElement('strong')
    label.textContent = slotLabel(slot)
    const meta = document.createElement('span')
    meta.textContent = item
      ? `${item.name} / ${titleCase(item.rarity)}`
      : 'Empty'
    copy.append(label, meta)
    const badges = document.createElement('div')

    if (item) {
      badges.append(
        createSpincoreBadge(titleCase(item.type), 'blue'),
        createSpincoreBadge(`${item.statBudget} pts`, 'mint'),
      )
    } else {
      badges.appendChild(createSpincoreBadge('Open', 'navy'))
    }

    const clearDisabled =
      !item || (profile.isCreatedPlayer && slot === 'stickId')
    const clear = createSpincoreButton(
      clearDisabled && slot === 'stickId' && profile.isCreatedPlayer
        ? 'Required'
        : 'Clear',
      () => onClear(slotId, slot),
      {
        tone: 'quiet',
        compact: true,
        disabled: clearDisabled,
      },
    )
    row.append(copy, badges, clear)
    list.appendChild(row)
  }

  panel.content.appendChild(list)
  return panel
}

function createLockerPanel(options: {
  save: SaveGame
  slotId: TeamRosterSlotId
  onEquip: (slotId: TeamRosterSlotId, item: EquipmentItem) => void
}): ReturnType<typeof createSpincorePanel> {
  const profile = getTeamRosterSlotProfile(options.save, options.slotId)
  const equipment = getTeamRosterLoadout(options.save, options.slotId)
  const panel = createSpincorePanel({
    eyebrow: 'TEAM LOCKER',
    title: 'Owned Items',
    copy:
      'Each assigned roster slot consumes one owned copy. Extra copies stay ready in the locker.',
  })
  const inventory = getUniqueInventoryItemIds(options.save.equipment.inventory)
    .map((id) => getEquipmentItem(id))
    .filter((item): item is EquipmentItem => item !== null)
    .sort(sortLockerItems)
  const list = document.createElement('div')
  list.className = 'team-loadout-locker-list'

  if (inventory.length === 0) {
    const empty = document.createElement('p')
    empty.textContent = 'No gear owned yet.'
    list.appendChild(empty)
  } else {
    for (const item of inventory) {
      list.appendChild(
        createLockerRow({
          item,
          save: options.save,
          selectedSlotId: options.slotId,
          equippedHere: equipment[`${item.type}Id` as EquipmentSlot] === item.id,
          onEquip: () => options.onEquip(options.slotId, item),
        }),
      )
    }
  }

  const note = document.createElement('p')
  note.className = 'team-loadout-note'
  note.textContent =
    profile.isCreatedPlayer
      ? 'This path updates the same equipment your Player Room uses.'
      : 'AI teammate gear now feeds the match roster, including stick shape and stat boosts.'
  panel.content.append(list, note)
  return panel
}

function createLockerRow(options: {
  item: EquipmentItem
  save: SaveGame
  selectedSlotId: TeamRosterSlotId
  equippedHere: boolean
  onEquip: () => void
}): HTMLElement {
  const ownedCount = getInventoryItemCount(
    options.save.equipment.inventory,
    options.item.id,
  )
  const assignedCount = getLoadoutAssignmentCount(
    options.save,
    options.item.id,
  )
  const assignedElsewhere = getLoadoutAssignmentCount(
    options.save,
    options.item.id,
    { excludeSlotId: options.selectedSlotId },
  )
  const availableCopies = Math.max(0, ownedCount - assignedElsewhere)
  const disabled = options.equippedHere || availableCopies <= 0
  const row = document.createElement('article')
  row.className = `team-gear-row is-${options.item.rarity}`
  const icon = document.createElement('div')
  icon.className =
    `spincore-equipment-icon is-${options.item.type} is-${options.item.rarity}`
  icon.textContent = iconLabel(options.item.type)
  const copy = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = options.item.name
  const meta = document.createElement('span')
  meta.textContent = options.equippedHere
    ? `Equipped here / ${assignedCount}/${ownedCount} assigned`
    : availableCopies <= 0
      ? `All ${ownedCount} assigned`
      : `Own ${ownedCount}x / ${assignedCount} assigned`
  copy.append(name, meta)
  const action = createSpincoreButton(
    options.equippedHere ? 'Equipped' : availableCopies <= 0 ? 'Assigned' : 'Equip',
    options.onEquip,
    {
      tone: options.equippedHere || availableCopies <= 0 ? 'quiet' : 'secondary',
      compact: true,
      disabled,
    },
  )
  row.append(icon, copy, action)
  return row
}

function sortLockerItems(
  left: EquipmentItem,
  right: EquipmentItem,
): number {
  const typeOrder = typeSort(left.type) - typeSort(right.type)

  if (typeOrder !== 0) {
    return typeOrder
  }

  return right.statBudget - left.statBudget || left.name.localeCompare(right.name)
}

function typeSort(type: EquipmentItem['type']): number {
  switch (type) {
    case 'stick':
      return 0
    case 'shield':
      return 1
    case 'shoes':
      return 2
    case 'armor':
      return 3
  }
}

function slotLabel(slot: EquipmentSlot): string {
  switch (slot) {
    case 'stickId':
      return 'Stick'
    case 'shieldId':
      return 'Keeper Shield'
    case 'shoesId':
      return 'Shoes'
    case 'armorId':
      return 'Armor'
  }
}

function iconLabel(type: EquipmentItem['type']): string {
  switch (type) {
    case 'stick':
      return 'STK'
    case 'shield':
      return 'SHD'
    case 'shoes':
      return 'SPD'
    case 'armor':
      return 'ARM'
  }
}

function slotInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
