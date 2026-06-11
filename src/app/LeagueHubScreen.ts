import type { League } from '../league/leagueTypes'
import type { OpponentTeam } from '../game/data/opponentTeams'
import type { SaveGame } from '../save/saveTypes'
import {
  createButton,
  createMetric,
  createScreenFrame,
} from './ui'

export function createLeagueHubScreen(options: {
  save: SaveGame
  league: League
  nextOpponent: OpponentTeam
  onBack: () => void
  onPlayNext: () => void
}): HTMLElement {
  const { root, body } = createScreenFrame({
    eyebrow: 'LEAGUE HUB',
    title: options.league.name,
    subtitle: options.league.description,
  })
  const metrics = document.createElement('section')
  metrics.className = 'profile-summary-grid'
  metrics.append(
    createMetric(
      'Record',
      `${options.save.league.record.wins}-${options.save.league.record.losses}`,
      true,
    ),
    createMetric('Next Opponent', options.nextOpponent.shortName),
    createMetric('Difficulty', options.nextOpponent.difficulty),
  )
  const panels = document.createElement('div')
  panels.className = 'placeholder-grid'
  const next = document.createElement('section')
  next.className = 'app-panel placeholder-panel is-live'
  const nextHeading = document.createElement('h2')
  nextHeading.textContent = options.nextOpponent.name
  const nextCopy = document.createElement('p')
  nextCopy.textContent =
    `Formation: ${options.nextOpponent.formation}. ` +
    `Offense: ${options.nextOpponent.strategy.offenseScheme}.`
  next.append(
    nextHeading,
    nextCopy,
    createButton('Play Next Match', options.onPlayNext, {
      tone: 'primary',
    }),
  )
  const standings = placeholder(
    'Standings',
    'Circuit tables and tiebreakers will connect here.',
  )
  const schedule = placeholder(
    'Schedule',
    'Future rounds, travel, and playoff brackets will connect here.',
  )
  panels.append(next, standings, schedule)
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(createButton('Back', options.onBack, { tone: 'quiet' }))
  body.append(metrics, panels, actions)
  return root
}

function placeholder(titleText: string, copyText: string): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'app-panel placeholder-panel'
  const title = document.createElement('h2')
  title.textContent = titleText
  const copy = document.createElement('p')
  copy.textContent = copyText
  const badge = document.createElement('span')
  badge.className = 'coming-soon-badge'
  badge.textContent = 'COMING SOON'
  panel.append(title, copy, badge)
  return panel
}

