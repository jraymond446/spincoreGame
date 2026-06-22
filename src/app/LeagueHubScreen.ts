import type { OpponentTeam } from '../game/data/opponentTeams'
import type { TeamRosterReadiness } from '../franchise/teamRoster'
import type { LeagueStandingsRow } from '../league/leagueStandings'
import type { League } from '../league/leagueTypes'
import type { SaveGame } from '../save/saveTypes'
import {
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  createSpincoreTeamCard,
} from '../ui'

export function createLeagueHubScreen(options: {
  save: SaveGame
  league: League
  nextOpponent: OpponentTeam | null
  matchReadiness: TeamRosterReadiness
  standings: LeagueStandingsRow[]
  onBack: () => void
  onTeam: () => void
  onPlayNext: () => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'LEAGUE HUB / ROOKIE CIRCUIT',
    title: options.league.name,
    subtitle: options.league.description,
  })
  const status = document.createElement('section')
  status.className = 'league-status-grid'
  status.append(
    createSpincoreMetric(
      'Current Record',
      `${options.save.league.record.wins}-${options.save.league.record.losses}`,
      true,
    ),
    createSpincoreMetric(
      'Opponents Beaten',
      `${options.save.league.rookieCircuit.defeatedOpponentTeamIds.length}/${options.league.teams.length}`,
    ),
    createSpincoreMetric(
      'Status',
      options.save.league.rookieCircuit.completed ? 'Complete' : 'Active',
    ),
  )

  const nextPanel = createSpincorePanel({
    eyebrow: options.nextOpponent ? 'NEXT FIXTURE' : 'CIRCUIT COMPLETE',
    title: options.nextOpponent ? 'Rookie Circuit Match' : 'Rookie Champion',
    copy:
      options.nextOpponent
        ? options.matchReadiness.ready
          ? 'Beat each club in sequence to claim the Rookie Circuit.'
          : `${options.matchReadiness.message} League fixtures need three active starters.`
        : `All ${options.league.teams.length} Rookie Circuit opponents have been defeated.`,
    tone: 'featured',
  })
  if (options.nextOpponent) {
    nextPanel.content.appendChild(
      createSpincoreTeamCard({
        team: options.nextOpponent,
        selected: true,
        compact: true,
      }),
    )
    nextPanel.actions.append(
      createSpincoreButton('Play Next Match', options.onPlayNext, {
        tone: options.matchReadiness.ready ? 'primary' : 'quiet',
        disabled: !options.matchReadiness.ready,
      }),
    )

    if (!options.matchReadiness.ready) {
      nextPanel.content.append(
        createSpincoreBadge('ROSTER INCOMPLETE', 'rose'),
      )
      nextPanel.actions.append(
        createSpincoreButton('Manage Team', options.onTeam, {
          tone: 'secondary',
        }),
      )
    }
  } else {
    nextPanel.content.appendChild(
      createSpincoreBadge('ROOKIE CIRCUIT COMPLETE', 'mint'),
    )
  }

  const standingsPanel = createStandingsPanel(options.standings)

  const ladderHeading = document.createElement('div')
  ladderHeading.className = 'section-heading-row'
  const ladderCopy = document.createElement('div')
  const ladderTitle = document.createElement('h2')
  ladderTitle.textContent = 'Circuit Ladder'
  const ladderDescription = document.createElement('p')
  ladderDescription.textContent =
    'Higher leagues unlock as the career structure expands.'
  ladderCopy.append(ladderTitle, ladderDescription)
  ladderHeading.append(
    ladderCopy,
    createSpincoreBadge('1 OF 4 OPEN', 'gold'),
  )
  const tiers = document.createElement('div')
  tiers.className = 'league-tier-grid'
  tiers.append(
    createTier('Rookie Circuit', 'Current', 'Six clubs. One first title.', true),
    createTier('Metro Circuit', 'Locked', 'Twelve regional clubs and longer schedules.'),
    createTier('Pro Circuit', 'Locked', 'Eighteen professional rosters and contracts.'),
    createTier('Apex League', 'Locked', 'Thirty top-level clubs and long-running seasons.'),
  )

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
  )
  body.append(status, nextPanel.panel, standingsPanel.panel, ladderHeading, tiers, actions)
  return root
}

function createStandingsPanel(
  standings: LeagueStandingsRow[],
): ReturnType<typeof createSpincorePanel> {
  const panel = createSpincorePanel({
    eyebrow: 'LEAGUE TABLE',
    title: 'Standings',
    copy:
      'Prototype table: AI clubs start from baseline form, then your league results are layered into the live table.',
  })
  const table = document.createElement('div')
  table.className = 'league-standings-table'
  table.appendChild(createStandingsHeader())

  for (const row of standings) {
    table.appendChild(createStandingsRow(row))
  }

  panel.content.appendChild(table)
  return panel
}

function createStandingsHeader(): HTMLElement {
  const header = document.createElement('div')
  header.className = 'league-standings-row is-header'

  for (const label of ['#', 'Club', 'W', 'L', 'PCT', '+/-', 'Form', 'Identity']) {
    const cell = document.createElement('span')
    cell.textContent = label
    header.appendChild(cell)
  }

  return header
}

function createStandingsRow(row: LeagueStandingsRow): HTMLElement {
  const element = document.createElement('article')
  element.className = `league-standings-row ${
    row.isUserTeam ? 'is-user-team' : ''
  }`
  const rank = document.createElement('strong')
  rank.textContent = String(row.seed)
  const club = document.createElement('div')
  club.className = 'league-standings-club'
  const crest = document.createElement('span')
  crest.textContent = row.shortName.slice(0, 3)
  const name = document.createElement('b')
  name.textContent = row.name
  club.append(crest, name)

  for (const item of [
    rank,
    club,
    textCell(row.wins),
    textCell(row.losses),
    textCell(row.winPct.toFixed(3).replace(/^0/, '')),
    textCell(row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff),
    textCell(row.streak),
    identityCell(row),
  ]) {
    element.appendChild(item)
  }

  return element
}

function identityCell(row: LeagueStandingsRow): HTMLElement {
  const cell = document.createElement('div')
  cell.className = 'league-standings-identity'
  cell.append(
    createSpincoreBadge(titleCase(row.style), row.isUserTeam ? 'gold' : 'blue'),
    createSpincoreBadge(titleCase(row.marketProfile), 'navy'),
  )
  return cell
}

function textCell(value: string | number): HTMLElement {
  const cell = document.createElement('span')
  cell.textContent = String(value)
  return cell
}

function createTier(
  name: string,
  status: string,
  description: string,
  current = false,
): HTMLElement {
  const panel = createSpincorePanel({
    eyebrow: status.toUpperCase(),
    title: name,
    copy: description,
    tone: current ? 'featured' : 'locked',
  })
  panel.content.appendChild(
    createSpincoreBadge(current ? 'CURRENT LEAGUE' : 'COMING SOON', current ? 'mint' : 'navy'),
  )
  return panel.panel
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
