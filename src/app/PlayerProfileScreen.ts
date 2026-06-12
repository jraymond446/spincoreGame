import { equipmentCatalog } from '../equipment/equipmentCatalog'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type {
  PlayerAttributeKey,
  SaveGame,
} from '../save/saveTypes'
import { playerAttributeKeys } from '../save/saveTypes'
import {
  createPlayerIdentityCard,
  createSpincoreAttributeRow,
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  titleCase,
} from '../ui'

export function createPlayerProfileScreen(options: {
  save: SaveGame
  onBack: () => void
  onPlay: () => void
  onSpendPoint: (key: PlayerAttributeKey) => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'PLAYER PROFILE',
    title: options.save.player.name,
    subtitle:
      `#${options.save.player.jerseyNumber} / ` +
      `${titleCase(options.save.player.primaryRole)} / ` +
      `${titleCase(options.save.player.handedness)} handed`,
  })
  const identityLayout = document.createElement('section')
  identityLayout.className = 'profile-identity-layout'
  identityLayout.appendChild(
    createPlayerIdentityCard(options.save, { expanded: true }),
  )
  const summary = document.createElement('div')
  summary.className = 'profile-summary-grid'
  summary.append(
    createSpincoreMetric('Level', options.save.progression.level, true),
    createSpincoreMetric('XP', options.save.progression.xp),
    createSpincoreMetric('Money', `$${options.save.wallet.money}`),
    createSpincoreMetric(
      'Record',
      `${options.save.league.record.wins}-${options.save.league.record.losses}`,
    ),
    createSpincoreMetric('Matches', options.save.stats.matchesPlayed),
    createSpincoreMetric(
      'Open Points',
      options.save.progression.unspentAttributePoints,
      options.save.progression.unspentAttributePoints > 0,
    ),
  )
  identityLayout.appendChild(summary)

  const layout = document.createElement('div')
  layout.className = 'profile-layout'
  const attributesPanel = createSpincorePanel({
    eyebrow: 'BUILD',
    title: 'Attributes',
    copy:
      options.save.progression.unspentAttributePoints > 0
        ? 'Spend available points instantly.'
        : 'Level up to earn more attribute points.',
  })
  const attributeList = document.createElement('div')
  attributeList.className = 'profile-attribute-list'
  const effective = getEffectivePlayerAttributes(options.save)

  for (const key of playerAttributeKeys) {
    attributeList.appendChild(
      createSpincoreAttributeRow({
        label: titleCase(key),
        base: options.save.player.attributes[key],
        effective: effective[key],
        canIncrease:
          options.save.progression.unspentAttributePoints > 0 &&
          options.save.player.attributes[key] < 99,
        onIncrease: () => options.onSpendPoint(key),
      }),
    )
  }

  attributesPanel.content.appendChild(attributeList)
  const rightRail = document.createElement('div')
  rightRail.className = 'profile-right-rail'
  const loadoutPanel = createSpincorePanel({
    eyebrow: 'GEAR',
    title: 'Current Loadout',
  })
  const loadout = document.createElement('div')
  loadout.className = 'profile-loadout-list'

  for (const [slot, itemId] of Object.entries(
    options.save.equipment.equipped,
  )) {
    const row = document.createElement('div')
    const label = document.createElement('span')
    label.textContent = titleCase(slot.replace(/Id$/, ''))
    const item = equipmentCatalog.find((candidate) => candidate.id === itemId)
    row.append(
      label,
      createSpincoreBadge(item?.name ?? 'Empty', item ? 'mint' : 'navy'),
    )
    loadout.appendChild(row)
  }

  loadoutPanel.content.appendChild(loadout)
  const statsPanel = createSpincorePanel({
    eyebrow: 'CAREER',
    title: 'Circuit Ledger',
  })
  const stats = document.createElement('dl')
  stats.className = 'profile-stats-list'
  const statEntries: Array<[string, number]> = [
    ['Goals', options.save.stats.goals],
    ['Bank goals', options.save.stats.bankShotGoals],
    ['Assists', options.save.stats.assists],
    ['Shots', options.save.stats.shots],
    ['Steals', options.save.stats.steals],
    ['Saves', options.save.stats.saves],
    ['Turnovers', options.save.stats.turnovers],
  ]

  for (const [labelText, value] of statEntries) {
    const term = document.createElement('dt')
    term.textContent = labelText
    const description = document.createElement('dd')
    description.textContent = String(value)
    stats.append(term, description)
  }

  statsPanel.content.appendChild(stats)
  rightRail.append(loadoutPanel.panel, statsPanel.panel)
  layout.append(attributesPanel.panel, rightRail)
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
    createSpincoreButton('Play Exhibition', options.onPlay, {
      tone: 'primary',
    }),
  )
  body.append(identityLayout, layout, actions)
  return root
}
