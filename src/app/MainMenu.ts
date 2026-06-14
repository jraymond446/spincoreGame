import type { OpponentTeam } from '../game/data/opponentTeams'
import { xpToNextLevel } from '../save/progression'
import type { SaveGame } from '../save/saveTypes'
import {
  createPlayerIdentityCard,
  createSpincoreBadge,
  createSpincoreButton,
  createSpincoreCard,
  createSpincoreMetric,
  createSpincorePanel,
  createSpincoreScreenFrame,
  createSpincoreTeamCard,
} from '../ui'

export type RewardNotice = {
  title: string
  xp: number
  money: number
  details: string
}

export function createMainMenu(options: {
  save: SaveGame
  opponents: OpponentTeam[]
  selectedOpponentId: string
  rewardNotice?: RewardNotice | null
  onOpponentChange: (id: string) => void
  onPlay: () => void
  onPlayer: () => void
  onLeague: () => void
  onStore: () => void
  onLab: () => void
  onSettings: () => void
  onResetSave: () => void
}): HTMLElement {
  const { root, body, header } = createSpincoreScreenFrame({
    eyebrow: 'ROOKIE CIRCUIT / CREATED PLAYER',
    title: 'SPINCORE',
    subtitle: 'Build your player. Own the walls. Climb the circuit.',
  })
  const headerMetrics = document.createElement('div')
  headerMetrics.className = 'spincore-header-metrics'
  headerMetrics.append(
    createSpincoreMetric(
      'XP',
      `${options.save.progression.xp}/${xpToNextLevel(options.save.progression.level)}`,
    ),
    createSpincoreMetric('Funds', `$${options.save.wallet.money}`, true),
    createSpincoreMetric(
      'Record',
      `${options.save.league.record.wins}-${options.save.league.record.losses}`,
    ),
  )
  header.appendChild(headerMetrics)

  if (options.rewardNotice) {
    body.appendChild(createRewardBanner(options.rewardNotice))
  }

  const frontDoor = document.createElement('section')
  frontDoor.className = 'menu-front-door'
  frontDoor.appendChild(createPlayerIdentityCard(options.save, {
    expanded: true,
  }))
  const playPanel = createSpincorePanel({
    eyebrow: 'NEXT UP',
    title: 'Exhibition Match',
    copy:
      'Take your created player into the tuned 3v3 match. ' +
      'Every run earns circuit XP and cash.',
    tone: 'featured',
  })
  playPanel.content.append(
    createSpincoreBadge('FIRST TO 5', 'rose'),
    createSpincoreBadge('3 VS 3', 'blue'),
  )
  playPanel.actions.append(
    createSpincoreButton('Play Match', options.onPlay, {
      tone: 'primary',
    }),
  )
  frontDoor.appendChild(playPanel.panel)

  const opponentPanel = createSpincorePanel({
    eyebrow: 'MATCHUP',
    title: 'Choose Your Opponent',
    copy: 'Each club brings a different shape and offensive identity.',
  })
  const opponentGrid = document.createElement('div')
  opponentGrid.className = 'opponent-card-grid'
  let selectedOpponentId = options.selectedOpponentId

  const renderOpponents = (): void => {
    opponentGrid.replaceChildren(
      ...options.opponents.map((team) =>
        createSpincoreTeamCard({
          team,
          selected: team.id === selectedOpponentId,
          onSelect: () => {
            selectedOpponentId = team.id
            options.onOpponentChange(team.id)
            renderOpponents()
          },
        }),
      ),
    )
  }

  renderOpponents()
  opponentPanel.content.appendChild(opponentGrid)

  const grid = document.createElement('div')
  grid.className = 'menu-card-grid menu-navigation-grid'
  const player = createSpincoreCard(
    'Player',
    'Attributes, equipment bonuses, career stats, and progression.',
  )
  player.actions.append(
    createSpincoreButton('Open Profile', options.onPlayer),
  )
  const league = createSpincoreCard(
    'League',
    'Beat five clubs in sequence and claim the Rookie Circuit.',
  )
  league.actions.append(
    createSpincoreButton('League Hub', options.onLeague),
  )
  const store = createSpincoreCard(
    'Store',
    'Upgrade sticks, keeper shields, and court shoes.',
  )
  store.actions.append(
    createSpincoreButton('Visit Store', options.onStore),
  )
  const settings = createSpincoreCard(
    'Settings',
    'Controls, save details, and prototype utilities.',
  )
  settings.actions.append(
    createSpincoreButton('Open Settings', options.onSettings),
  )
  grid.append(player.card, league.card, store.card, settings.card)

  const labStrip = document.createElement('section')
  labStrip.className = 'menu-lab-strip'
  const labCopy = document.createElement('div')
  const labTitle = document.createElement('strong')
  labTitle.textContent = 'Prototype Lab'
  const labDescription = document.createElement('span')
  labDescription.textContent =
    'Original tuning console. Career rewards are disabled here.'
  labCopy.append(labTitle, labDescription)
  labStrip.append(
    labCopy,
    createSpincoreButton('Open Lab', options.onLab, { tone: 'quiet' }),
  )

  const footer = document.createElement('footer')
  footer.className = 'menu-footer'
  const saveStatus = document.createElement('span')
  saveStatus.textContent =
    `Profile saved ${new Date(options.save.updatedAt).toLocaleString()}`
  footer.append(
    saveStatus,
    createSpincoreButton('Reset Save', options.onResetSave, {
      tone: 'danger',
      compact: true,
    }),
  )
  body.append(frontDoor, opponentPanel.panel, grid, labStrip, footer)
  return root
}

function createRewardBanner(notice: RewardNotice): HTMLElement {
  const banner = document.createElement('section')
  banner.className = 'match-reward-banner'
  const mark = document.createElement('div')
  mark.className = 'match-reward-mark'
  mark.textContent = '+'
  const copy = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = notice.title
  const details = document.createElement('span')
  details.textContent = notice.details
  copy.append(title, details)
  const rewards = document.createElement('div')
  rewards.className = 'match-reward-values'
  rewards.append(
    createSpincoreBadge(`+${notice.xp} XP`, 'gold'),
    createSpincoreBadge(`+$${notice.money}`, 'mint'),
  )
  banner.append(mark, copy, rewards)
  return banner
}
