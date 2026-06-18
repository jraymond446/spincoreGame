import type { MatchResult } from '../match/MatchResult'
import type { CreatedPlayer } from '../save/saveTypes'
import {
  createSpincoreBadge,
  createSpincoreButton,
  createSpincorePanel,
  createSpincorePlayerPreview,
  createSpincoreScreenFrame,
} from '../ui'

export function createMatchResultsScreen(options: {
  result: MatchResult
  player: CreatedPlayer
  onContinue: () => void
  onRematch: () => void
  onMainMenu: () => void
  onPlayerProfile: () => void
}): HTMLElement {
  const { result } = options
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: result.won ? 'MATCH COMPLETE / VICTORY' : 'MATCH COMPLETE / DEFEAT',
    title: result.won ? 'CIRCUIT WIN' : 'RUN IT BACK',
    subtitle:
      `${result.opponentName} / ` +
      `${new Date(result.completedAt).toLocaleString()}`,
  })
  root.classList.add('match-results-screen')

  const hero = document.createElement('section')
  hero.className = 'results-hero-grid'
  const outcome = createSpincorePanel({
    eyebrow: result.won ? 'YOU CONTROLLED THE CORE' : 'FINAL WHISTLE',
    title: `${result.playerTeamScore} - ${result.opponentTeamScore}`,
    copy:
      `${result.won ? 'Win' : 'Loss'} against ${result.opponentName}. ` +
      'Rewards have been saved to your player.',
    tone: 'featured',
  })
  outcome.panel.classList.add(
    'results-outcome-panel',
    result.won ? 'is-win' : 'is-loss',
  )
  outcome.content.append(
    createSpincoreBadge(
      result.mode === 'league' ? 'ROOKIE CIRCUIT' : 'EXHIBITION',
      result.mode === 'league' ? 'gold' : 'blue',
    ),
  )

  const character = document.createElement('div')
  character.className =
    `results-character ${result.won ? 'is-celebrating' : 'is-disappointed'}`
  const preview = createSpincorePlayerPreview({
    name: options.player.name,
    jerseyNumber: options.player.jerseyNumber,
    handedness: options.player.handedness,
    archetype: options.player.archetype,
    cosmetics: options.player.cosmetics,
    selectedStickId: options.player.selectedStickId,
  })
  const mood = createSpincoreBadge(
    result.won ? 'VICTORY POSE' : 'NEXT MATCH MENTALITY',
    result.won ? 'mint' : 'rose',
  )
  character.append(preview.element, mood)
  hero.append(outcome.panel, character)

  const statsPanel = createSpincorePanel({
    eyebrow: 'PLAYER LINE',
    title: 'Match Statistics',
    copy: 'Prototype stats default safely to zero when a match event cannot provide them.',
  })
  const stats = document.createElement('dl')
  stats.className = 'results-stat-grid'
  const statEntries: Array<[string, number]> = [
    ['Goals', result.playerStats.goals],
    ['Assists', result.playerStats.assists],
    ['Shots', result.playerStats.shots],
    ['Bank goals', result.playerStats.bankShotGoals],
    ['Saves', result.playerStats.saves],
    ['Steals', result.playerStats.steals],
    ['Turnovers', result.playerStats.turnovers],
    ['Fumbles', result.playerStats.fumbles],
    ['Gathers', result.playerStats.successfulGathers],
  ]

  for (const [label, value] of statEntries) {
    const item = document.createElement('div')
    const term = document.createElement('dt')
    term.textContent = label
    const description = document.createElement('dd')
    description.textContent = String(value)
    item.append(term, description)
    stats.appendChild(item)
  }
  statsPanel.content.appendChild(stats)

  const rewardsPanel = createSpincorePanel({
    eyebrow: 'PROGRESSION',
    title: 'Rewards Earned',
    copy:
      result.rewards.levelsGained > 0
        ? `Level up! You reached level ${result.rewards.newLevel} and earned ` +
          `${result.rewards.levelsGained} attribute ` +
          `${result.rewards.levelsGained === 1 ? 'point' : 'points'}.`
        : 'XP, funds, and career statistics were saved.',
    tone: result.rewards.levelsGained > 0 ? 'featured' : undefined,
  })
  const totals = document.createElement('div')
  totals.className = 'results-reward-totals'
  totals.append(
    createRewardTotal(`+${result.rewards.xp}`, 'XP'),
    createRewardTotal(`+$${result.rewards.money}`, 'FUNDS'),
  )
  const breakdown = document.createElement('div')
  breakdown.className = 'results-reward-breakdown'

  for (const item of result.rewards.breakdown) {
    const row = document.createElement('div')
    const label = document.createElement('span')
    label.textContent = item.label
    const values = document.createElement('strong')
    values.textContent = [
      item.xp ? `+${item.xp} XP` : '',
      item.money ? `+$${item.money}` : '',
    ].filter(Boolean).join(' / ')
    row.append(label, values)
    breakdown.appendChild(row)
  }
  rewardsPanel.content.append(totals, breakdown)

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions results-actions'
  actions.append(
    createSpincoreButton('World Map', options.onMainMenu, {
      tone: 'quiet',
    }),
    createSpincoreButton('Player Profile', options.onPlayerProfile, {
      tone: 'secondary',
    }),
    createSpincoreButton('Rematch', options.onRematch, {
      tone: 'secondary',
    }),
    createSpincoreButton('Continue', options.onContinue, {
      tone: 'primary',
    }),
  )
  body.append(hero, statsPanel.panel, rewardsPanel.panel, actions)
  return root
}

function createRewardTotal(value: string, label: string): HTMLElement {
  const metric = document.createElement('div')
  const strong = document.createElement('strong')
  strong.textContent = value
  const span = document.createElement('span')
  span.textContent = label
  metric.append(strong, span)
  return metric
}
