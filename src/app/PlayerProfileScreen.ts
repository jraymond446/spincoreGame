import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type { TeamRosterReadiness } from '../franchise/teamRoster'
import { characterAssetManifest } from '../assets/characterAssetManifest.ts'
import { generateRandomAppearance } from '../player/generateRandomAppearance.ts'
import {
  hairColorOptions,
  normalizeAppearanceColor,
  skinColorOptions,
  uniformAccentColorOptions,
  uniformPrimaryColorOptions,
  type AppearanceColorOption,
} from '../player/playerAppearancePalettes.ts'
import {
  createDefaultPlayerAppearance,
  type HairAssetId,
  type PlayerAppearance,
} from '../player/playerAppearanceTypes.ts'
import { xpToNextLevel } from '../save/progression'
import type {
  LeagueStatLine,
  PlayerAttributeKey,
  PlayerStatLine,
  SaveGame,
  SeasonStats,
} from '../save/saveTypes'
import {
  playerEffectiveAttributeMax,
  playerAttributeMax,
  playerAttributeKeys,
} from '../save/saveTypes'
import {
  createSpincoreAttributeRow,
  createSpincoreBadge,
  createSpincoreButton,
  characterPortraitOptionsFromAppearance,
  createCharacterPortrait,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  titleCase,
} from '../ui'

type StatsTab = 'season' | 'career' | 'league'

export type PlayerProfileSection =
  | 'appearance'
  | 'attributes'
  | 'stats'

export function createPlayerProfileScreen(options: {
  save: SaveGame
  section: PlayerProfileSection
  matchReadiness: TeamRosterReadiness
  onBack: () => void
  onPlay: () => void
  onTeam: () => void
  onSpendPoint: (key: PlayerAttributeKey) => void
  onAppearanceChange: (appearance: PlayerAppearance) => void
}): HTMLElement {
  const { save } = options
  const sectionDetails: Record<
    PlayerProfileSection,
    { eyebrow: string; title: string }
  > = {
    appearance: { eyebrow: 'CLOSET', title: 'Player Customization' },
    attributes: { eyebrow: 'WEIGHT RACK', title: 'Player Attributes' },
    stats: { eyebrow: 'LAPTOP', title: 'Player Statistics' },
  }
  const section = sectionDetails[options.section]
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: section.eyebrow,
    title: section.title,
    subtitle:
      `${save.player.name} / #${save.player.jerseyNumber} / ` +
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
  let appearance = structuredClone(save.player.appearance)
  const portrait = createCharacterPortrait({
    ...characterPortraitOptionsFromAppearance(appearance),
    animated: true,
    selected: true,
    size: 'hero',
    showFrame: false,
    label: `${save.player.name} portrait`,
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
  const portraitRow = document.createElement('div')
  portraitRow.className = 'player-profile-portrait-row'
  portraitRow.appendChild(portrait.element)
  const appearanceLab = createAppearanceLab({
    initialAppearance: appearance,
    playerName: save.player.name,
    portrait,
    onChange: (nextAppearance) => {
      appearance = nextAppearance
      options.onAppearanceChange(nextAppearance)
    },
  })
  identityPanel.content.append(portraitRow, appearanceLab, summary)
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

  const effective = getEffectivePlayerAttributes(save)
  const itemBonusTotal = playerAttributeKeys.reduce(
    (total, key) => total + Math.max(0, effective[key] - save.player.attributes[key]),
    0,
  )
  const attributesPanel = createSpincorePanel({
    eyebrow: 'TOTAL RATINGS',
    title: 'Player + Item Attributes',
    copy:
      save.progression.unspentAttributePoints > 0
        ? `${save.progression.unspentAttributePoints} points available. ` +
          'Blue is your player build; green is equipped item power.'
        : 'Blue is your player build; green is equipped item power.',
  })
  const attributeList = document.createElement('div')
  attributeList.className = 'profile-attribute-list'
  const attributeLegend = createAttributeLegend(itemBonusTotal)

  for (const key of playerAttributeKeys) {
    attributeList.appendChild(
      createSpincoreAttributeRow({
        label: titleCase(key),
        base: save.player.attributes[key],
        effective: effective[key],
        canIncrease:
          save.progression.unspentAttributePoints > 0 &&
          save.player.attributes[key] < playerAttributeMax,
        max: playerEffectiveAttributeMax,
        onIncrease: () => options.onSpendPoint(key),
      }),
    )
  }

  attributesPanel.content.append(attributeLegend, attributeList)
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
      tone: options.matchReadiness.ready ? 'primary' : 'quiet',
      disabled: !options.matchReadiness.ready,
    }),
  )

  if (!options.matchReadiness.ready) {
    actions.append(
      createSpincoreButton('Finish Roster', options.onTeam, {
        tone: 'secondary',
      }),
      createSpincoreBadge(
        `${options.matchReadiness.activePlayerCount}/${options.matchReadiness.requiredActivePlayerCount} starters`,
        'rose',
      ),
    )
  }

  if (options.section === 'appearance') {
    profileGrid.classList.add('is-single-section')
    profileGrid.appendChild(identityPanel.panel)
    body.appendChild(profileGrid)
  } else if (options.section === 'attributes') {
    body.appendChild(attributesPanel.panel)
  } else {
    body.appendChild(statsPanel.panel)
  }

  body.appendChild(actions)
  return root
}

function createAppearanceLab(options: {
  initialAppearance: PlayerAppearance
  playerName: string
  portrait: ReturnType<typeof createCharacterPortrait>
  onChange: (appearance: PlayerAppearance) => void
}): HTMLElement {
  let current = structuredClone(options.initialAppearance)
  let showAlignmentOverlay = false
  const lab = document.createElement('section')
  lab.className = 'profile-appearance-lab'
  const header = document.createElement('div')
  header.className = 'profile-appearance-lab-header'
  const heading = document.createElement('div')
  const eyebrow = document.createElement('span')
  eyebrow.textContent = 'MENU PORTRAIT PROTOTYPE'
  const title = document.createElement('strong')
  title.textContent = 'Character Lab'
  const copy = document.createElement('p')
  copy.textContent =
    'Hair, skin, and both uniform channels recolor live while preserving pixel shading and linework.'
  heading.append(eyebrow, title, copy)
  const headerBadges = document.createElement('div')
  headerBadges.append(
    createSpincoreBadge('HAIR LIVE', 'mint'),
    createSpincoreBadge('BODY COLORS LIVE', 'mint'),
  )
  header.append(heading, headerBadges)

  const hairSection = document.createElement('div')
  hairSection.className = 'profile-appearance-group is-hair'
  const hairTitle = document.createElement('strong')
  hairTitle.textContent = 'Hairstyle'
  const hairGrid = document.createElement('div')
  hairGrid.className = 'profile-hairstyle-grid'
  const thumbnailEntries = characterAssetManifest.hair.map((definition) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'profile-hairstyle-option'
    button.setAttribute('aria-label', `Use ${definition.label}`)
    const thumbnail = createCharacterPortrait({
      ...characterPortraitOptionsFromAppearance({
        ...current,
        hairId: definition.id,
      }),
      animated: false,
      selected: false,
      size: 'md',
      showFrame: false,
      label: definition.label,
    })
    const label = document.createElement('span')
    label.textContent = definition.label
    button.append(thumbnail.element, label)
    button.addEventListener('click', () => {
      commit({ ...current, hairId: definition.id })
    })
    hairGrid.appendChild(button)
    return { button, definition, thumbnail }
  })
  hairSection.append(hairTitle, hairGrid)

  const controls = document.createElement('div')
  controls.className = 'profile-appearance-controls'
  const hairColors = createAppearanceColorControl({
    label: 'Hair Color',
    options: hairColorOptions,
    pending: false,
    onColor: (hairColor) => commit({ ...current, hairColor }),
  })
  const skinColors = createAppearanceColorControl({
    label: 'Skin Tone',
    options: skinColorOptions,
    pending: false,
    onColor: (skinColor) => commit({ ...current, skinColor }),
  })
  const primaryColors = createAppearanceColorControl({
    label: 'Uniform Primary',
    options: uniformPrimaryColorOptions,
    pending: false,
    onColor: (uniformPrimaryColor) =>
      commit({ ...current, uniformPrimaryColor }),
  })
  const accentColors = createAppearanceColorControl({
    label: 'Uniform Accent',
    options: uniformAccentColorOptions,
    pending: false,
    onColor: (uniformAccentColor) =>
      commit({ ...current, uniformAccentColor }),
  })
  controls.append(
    hairColors.element,
    skinColors.element,
    primaryColors.element,
    accentColors.element,
  )

  const actions = document.createElement('div')
  actions.className = 'profile-appearance-actions'
  const randomize = createSpincoreButton('Randomize Appearance', () => {
    commit(generateRandomAppearance({ presentation: current.presentation }))
  }, { tone: 'primary', compact: true })
  const reset = createSpincoreButton('Reset Appearance', () => {
    commit(createDefaultPlayerAppearance())
  }, { tone: 'quiet', compact: true })
  const overlay = createSpincoreButton('Show Alignment', () => {
    showAlignmentOverlay = !showAlignmentOverlay
    refresh()
  }, { tone: 'secondary', compact: true })
  overlay.classList.add('profile-alignment-toggle')
  actions.append(randomize, reset, overlay)
  lab.append(header, hairSection, controls, actions)

  function commit(nextAppearance: PlayerAppearance): void {
    current = structuredClone(nextAppearance)
    refresh()
    options.onChange(structuredClone(current))
  }

  function refresh(): void {
    options.portrait.update({
      ...characterPortraitOptionsFromAppearance(current),
      animated: true,
      selected: true,
      size: 'hero',
      showFrame: false,
      showAlignmentOverlay,
      label: `${options.playerName} portrait`,
    })

    for (const entry of thumbnailEntries) {
      const selected = entry.definition.id === current.hairId
      entry.button.classList.toggle('is-selected', selected)
      entry.button.setAttribute('aria-pressed', String(selected))
      entry.thumbnail.update({
        ...characterPortraitOptionsFromAppearance({
          ...current,
          hairId: entry.definition.id as HairAssetId,
        }),
        animated: false,
        selected,
        size: 'md',
        showFrame: false,
        label: entry.definition.label,
      })
    }

    hairColors.update(current.hairColor)
    skinColors.update(current.skinColor)
    primaryColors.update(current.uniformPrimaryColor)
    accentColors.update(current.uniformAccentColor)
    overlay.textContent = showAlignmentOverlay
      ? 'Hide Alignment'
      : 'Show Alignment'
    overlay.classList.toggle('is-active', showAlignmentOverlay)
  }

  refresh()
  return lab
}

function createAppearanceColorControl(options: {
  label: string
  options: readonly AppearanceColorOption[]
  pending: boolean
  onColor: (color: string) => void
}): { element: HTMLElement; update: (color: string) => void } {
  const element = document.createElement('div')
  element.className =
    `profile-color-control ${options.pending ? 'is-pending' : ''}`.trim()
  const header = document.createElement('div')
  const label = document.createElement('strong')
  label.textContent = options.label
  header.appendChild(label)

  if (options.pending) {
    const note = document.createElement('span')
    note.textContent = 'SAVED / MASK NEEDED'
    header.appendChild(note)
  }

  const swatches = document.createElement('div')
  swatches.className = 'profile-color-swatches'
  const buttons = options.options.map((colorOption) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'profile-color-swatch'
    button.style.setProperty('--swatch-color', colorOption.value)
    button.setAttribute('aria-label', `${options.label}: ${colorOption.label}`)
    button.title = options.pending
      ? `${colorOption.label}. Saved for the future body mask.`
      : colorOption.label
    button.addEventListener('click', () => options.onColor(colorOption.value))
    swatches.appendChild(button)
    return { button, colorOption }
  })
  const custom = document.createElement('label')
  custom.className = 'profile-custom-color'
  const customLabel = document.createElement('span')
  customLabel.textContent = 'Custom'
  const customInput = document.createElement('input')
  customInput.type = 'color'
  customInput.setAttribute('aria-label', `Custom ${options.label}`)
  customInput.addEventListener('input', () => {
    options.onColor(customInput.value)
  })
  custom.append(customLabel, customInput)
  element.append(header, swatches, custom)

  return {
    element,
    update: (color) => {
      const normalized = normalizeAppearanceColor(color, '#674536')
      customInput.value = normalized

      for (const entry of buttons) {
        const selected =
          entry.colorOption.value.toLowerCase() === normalized.toLowerCase()
        entry.button.classList.toggle('is-selected', selected)
        entry.button.setAttribute('aria-pressed', String(selected))
      }
    },
  }
}

function createAttributeLegend(itemBonusTotal: number): HTMLElement {
  const legend = document.createElement('div')
  legend.className = 'profile-attribute-legend'
  const entries = [
    ['player', 'Player base'],
    ['item', `Items +${itemBonusTotal}`],
    ['total', `Live cap ${playerEffectiveAttributeMax}`],
  ] as const

  for (const [tone, label] of entries) {
    const chip = document.createElement('span')
    chip.className = `profile-attribute-legend-chip is-${tone}`
    const swatch = document.createElement('i')
    chip.append(swatch, label)
    legend.appendChild(chip)
  }

  return legend
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
