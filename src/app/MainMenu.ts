import type { OpponentTeam } from '../game/data/opponentTeams'
import type { SaveGame } from '../save/saveTypes'
import {
  createButton,
  createCard,
  createMetric,
  createScreenFrame,
  titleCase,
} from './ui'

export function createMainMenu(options: {
  save: SaveGame
  opponents: OpponentTeam[]
  selectedOpponentId: string
  onOpponentChange: (id: string) => void
  onPlay: () => void
  onPlayer: () => void
  onLeague: () => void
  onStore: () => void
  onLab: () => void
  onSettings: () => void
  onResetSave: () => void
}): HTMLElement {
  const { root, body, header } = createScreenFrame({
    eyebrow: 'LOCAL CIRCUIT',
    title: 'SPINCORE',
    subtitle: 'Build your player. Own the walls. Climb the circuit.',
  })
  const playerBadge = document.createElement('div')
  playerBadge.className = 'menu-player-badge'
  const playerIdentity = document.createElement('div')
  const playerName = document.createElement('strong')
  playerName.textContent =
    `#${options.save.player.jerseyNumber} ${options.save.player.name}`
  const playerRole = document.createElement('span')
  playerRole.textContent =
    `${titleCase(options.save.player.primaryRole)} · Level ${options.save.progression.level}`
  playerIdentity.append(playerName, playerRole)
  const playerMetrics = document.createElement('div')
  playerMetrics.className = 'menu-player-metrics'
  playerMetrics.append(
    createMetric('XP', options.save.progression.xp),
    createMetric('Cash', `$${options.save.wallet.money}`, true),
  )
  playerBadge.append(playerIdentity, playerMetrics)
  header.appendChild(playerBadge)

  const grid = document.createElement('div')
  grid.className = 'menu-card-grid'
  const play = createCard(
    'Play Exhibition',
    'Launch the tuned 3v3 match with your created player.',
  )
  play.card.classList.add('is-featured')
  const opponentField = document.createElement('label')
  opponentField.className = 'app-field menu-opponent-field'
  const opponentLabel = document.createElement('span')
  opponentLabel.textContent = 'Opponent'
  const opponentSelect = document.createElement('select')

  for (const opponent of options.opponents) {
    const option = document.createElement('option')
    option.value = opponent.id
    option.textContent =
      `${opponent.name} · Difficulty ${opponent.difficulty}`
    opponentSelect.appendChild(option)
  }

  opponentSelect.value = options.selectedOpponentId
  opponentSelect.addEventListener('change', () => {
    options.onOpponentChange(opponentSelect.value)
  })
  opponentField.append(opponentLabel, opponentSelect)
  play.content.appendChild(opponentField)
  play.actions.append(
    createButton('Play Now', options.onPlay, { tone: 'primary' }),
  )

  const player = createCard(
    'Player',
    'Review attributes, equipment bonuses, stats, and progression.',
  )
  player.actions.append(createButton('Open Profile', options.onPlayer))
  const league = createCard(
    'League',
    'Enter the Local Circuit and preview the progression structure.',
  )
  league.actions.append(createButton('League Hub', options.onLeague))
  const store = createCard(
    'Store',
    'Browse starter sticks, keeper shields, and court shoes.',
  )
  store.actions.append(createButton('Visit Store', options.onStore))
  const lab = createCard(
    'Prototype Lab',
    'Launch the original tunable match and full Lab Console.',
  )
  lab.actions.append(createButton('Open Lab Match', options.onLab))
  const settings = createCard(
    'Settings',
    'Save status, controls notes, and prototype utilities.',
  )
  settings.actions.append(createButton('Open Settings', options.onSettings))
  grid.append(
    play.card,
    player.card,
    league.card,
    store.card,
    lab.card,
    settings.card,
  )

  const footer = document.createElement('footer')
  footer.className = 'menu-footer'
  const saveStatus = document.createElement('span')
  saveStatus.textContent =
    `Profile updated ${new Date(options.save.updatedAt).toLocaleString()}`
  footer.append(
    saveStatus,
    createButton('Reset Save', options.onResetSave, {
      tone: 'danger',
    }),
  )
  body.append(grid, footer)
  return root
}

