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
  nextOpponent: OpponentTeam | null
  onBack: () => void
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
      `${options.save.league.rookieCircuit.defeatedOpponentTeamIds.length}/5`,
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
        ? 'Beat each club in sequence to claim the Rookie Circuit.'
        : 'All five Rookie Circuit opponents have been defeated.',
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
        tone: 'primary',
      }),
    )
  } else {
    nextPanel.content.appendChild(
      createSpincoreBadge('ROOKIE CIRCUIT COMPLETE', 'mint'),
    )
  }

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
    createTier('Rookie Circuit', 'Current', 'Five opponents. One first title.', true),
    createTier('Metro Circuit', 'Locked', 'Regional clubs and longer schedules.'),
    createTier('Pro Circuit', 'Locked', 'Professional rosters and contracts.'),
    createTier('Apex League', 'Locked', 'The top level of Spincore competition.'),
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
