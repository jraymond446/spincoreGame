import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import { getStickType } from '../equipment/stickTypes'
import { xpToNextLevel } from '../save/progression'
import type {
  LeagueStatLine,
  PlayerAttributeKey,
  PlayerStatLine,
  SaveGame,
  SeasonStats,
} from '../save/saveTypes'
import {
  playerAttributeMax,
  playerAttributeUltraMax,
  playerAttributeKeys,
} from '../save/saveTypes'
import {
  createSpincoreAttributeRow,
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincorePlayerPreview,
  createSpincoreScreenFrame,
  createSpincoreStickCard,
  titleCase,
} from '../ui'

type StatsTab = 'season' | 'career' | 'league'

export function createPlayerProfileScreen(options: {
  save: SaveGame
  onBack: () => void
  onPlay: () => void
  onStore: () => void
  onSpendPoint: (key: PlayerAttributeKey) => void
}): HTMLElement {
  const { save } = options
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'PLAYER PROFILE',
    title: save.player.name,
    subtitle:
      `#${save.player.jerseyNumber} / ` +
      `${titleCase(save.player.archetype)} / ` +
      `${titleCase(save.player.handedness)} handed`,
  })
  const profileGrid = document.createElement('section')
  profileGrid.className = 'player-profile-grid'
  const identityPanel = createSpincorePanel({
    eyebrow: 'PLAYER CARD',
    title: 'Circuit Identity',
    tone: 'featured',
  })
  identityPanel.panel.classList.add('player-profile-identity-panel')
  const preview = createSpincorePlayerPreview({
    name: save.player.name,
    jerseyNumber: save.player.jerseyNumber,
    handedness: save.player.handedness,
    archetype: save.player.archetype,
    cosmetics: save.player.cosmetics,
    selectedStickId: save.player.selectedStickId,
  })
  const summary = document.createElement('div')
  summary.className = 'player-profile-summary'
  summary.append(
    createSpincoreMetric('Level', save.progression.level, true),
    createSpincoreMetric('XP', save.progression.xp),
    createSpincoreMetric('Money', `$${save.wallet.money}`),
    createSpincoreMetric(
      'Record',
      `${save.league.record.wins}-${save.league.record.losses}`,
    ),
  )
  identityPanel.content.append(preview.element, summary)
  const xpTarget = xpToNextLevel(save.progression.level)
  const xpProgress = document.createElement('div')
  xpProgress.className = 'profile-xp-progress'
  const xpLabel = document.createElement('div')
  const xpTitle = document.createElement('strong')
  xpTitle.textContent = `Level ${save.progression.level} progress`
  const xpValue = document.createElement('span')
  xpValue.textContent = `${save.progression.xp} / ${xpTarget} XP`
  xpLabel.append(xpTitle, xpValue)
  const xpTrack = document.createElement('div')
  const xpFill = document.createElement('i')
  xpFill.style.width =
    `${Math.min(100, save.progression.xp / xpTarget * 100)}%`
  xpTrack.appendChild(xpFill)
  xpProgress.append(xpLabel, xpTrack)
  identityPanel.content.appendChild(xpProgress)

  const buildColumn = document.createElement('div')
  buildColumn.className = 'player-profile-build-column'
  const attributesPanel = createSpincorePanel({
    eyebrow: 'PLAYER RATINGS',
    title: 'Core Attributes',
    copy:
      save.progression.unspentAttributePoints > 0
        ? `${save.progression.unspentAttributePoints} points available.`
        : 'Earn attribute points by leveling up.',
  })
  const attributeList = document.createElement('div')
  attributeList.className = 'profile-attribute-list'
  const effective = getEffectivePlayerAttributes(save)

  for (const key of playerAttributeKeys) {
    attributeList.appendChild(
      createSpincoreAttributeRow({
        label: titleCase(key),
        base: save.player.attributes[key],
        effective: effective[key],
        canIncrease:
          save.progression.unspentAttributePoints > 0 &&
          save.player.attributes[key] < playerAttributeMax,
        max: playerAttributeUltraMax,
        onIncrease: () => options.onSpendPoint(key),
      }),
    )
  }

  attributesPanel.content.appendChild(attributeList)
  const stickPanel = createSpincorePanel({
    eyebrow: 'EQUIPMENT',
    title: 'Stick Attributes',
    copy: 'Stick modifiers are included in the effective ratings above.',
  })
  const stick = getStickType(
    save.equipment.equipped.stickId ?? save.player.selectedStickId,
  )
  stickPanel.content.appendChild(
    createSpincoreStickCard(stick, { detailed: true }),
  )
  stickPanel.actions.append(
    createSpincoreButton('Manage Equipment', options.onStore, {
      tone: 'secondary',
    }),
    createSpincoreBadge('STICK MODIFIERS ACTIVE', 'mint'),
  )
  buildColumn.append(attributesPanel.panel, stickPanel.panel)
  profileGrid.append(identityPanel.panel, buildColumn)

  const statsPanel = createSpincorePanel({
    eyebrow: 'PERFORMANCE',
    title: 'Player Statistics',
  })
  const tabBar = document.createElement('div')
  tabBar.className = 'profile-stats-tabs'
  const statsContent = document.createElement('div')
  statsContent.className = 'profile-stats-content'
  let activeTab: StatsTab = 'season'

  const renderStats = (): void => {
    for (const button of tabBar.querySelectorAll('button')) {
      button.classList.toggle(
        'is-active',
        button.dataset.tab === activeTab,
      )
    }

    if (activeTab === 'league') {
      statsContent.replaceChildren(
        createLeagueStats(save.leagueStats),
      )
      return
    }

    const stats =
      activeTab === 'season' ? save.seasonStats : save.stats
    statsContent.replaceChildren(createStatGrid(stats))
  }

  for (const [tab, label] of [
    ['season', 'Season Stats'],
    ['career', 'Career Stats'],
    ['league', 'League Stats'],
  ] as Array<[StatsTab, string]>) {
    const button = createSpincoreButton(label, () => {
      activeTab = tab
      renderStats()
    }, {
      tone: 'quiet',
      compact: true,
    })
    button.dataset.tab = tab
    tabBar.appendChild(button)
  }

  renderStats()
  statsPanel.content.append(tabBar, statsContent)
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
    createSpincoreButton('Play Exhibition', options.onPlay, {
      tone: 'primary',
    }),
  )
  body.append(profileGrid, statsPanel.panel, actions)
  return root
}

function createStatGrid(stats: PlayerStatLine | SeasonStats): HTMLElement {
  const grid = document.createElement('dl')
  grid.className = 'profile-stat-grid'
  const shotPercentage =
    stats.shots > 0 ? Math.round(stats.goals / stats.shots * 100) : 0
  const entries: Array<[string, string | number]> = [
    ['Matches', stats.matchesPlayed],
    ['Record', `${stats.wins}-${stats.losses}`],
    ['Goals', stats.goals],
    ['Assists', stats.assists],
    ['Shots', stats.shots],
    ['Shot %', `${shotPercentage}%`],
    ['Bank goals', stats.bankShotGoals],
    ['Saves', stats.saves],
    ['Steals', stats.steals],
    ['Turnovers', stats.turnovers],
    ['Hits taken', stats.hitsTaken],
    ['Slashes', stats.slashes],
    ['Gathers', stats.successfulGathers],
    ['Fumbles', stats.fumbles],
  ]

  for (const [label, value] of entries) {
    const item = document.createElement('div')
    const term = document.createElement('dt')
    term.textContent = label
    const description = document.createElement('dd')
    description.textContent = String(value)
    item.append(term, description)
    grid.appendChild(item)
  }

  return grid
}

function createLeagueStats(
  leagueStats: Record<string, LeagueStatLine>,
): HTMLElement {
  const grid = document.createElement('div')
  grid.className = 'profile-league-stats'
  const entries = Object.entries(leagueStats)

  if (entries.length === 0) {
    const empty = document.createElement('p')
    empty.textContent = 'No league stats recorded yet.'
    grid.appendChild(empty)
    return grid
  }

  for (const [id, stats] of entries) {
    const card = document.createElement('article')
    const heading = document.createElement('div')
    const title = document.createElement('strong')
    title.textContent = stats.leagueName
    heading.append(
      title,
      createSpincoreBadge(id.toUpperCase(), 'blue'),
    )
    const record = document.createElement('p')
    record.textContent =
      `${stats.matchesPlayed} matches / ${stats.wins}-${stats.losses} / ` +
      `${stats.goals} goals / ${stats.bankShotGoals} bank goals`
    const championships = createSpincoreBadge(
      `${stats.championships} CHAMPIONSHIPS`,
      stats.championships > 0 ? 'gold' : 'navy',
    )
    card.append(heading, record, championships)
    grid.appendChild(card)
  }

  return grid
}
