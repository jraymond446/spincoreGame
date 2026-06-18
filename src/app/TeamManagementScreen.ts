import {
  getEquipmentItem,
} from '../equipment/equipmentCatalog'
import {
  getInventoryItemCount,
  getUniqueInventoryItemIds,
} from '../equipment/equipmentInventory'
import type { EquipmentItem } from '../equipment/equipmentTypes'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import {
  getCoach,
  getCoachMarket,
  starterCoachId,
  type Coach,
} from '../franchise/coachCatalog'
import {
  freeAgentCatalog,
  type FreeAgent,
} from '../franchise/freeAgentCatalog'
import {
  getTeamFinance,
  type TeamFinanceSnapshot,
} from '../franchise/teamFinance'
import {
  getLoadoutAttributeModifiers,
  getLoadoutAssignmentCount,
  getAvailableLoadoutCopies,
  canCutRosterSlot,
  getFirstAvailableRosterSlotForFreeAgent,
  getCreatedPlayerRosterSlot,
  getSignedRosterPlayer,
  getTeamRosterReadiness,
  isFreeAgentSigned,
  getTeamRosterLoadout,
  getTeamRosterSlotProfile,
} from '../franchise/teamRoster'
import {
  teamColorHex,
  teamColorLabel,
  teamColorOptions,
} from '../franchise/teamIdentity'
import type { League } from '../league/leagueTypes'
import type {
  SaveGame,
  TeamColorKey,
  TeamIdentity,
  TeamRosterSlotId,
} from '../save/saveTypes'
import { teamRosterSlotIds } from '../save/saveTypes'
import {
  createPlayerIdentityCard,
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  titleCase,
} from '../ui'

type RosterSlotView = {
  slotId: TeamRosterSlotId | null
  role: string
  name: string
  meta: string
  rating: number | null
  salary: number | null
  status: string
  canManageLoadout: boolean
  canCut: boolean
  tone: 'active' | 'temporary' | 'open'
}

export type TeamIdentityChanges = {
  name?: string
  colors?: Partial<TeamIdentity['colors']>
}

export function createTeamManagementScreen(options: {
  save: SaveGame
  league: League
  onBack: () => void
  onLeague: () => void
  onPlayer: () => void
  onStore: () => void
  onEquip: (item: EquipmentItem) => void
  onOpenLoadout: (slotId: TeamRosterSlotId) => void
  onSignFreeAgent: (agentId: string) => void
  onCutRosterPlayer: (slotId: TeamRosterSlotId) => void
  onSignCoach: (coachId: string) => void
  onFireCoach: () => void
  onTeamChange: (changes: TeamIdentityChanges) => void
}): HTMLElement {
  const coach = getCoach(options.save.team.coachId ?? starterCoachId)
  const finance = getTeamFinance(options.save, options.league, coach)
  const matchReadiness = getTeamRosterReadiness(options.save)
  const teamRating = calculateTeamRating(options.save, coach)
  const leagueStats =
    options.save.leagueStats[options.save.league.currentLeagueId ?? ''] ??
    options.save.leagueStats.rookie_circuit
  const { root, body, header } = createSpincoreScreenFrame({
    eyebrow: 'FRANCHISE HQ / ROOKIE CIRCUIT',
    title: options.save.team.name,
    subtitle:
      'Manage team identity, payroll, roster spots, coach identity, gear cabinet, and league news.',
  })
  const headerMetrics = document.createElement('div')
  headerMetrics.className = 'spincore-header-metrics'
  headerMetrics.append(
    createSpincoreMetric('Team Rating', teamRating, true),
    createSpincoreMetric('Cap Room', `$${finance.capRoom}`),
    createSpincoreMetric('Payroll', `$${finance.payroll}`),
    createSpincoreMetric(
      'Team Bank',
      `$${options.save.wallet.money}`,
    ),
  )
  header.appendChild(headerMetrics)

  const hq = document.createElement('section')
  hq.className = 'team-hq-layout'

  const rosterPanel = createSpincorePanel({
    eyebrow: 'TEAM SHEET',
    title: 'Active Roster',
    copy:
      'Three active match spots plus one bench. You must always roster a keeper; active open spots use house players until you sign upgrades.',
    tone: 'featured',
  })
  rosterPanel.content.append(
    createPlayerIdentityCard(options.save, { expanded: true }),
    createRosterReadinessStrip(matchReadiness),
    createRosterGrid(
      options.save,
      finance,
      options.onOpenLoadout,
      options.onCutRosterPlayer,
    ),
  )
  rosterPanel.actions.append(
    createSpincoreButton('Player Room', options.onPlayer, {
      tone: 'secondary',
    }),
  )

  const rightRail = document.createElement('div')
  rightRail.className = 'team-hq-right-rail'
  rightRail.append(
    createTeamIdentityPanel(options.save, options.onTeamChange).panel,
    createCoachPanel(coach, options.onFireCoach).panel,
    createFinancePanel(finance, options.league).panel,
  )
  hq.append(rosterPanel.panel, rightRail)

  const lowerGrid = document.createElement('section')
  lowerGrid.className = 'team-hq-lower-grid'
  lowerGrid.append(
    createTeamStatsPanel(options.save, options.league, leagueStats).panel,
    createGearCabinetPanel(options.save, options.onEquip, options.onStore).panel,
    createNewsPanel(options.save, coach, finance).panel,
  )
  const marketGrid = document.createElement('section')
  marketGrid.className = 'team-market-grid'
  marketGrid.append(
    createFreeAgentMarketPanel(
      options.save,
      finance,
      options.onSignFreeAgent,
    ).panel,
    createCoachMarketPanel(
      options.save,
      finance,
      coach,
      options.onSignCoach,
    ).panel,
  )

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
    createSpincoreButton('League Office', options.onLeague, {
      tone: 'secondary',
    }),
  )
  body.append(hq, lowerGrid, marketGrid, actions)
  return root
}

function createRosterGrid(
  save: SaveGame,
  finance: TeamFinanceSnapshot,
  onOpenLoadout: (slotId: TeamRosterSlotId) => void,
  onCutRosterPlayer: (slotId: TeamRosterSlotId) => void,
): HTMLElement {
  const grid = document.createElement('div')
  grid.className = 'team-roster-grid'
  const slots = teamRosterSlotIds.map((slotId) =>
    createRosterSlotView(save, finance, slotId),
  )

  for (const slot of slots) {
    grid.appendChild(
      createRosterSlot(slot, onOpenLoadout, onCutRosterPlayer),
    )
  }

  return grid
}

function createRosterSlot(
  slot: RosterSlotView,
  onOpenLoadout: (slotId: TeamRosterSlotId) => void,
  onCutRosterPlayer: (slotId: TeamRosterSlotId) => void,
): HTMLElement {
  const card = document.createElement('article')
  card.className = `team-roster-slot is-${slot.tone}`
  const top = document.createElement('div')
  top.append(
    createSpincoreBadge(slot.role.toUpperCase(), slot.tone === 'active' ? 'gold' : 'blue'),
    createSpincoreBadge(slot.status, slot.tone === 'open' ? 'navy' : 'mint'),
  )

  if (slot.salary !== null) {
    top.appendChild(createSpincoreBadge(`$${slot.salary}/MATCH`, 'navy'))
  }

  const name = document.createElement('strong')
  name.textContent = slot.name
  const meta = document.createElement('p')
  meta.textContent = slot.meta
  const rating = document.createElement('span')
  rating.className = 'team-roster-rating'
  rating.textContent = slot.rating === null ? 'TBD' : `${slot.rating} OVR`
  card.append(top, name, meta, rating)

  const actions = document.createElement('div')
  actions.className = 'team-roster-actions'

  if (slot.slotId && slot.canManageLoadout) {
    actions.appendChild(
      createSpincoreButton(
        'Manage Loadout',
        () => onOpenLoadout(slot.slotId as TeamRosterSlotId),
        {
          tone: slot.tone === 'active' ? 'primary' : 'secondary',
          compact: true,
        },
      ),
    )
  }

  if (slot.slotId && slot.canCut) {
    actions.appendChild(
      createSpincoreButton(
        'Cut',
        () => onCutRosterPlayer(slot.slotId as TeamRosterSlotId),
        {
          tone: 'danger',
          compact: true,
        },
      ),
    )
  }

  if (actions.childElementCount > 0) {
    card.appendChild(actions)
  }

  return card
}

function createRosterReadinessStrip(
  readiness: ReturnType<typeof getTeamRosterReadiness>,
): HTMLElement {
  const strip = document.createElement('div')
  strip.className = `team-roster-readiness ${
    readiness.ready ? 'is-ready' : 'is-incomplete'
  }`
  const copy = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = readiness.ready
    ? 'Match Eligible'
    : 'Starting Lineup Incomplete'
  const detail = document.createElement('span')
  detail.textContent = readiness.message
  copy.append(title, detail)
  strip.append(
    copy,
    createSpincoreBadge(
      `${readiness.activePlayerCount}/${readiness.requiredActivePlayerCount} STARTERS`,
      readiness.ready ? 'mint' : 'rose',
    ),
  )
  return strip
}

function createFreeAgentMarketPanel(
  save: SaveGame,
  finance: TeamFinanceSnapshot,
  onSignFreeAgent: (agentId: string) => void,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'PLAYER MARKET',
    title: 'Free Agents',
    copy:
      'Prototype pool: sign a player into an open active slot or the bench. Cap room, not cash, controls eligibility.',
  })
  const list = document.createElement('div')
  list.className = 'team-market-list'

  for (const agent of freeAgentCatalog) {
    list.appendChild(
      createFreeAgentCard({
        agent,
        save,
        finance,
        onSign: () => onSignFreeAgent(agent.id),
      }),
    )
  }

  panel.content.appendChild(list)
  return panel
}

function createFreeAgentCard(options: {
  agent: FreeAgent
  save: SaveGame
  finance: TeamFinanceSnapshot
  onSign: () => void
}): HTMLElement {
  const { agent, save, finance } = options
  const slotId = getFirstAvailableRosterSlotForFreeAgent(save, agent)
  const alreadySigned = isFreeAgentSigned(save, agent.id)
  const replacedSalary = slotId ? salaryFor(finance, slotId) ?? 0 : 0
  const projectedPayroll =
    finance.payroll - replacedSalary + agent.salary
  const overCap = projectedPayroll > finance.salaryCap
  const disabled = alreadySigned || !slotId || overCap
  const card = document.createElement('article')
  card.className = 'team-market-card'
  const top = document.createElement('div')
  top.append(
    createSpincoreBadge(titleCase(agent.role), agent.role === 'keeper' ? 'gold' : 'blue'),
    createSpincoreBadge(`$${agent.salary}/match`, 'navy'),
    createSpincoreBadge(`${overallFromAttributes(agent.attributes)} OVR`, 'mint'),
  )
  const name = document.createElement('strong')
  name.textContent = agent.name
  const copy = document.createElement('p')
  copy.textContent = agent.summary
  const traits = document.createElement('div')
  traits.className = 'team-market-traits'

  for (const trait of agent.traits) {
    traits.appendChild(createSpincoreBadge(trait, 'blue'))
  }

  const destination = document.createElement('span')
  destination.className = 'team-market-note'
  destination.textContent = alreadySigned
    ? 'Already signed to your club.'
    : slotId
      ? `Would join ${titleCase(slotIdLabel(slotId))}. Projected payroll $${projectedPayroll}.`
      : 'Roster full. Cut a signed player to open a slot.'
  const button = createSpincoreButton(
    alreadySigned ? 'Signed' : overCap ? 'Over Cap' : !slotId ? 'No Slot' : 'Sign',
    options.onSign,
    {
      tone: disabled ? 'quiet' : 'primary',
      compact: true,
      disabled,
    },
  )
  card.append(top, name, copy, traits, destination, button)
  return card
}

function createCoachMarketPanel(
  _save: SaveGame,
  finance: TeamFinanceSnapshot,
  currentCoach: Coach,
  onSignCoach: (coachId: string) => void,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'COACH MARKET',
    title: 'Coach Pool',
    copy:
      'Coach salary counts against the cap and their schemes preview the future formation layer.',
  })
  const list = document.createElement('div')
  list.className = 'team-market-list'

  for (const coach of getCoachMarket()) {
    list.appendChild(
      createCoachMarketCard({
        coach,
        currentCoach,
        finance,
        onSign: () => onSignCoach(coach.id),
      }),
    )
  }

  panel.content.appendChild(list)
  return panel
}

function createCoachMarketCard(options: {
  coach: Coach
  currentCoach: Coach
  finance: TeamFinanceSnapshot
  onSign: () => void
}): HTMLElement {
  const { coach, currentCoach, finance } = options
  const isCurrent = coach.id === currentCoach.id
  const projectedPayroll =
    finance.payroll - currentCoach.salary + coach.salary
  const overCap = projectedPayroll > finance.salaryCap
  const disabled = isCurrent || overCap
  const card = document.createElement('article')
  card.className = 'team-market-card'
  const top = document.createElement('div')
  top.append(
    createSpincoreBadge(coach.title, 'gold'),
    createSpincoreBadge(`${titleCase(coach.tier)} Coach`, 'blue'),
    createSpincoreBadge(`$${coach.salary}/match`, 'navy'),
  )
  const name = document.createElement('strong')
  name.textContent = coach.name
  const copy = document.createElement('p')
  copy.textContent = coach.summary
  const schemes = document.createElement('span')
  schemes.className = 'team-market-note'
  schemes.textContent =
    `${titleCase(coach.strategy.offenseScheme)} / ` +
    `${titleCase(coach.strategy.defenseScheme)} / ` +
    `Projected payroll $${projectedPayroll}`
  const button = createSpincoreButton(
    isCurrent ? 'Current' : overCap ? 'Over Cap' : 'Hire',
    options.onSign,
    {
      tone: disabled ? 'quiet' : 'primary',
      compact: true,
      disabled,
    },
  )
  card.append(top, name, copy, schemes, button)
  return card
}

function createTeamIdentityPanel(
  save: SaveGame,
  onTeamChange: (changes: TeamIdentityChanges) => void,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'TEAM IDENTITY',
    title: save.team.name,
    copy:
      'Customize the club name, uniform palette, and home field color. Sponsors will plug into this identity later.',
  })
  const preview = document.createElement('div')
  preview.className = 'team-identity-preview'
  preview.style.setProperty('--team-primary', teamColorHex(save.team.colors.primary))
  preview.style.setProperty('--team-secondary', teamColorHex(save.team.colors.secondary))
  preview.style.setProperty('--team-field', teamColorHex(save.team.colors.homeField))
  const crest = document.createElement('div')
  crest.className = 'team-identity-crest'
  crest.textContent = initials(save.team.name)
  const copy = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = save.team.name
  const colors = document.createElement('span')
  colors.textContent =
    `${teamColorLabel(save.team.colors.primary)} / ` +
    `${teamColorLabel(save.team.colors.secondary)} / ` +
    `${teamColorLabel(save.team.colors.homeField)} field`
  copy.append(name, colors)
  preview.append(crest, copy)

  const fields = document.createElement('div')
  fields.className = 'team-identity-fields'
  fields.append(
    createNameField(save.team.name),
    createColorField(
      'Primary',
      save.team.colors.primary,
    ),
    createColorField(
      'Secondary',
      save.team.colors.secondary,
    ),
    createColorField(
      'Home Field',
      save.team.colors.homeField,
    ),
  )
  panel.content.append(preview, fields)
  panel.actions.append(
    createSpincoreButton('Save Identity', () => {
      const input = fields.querySelector('input')
      const selects = Array.from(fields.querySelectorAll('select'))
      const [primary, secondary, homeField] = selects.map(
        (select) => select.value as TeamColorKey,
      )
      onTeamChange({
        name: input?.value,
        colors: {
          primary,
          secondary,
          homeField,
        },
      })
    }, {
      tone: 'secondary',
    }),
  )
  return panel
}

function createCoachPanel(
  coach: Coach,
  onFireCoach: () => void,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'COACH SPOT',
    title: coach.name,
    copy: coach.summary,
  })
  const card = document.createElement('div')
  card.className = 'team-coach-card'
  const title = document.createElement('div')
  title.append(
    createSpincoreBadge(coach.title, 'gold'),
    createSpincoreBadge(`${titleCase(coach.tier)} Coach`, 'blue'),
    createSpincoreBadge(`$${coach.salary}/match`, 'navy'),
  )
  const schemes = document.createElement('dl')
  schemes.className = 'team-coach-schemes'
  appendDefinition(schemes, 'Offense', titleCase(coach.strategy.offenseScheme))
  appendDefinition(schemes, 'Defense', titleCase(coach.strategy.defenseScheme))
  appendDefinition(schemes, 'Transition', titleCase(coach.strategy.transitionScheme))
  appendDefinition(schemes, 'Formation', titleCase(coach.strategy.formation))
  const stats = document.createElement('div')
  stats.className = 'team-coach-stat-grid'

  for (const [label, value] of [
    ['Offense', coach.attributes.offense],
    ['Defense', coach.attributes.defense],
    ['Perk Sync', coach.attributes.perkSynergy],
    ['Sponsors', coach.attributes.sponsorAppeal],
    ['Room', coach.attributes.lockerRoom],
  ] as const) {
    stats.appendChild(createMiniRating(label, value))
  }

  const boosts = document.createElement('div')
  boosts.className = 'team-coach-boosts'
  const boostEntries = Object.entries(coach.boosts)

  if (boostEntries.length === 0) {
    boosts.appendChild(createSpincoreBadge('NO STAT BOOSTS', 'navy'))
  } else {
    for (const [key, value] of boostEntries) {
      boosts.appendChild(
        createSpincoreBadge(`+${value} ${titleCase(key)}`, 'mint'),
      )
    }
  }

  card.append(title, schemes, stats, boosts)
  panel.content.appendChild(card)
  panel.actions.append(
    createSpincoreButton('Fire Coach', onFireCoach, {
      tone: coach.id === starterCoachId ? 'quiet' : 'danger',
      disabled: coach.id === starterCoachId,
    }),
  )
  return panel
}

function createFinancePanel(
  finance: TeamFinanceSnapshot,
  league: League,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'FINANCE OFFICE',
    title: 'Payroll & Cap',
    copy:
      'Salary cap is league base plus sponsor bonus. Player and coach contracts will use this room.',
  })
  const metrics = document.createElement('div')
  metrics.className = 'team-finance-grid'
  metrics.append(
    createSpincoreMetric('Base Cap', `$${finance.baseCap}`, true),
    createSpincoreMetric('Sponsor Bonus', `$${finance.sponsorBonus}`),
    createSpincoreMetric('Salary Cap', `$${finance.salaryCap}`),
    createSpincoreMetric('Payroll', `$${finance.payroll}`),
    createSpincoreMetric('Cap Room', `$${finance.capRoom}`),
    createSpincoreMetric('Sponsor', finance.sponsorName),
  )
  const capNote = document.createElement('p')
  capNote.className = 'team-finance-note'
  capNote.textContent =
    finance.isOverCap
      ? `${league.name} cap is active and the club is over cap. Cut salary or hire cheaper staff before entering lower-cap play.`
      : `${league.name} cap is active. Higher leagues and better sponsors will expand the room.`
  const lines = document.createElement('div')
  lines.className = 'team-salary-list'

  for (const line of finance.salaryLines) {
    const row = document.createElement('article')
    row.className = line.committed ? 'is-committed' : 'is-open'
    const copy = document.createElement('div')
    const label = document.createElement('strong')
    label.textContent = line.label
    const role = document.createElement('span')
    role.textContent = titleCase(line.role)
    copy.append(label, role)
    const salary = document.createElement('b')
    salary.textContent = line.committed ? `$${line.salary}` : 'Open'
    row.append(copy, salary)
    lines.appendChild(row)
  }

  panel.content.append(metrics, capNote, lines)
  return panel
}

function createTeamStatsPanel(
  save: SaveGame,
  league: League,
  leagueStats: SaveGame['leagueStats'][string],
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'FRANCHISE LEDGER',
    title: 'Team Stats',
    copy:
      'These are captain-tracked for now. They become full team totals once roster persistence lands.',
  })
  const stats = document.createElement('div')
  stats.className = 'team-hq-stat-grid'
  stats.append(
    createSpincoreMetric('League', league.name, true),
    createSpincoreMetric(
      'League Record',
      `${leagueStats?.wins ?? 0}-${leagueStats?.losses ?? 0}`,
    ),
    createSpincoreMetric('League Goals', leagueStats?.goals ?? 0),
    createSpincoreMetric('Bank Goals', leagueStats?.bankShotGoals ?? 0),
    createSpincoreMetric('All Matches', save.stats.matchesPlayed),
    createSpincoreMetric('All Goals', save.stats.goals),
  )
  panel.content.appendChild(stats)
  return panel
}

function createGearCabinetPanel(
  save: SaveGame,
  onEquip: (item: EquipmentItem) => void,
  onStore: () => void,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'PLAYER ROOM',
    title: 'Gear Cabinet',
    copy:
      'Owned gear lives here. This is the first alternate path to equip without visiting the shop.',
  })
  const equipped = new Set(Object.values(save.equipment.equipped))
  const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)
  const inventory = getUniqueInventoryItemIds(save.equipment.inventory)
    .map((id) => getEquipmentItem(id))
    .filter((item): item is EquipmentItem => item !== null)
  const list = document.createElement('div')
  list.className = 'team-gear-list'

  if (inventory.length === 0) {
    const empty = document.createElement('p')
    empty.textContent = 'No gear owned yet.'
    list.appendChild(empty)
  } else {
    for (const item of inventory) {
      list.appendChild(
        createGearRow({
          item,
          equipped: equipped.has(item.id),
          ownedCount: getInventoryItemCount(save.equipment.inventory, item.id),
          assignedCount: getLoadoutAssignmentCount(save, item.id),
          canEquip:
            !equipped.has(item.id) &&
            getAvailableLoadoutCopies(save, item.id, {
              excludeSlotId: createdPlayerSlotId,
            }) > 0,
          onEquip: () => onEquip(item),
        }),
      )
    }
  }

  panel.content.appendChild(list)
  panel.actions.append(
    createSpincoreButton('Visit Shop Row', onStore, { tone: 'secondary' }),
  )
  return panel
}

function createGearRow(options: {
  item: EquipmentItem
  equipped: boolean
  ownedCount: number
  assignedCount: number
  canEquip: boolean
  onEquip: () => void
}): HTMLElement {
  const { item } = options
  const row = document.createElement('article')
  row.className = `team-gear-row is-${item.rarity}`
  const icon = document.createElement('div')
  icon.className = `spincore-equipment-icon is-${item.type} is-${item.rarity}`
  icon.textContent =
    item.type === 'stick'
      ? 'STK'
      : item.type === 'shield'
        ? 'SHD'
        : item.type === 'armor'
          ? 'ARM'
          : 'SPD'
  const copy = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = item.name
  const meta = document.createElement('span')
  meta.textContent =
    `Own ${options.ownedCount}x / ${options.assignedCount} assigned / ` +
    `${titleCase(item.type)} / ${titleCase(item.rarity)}`
  copy.append(name, meta)
  const action = createSpincoreButton(
    options.equipped ? 'Equipped' : options.canEquip ? 'Equip' : 'No Copy',
    options.onEquip,
    {
      tone: options.equipped || !options.canEquip ? 'quiet' : 'secondary',
      compact: true,
      disabled: options.equipped || !options.canEquip,
    },
  )
  row.append(icon, copy, action)
  return row
}

function createNewsPanel(
  save: SaveGame,
  coach: Coach,
  finance: TeamFinanceSnapshot,
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'LEAGUE WIRE',
    title: 'News Feed',
    copy:
      'Transaction and coach-carousel messages will land here as the league starts simulating other clubs.',
  })
  const feed = document.createElement('div')
  feed.className = 'team-news-feed'
  const assignedCopyCount = teamRosterSlotIds.flatMap((slotId) =>
    Object.values(getTeamRosterLoadout(save, slotId)).filter(
      (id): id is string => Boolean(id),
    ),
  ).length
  const unequippedCount = Math.max(
    0,
    save.equipment.inventory.length - assignedCopyCount,
  )
  const entries = [
    {
      tag: 'Front Office',
      text:
        `${save.team.name} has opened a clubhouse with ` +
        `$${finance.capRoom} in cap room for the Rookie Circuit.`,
    },
    {
      tag: 'Coach Desk',
      text:
        `${coach.name} installs ${titleCase(coach.strategy.offenseScheme)} offense ` +
        `and ${titleCase(coach.strategy.defenseScheme)} defense.`,
    },
    {
      tag: 'Roster Board',
      text:
        'Player and coach markets are live in prototype form. Rival transactions and coach firings come next.',
    },
  ]

  if (save.progression.unspentAttributePoints > 0) {
    entries.unshift({
      tag: 'Player Room',
      text:
        `${save.progression.unspentAttributePoints} upgrade point` +
        `${save.progression.unspentAttributePoints === 1 ? '' : 's'} available.`,
    })
  }

  if (unequippedCount > 0) {
    entries.push({
      tag: 'Gear Cabinet',
      text: `${unequippedCount} unequipped owned item${unequippedCount === 1 ? '' : 's'} in storage.`,
    })
  }

  for (const entry of entries) {
    const item = document.createElement('article')
    item.append(
      createSpincoreBadge(entry.tag, 'blue'),
      document.createTextNode(entry.text),
    )
    feed.appendChild(item)
  }

  panel.content.appendChild(feed)
  return panel
}

function temporarySlot(
  slotId: TeamRosterSlotId,
  role: string,
  name: string,
  meta: string,
  salary: number | null,
  rating: number,
): RosterSlotView {
  return {
    slotId,
    role,
    name,
    meta,
    rating,
    salary,
    status: 'Temp',
    canManageLoadout: true,
    canCut: false,
    tone: 'temporary',
  }
}

function openSlot(slotId: TeamRosterSlotId, meta: string): RosterSlotView {
  return {
    slotId,
    role: slotIdLabel(slotId),
    name: 'Open Slot',
    meta,
    rating: null,
    salary: null,
    status: 'Open',
    canManageLoadout: false,
    canCut: false,
    tone: 'open',
  }
}

function createRosterSlotView(
  save: SaveGame,
  finance: TeamFinanceSnapshot,
  slotId: TeamRosterSlotId,
): RosterSlotView {
  const profile = getTeamRosterSlotProfile(save, slotId)

  if (profile.isCreatedPlayer) {
    return {
      slotId,
      role: profile.roleLabel,
      name: profile.name,
      meta: profile.meta,
      rating: attributeOverall(
        Object.values(getEffectivePlayerAttributes(save)),
      ),
      salary: salaryFor(finance, slotId),
      status: 'Signed',
      canManageLoadout: true,
      canCut: false,
      tone: 'active',
    }
  }

  if (profile.isOpen) {
    return openSlot(slotId, profile.meta)
  }

  if (profile.isSignedPlayer) {
    const signedPlayer = getSignedRosterPlayer(save, slotId)

    return {
      slotId,
      role: profile.roleLabel,
      name: profile.name,
      meta: profile.meta,
      rating: signedPlayer
        ? overallFromAttributes(signedPlayer.attributes)
        : null,
      salary: salaryFor(finance, slotId),
      status: 'Signed',
      canManageLoadout: true,
      canCut: canCutRosterSlot(save, slotId),
      tone: 'active',
    }
  }

  return temporarySlot(
    slotId,
    profile.roleLabel,
    profile.name,
    profile.meta,
    salaryFor(finance, slotId),
    calculateTemporaryRosterRating(save, slotId),
  )
}

function calculateTeamRating(save: SaveGame, coach: Coach): number {
  const playerAverage = average(Object.values(getEffectivePlayerAttributes(save)))
  const coachAverage = average(Object.values(coach.attributes))
  const winBonus = Math.min(12, save.league.record.wins * 2)
  return Math.round(playerAverage * 2.4 + coachAverage * 1.7 + winBonus)
}

function createMiniRating(label: string, value: number): HTMLElement {
  const rating = document.createElement('div')
  const score = document.createElement('strong')
  score.textContent = String(value)
  const text = document.createElement('span')
  text.textContent = label
  rating.append(score, text)
  return rating
}

function appendDefinition(
  list: HTMLElement,
  label: string,
  value: string,
): void {
  const term = document.createElement('dt')
  term.textContent = label
  const detail = document.createElement('dd')
  detail.textContent = value
  list.append(term, detail)
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  )
}

function attributeOverall(values: number[]): number {
  return Math.min(99, Math.max(1, average(values) * 4))
}

function overallFromAttributes(
  attributes: Record<string, number>,
): number {
  return attributeOverall(Object.values(attributes))
}

function salaryFor(
  finance: TeamFinanceSnapshot,
  id: string,
): number | null {
  return finance.salaryLines.find((line) => line.id === id)?.salary ?? null
}

function calculateTemporaryRosterRating(
  save: SaveGame,
  slotId: TeamRosterSlotId,
): number {
  const modifiers = getLoadoutAttributeModifiers(
    getTeamRosterLoadout(save, slotId),
  )
  const positiveBoost = Object.values(modifiers).reduce(
    (total, value) => total + Math.max(0, value ?? 0),
    0,
  )

  return Math.min(95, 58 + Math.round(positiveBoost / 2))
}

function slotIdLabel(slotId: TeamRosterSlotId): string {
  switch (slotId) {
    case 'a-keeper':
      return 'Keeper'
    case 'a-support':
      return 'Support'
    case 'a-striker':
      return 'Striker'
    case 'bench':
      return 'Bench'
  }
}

function createNameField(
  value: string,
): HTMLElement {
  const label = document.createElement('label')
  label.className = 'app-field'
  label.textContent = 'Team name'
  const input = document.createElement('input')
  input.maxLength = 32
  input.value = value
  label.appendChild(input)
  return label
}

function createColorField(
  labelText: string,
  value: TeamColorKey,
): HTMLElement {
  const label = document.createElement('label')
  label.className = 'app-field'
  label.textContent = labelText
  const select = document.createElement('select')

  for (const option of teamColorOptions) {
    const element = document.createElement('option')
    element.value = option.value
    element.textContent = option.label
    element.selected = option.value === value
    select.appendChild(element)
  }

  label.appendChild(select)
  return label
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'SC'
}
