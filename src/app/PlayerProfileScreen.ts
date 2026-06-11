import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type {
  PlayerAttributeKey,
  SaveGame,
} from '../save/saveTypes'
import { playerAttributeKeys } from '../save/saveTypes'
import {
  createButton,
  createMetric,
  createScreenFrame,
  titleCase,
} from './ui'

export function createPlayerProfileScreen(options: {
  save: SaveGame
  onBack: () => void
  onPlay: () => void
  onSpendPoint: (key: PlayerAttributeKey) => void
}): HTMLElement {
  const { root, body } = createScreenFrame({
    eyebrow: 'PLAYER PROFILE',
    title: `#${options.save.player.jerseyNumber} ${options.save.player.name}`,
    subtitle:
      `${titleCase(options.save.player.primaryRole)} · ${titleCase(options.save.player.handedness)} handed`,
  })
  const summary = document.createElement('section')
  summary.className = 'profile-summary-grid'
  summary.append(
    createMetric('Level', options.save.progression.level, true),
    createMetric('XP', options.save.progression.xp),
    createMetric('Money', `$${options.save.wallet.money}`),
    createMetric(
      'Record',
      `${options.save.league.record.wins}-${options.save.league.record.losses}`,
    ),
    createMetric('Matches', options.save.stats.matchesPlayed),
    createMetric(
      'Attribute Points',
      options.save.progression.unspentAttributePoints,
      options.save.progression.unspentAttributePoints > 0,
    ),
  )
  const layout = document.createElement('div')
  layout.className = 'profile-layout'
  const attributesPanel = document.createElement('section')
  attributesPanel.className = 'app-panel'
  const attributesHeading = document.createElement('div')
  attributesHeading.className = 'panel-heading-row'
  const heading = document.createElement('h2')
  heading.textContent = 'Attributes'
  const note = document.createElement('span')
  note.textContent =
    options.save.progression.unspentAttributePoints > 0
      ? 'Spend points instantly'
      : 'Earn points by leveling up'
  attributesHeading.append(heading, note)
  const attributeList = document.createElement('div')
  attributeList.className = 'profile-attribute-list'
  const effective = getEffectivePlayerAttributes(options.save)

  for (const key of playerAttributeKeys) {
    const row = document.createElement('div')
    row.className = 'profile-attribute-row'
    const label = document.createElement('span')
    label.textContent = titleCase(key)
    const value = document.createElement('strong')
    const base = options.save.player.attributes[key]
    const bonus = effective[key] - base
    value.textContent = bonus > 0 ? `${base} +${bonus}` : String(base)
    const meter = document.createElement('div')
    meter.className = 'attribute-meter'
    const fill = document.createElement('i')
    fill.style.width = `${effective[key]}%`
    meter.appendChild(fill)
    const add = createButton('+', () => options.onSpendPoint(key), {
      tone: 'primary',
      disabled:
        options.save.progression.unspentAttributePoints <= 0 ||
        base >= 99,
    })
    add.setAttribute('aria-label', `Increase ${titleCase(key)}`)
    add.classList.add('attribute-add-button')
    row.append(label, value, meter, add)
    attributeList.appendChild(row)
  }

  attributesPanel.append(attributesHeading, attributeList)
  const statsPanel = document.createElement('section')
  statsPanel.className = 'app-panel'
  const statsHeading = document.createElement('h2')
  statsHeading.textContent = 'Career Ledger'
  const stats = document.createElement('dl')
  stats.className = 'profile-stats-list'
  const statEntries: Array<[string, number]> = [
    ['Goals', options.save.stats.goals],
    ['Assists', options.save.stats.assists],
    ['Shots', options.save.stats.shots],
    ['Bank goals', options.save.stats.bankShotGoals],
    ['Steals', options.save.stats.steals],
    ['Saves', options.save.stats.saves],
    ['Turnovers', options.save.stats.turnovers],
  ]

  for (const [label, value] of statEntries) {
    const term = document.createElement('dt')
    term.textContent = label
    const description = document.createElement('dd')
    description.textContent = String(value)
    stats.append(term, description)
  }

  statsPanel.append(statsHeading, stats)
  layout.append(attributesPanel, statsPanel)
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createButton('Back', options.onBack, { tone: 'quiet' }),
    createButton('Play Exhibition', options.onPlay, {
      tone: 'primary',
    }),
  )
  body.append(summary, layout, actions)
  return root
}
