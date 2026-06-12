import type { OpponentTeam } from '../game/data/opponentTeams'
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
  nextOpponent: OpponentTeam
  onBack: () => void
  onPlayNext: () => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'LEAGUE HUB / ROOKIE DIVISION',
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
    createSpincoreMetric('Matches', options.save.stats.matchesPlayed),
    createSpincoreMetric('Division', 'Rookie'),
  )

  const nextPanel = createSpincorePanel({
    eyebrow: 'NEXT FIXTURE',
    title: 'Local Circuit Match',
    copy:
      'The Rookie division is open. Win, earn rewards, and build the foundation of your career.',
    tone: 'featured',
  })
  nextPanel.content.appendChild(
    createSpincoreTeamCard({
      team: options.nextOpponent,
      selected: true,
      compact: true,
    }),
  )
  nextPanel.actions.append(
    createSpincoreButton('Play Next Match', options.onPlayNext, {
      tone: 'primary',
    }),
  )

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
    createTier('Local Circuit', 'Rookie', 'Your current proving ground.', true),
    createTier('Metro League', 'Locked', 'Regional clubs and longer schedules.'),
    createTier('Pro Circuit', 'Locked', 'Professional rosters and contracts.'),
    createTier('Apex Series', 'Locked', 'The top level of Spincore competition.'),
  )

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
  )
  body.append(status, nextPanel.panel, ladderHeading, tiers, actions)
  return root
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
