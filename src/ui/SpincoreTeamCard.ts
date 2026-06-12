import type { OpponentTeam } from '../game/data/opponentTeams'
import { createSpincoreBadge } from './SpincoreBadge'

export function createSpincoreTeamCard(options: {
  team: OpponentTeam
  selected?: boolean
  onSelect?: () => void
  compact?: boolean
}): HTMLButtonElement {
  const card = document.createElement('button')
  card.type = 'button'
  card.className =
    `spincore-team-card ${options.selected ? 'is-selected' : ''} ` +
    `${options.compact ? 'is-compact' : ''}`
  card.style.setProperty(
    '--team-primary',
    colorToCss(options.team.primaryColor),
  )
  card.style.setProperty(
    '--team-secondary',
    colorToCss(options.team.secondaryColor),
  )
  const crest = document.createElement('span')
  crest.className = 'spincore-team-crest'
  crest.textContent = options.team.shortName.slice(0, 2)
  const copy = document.createElement('span')
  copy.className = 'spincore-team-copy'
  const badges = document.createElement('span')
  badges.className = 'spincore-team-badges'
  badges.append(
    createSpincoreBadge(`DIF ${options.team.difficulty}`, 'gold'),
    createSpincoreBadge(titleCase(options.team.formation), 'mint'),
  )
  const name = document.createElement('strong')
  name.textContent = options.team.name
  const scheme = document.createElement('small')
  scheme.textContent =
    `${titleCase(options.team.strategy.offenseScheme)} offense`
  copy.append(badges, name, scheme)
  const marker = document.createElement('span')
  marker.className = 'spincore-team-marker'
  marker.textContent = options.selected ? 'SELECTED' : 'CHOOSE'
  card.append(crest, copy, marker)

  if (options.onSelect) {
    card.addEventListener('click', options.onSelect)
  } else {
    card.disabled = true
  }

  return card
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
