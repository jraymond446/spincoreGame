import type { OpponentTeam } from '../game/data/opponentTeams'
import type { TeamRosterReadiness } from '../franchise/teamRoster'
import { teamColorHex } from '../franchise/teamIdentity'
import type { League } from '../league/leagueTypes'
import type { SaveGame } from '../save/saveTypes'
import {
  createSpincoreBadge,
  createSpincoreButton,
} from '../ui'
import type { RewardNotice } from './MainMenu'

type WorldMapDestination = {
  id: 'arena' | 'player-room' | 'league-office' | 'team-office' | 'store-row'
  number: string
  title: string
  kicker: string
  icon: string
  onSelect: () => void
}

export function createWorldMapScreen(options: {
  save: SaveGame
  league: League
  nextOpponent: OpponentTeam | null
  matchReadiness: TeamRosterReadiness
  rewardNotice?: RewardNotice | null
  onArena: () => void
  onPlayer: () => void
  onLeague: () => void
  onTeam: () => void
  onStore: () => void
  onStatus: () => void
}): HTMLElement {
  const root = document.createElement('main')
  root.className = 'world-map-screen'
  root.style.setProperty(
    '--world-team-primary',
    teamColorHex(options.save.team.colors.primary),
  )
  root.style.setProperty(
    '--world-team-secondary',
    teamColorHex(options.save.team.colors.secondary),
  )
  root.style.setProperty(
    '--world-team-field',
    teamColorHex(options.save.team.colors.homeField),
  )

  const frame = document.createElement('section')
  frame.className = 'world-map-frame'
  frame.append(
    createTopBar(options.save),
    createMapCanvas(options),
    createBottomHud(options),
  )
  root.appendChild(frame)
  return root
}

function createTopBar(save: SaveGame): HTMLElement {
  const topBar = document.createElement('header')
  topBar.className = 'world-map-topbar'

  const crest = document.createElement('div')
  crest.className = 'world-map-main-crest'
  crest.textContent = 'SC'

  const titleBlock = document.createElement('div')
  titleBlock.className = 'world-map-title'
  const title = document.createElement('h1')
  title.textContent = 'SPINCORE'
  const subtitle = document.createElement('p')
  subtitle.textContent = 'WORLD MAP *'
  titleBlock.append(title, subtitle)

  const spacer = document.createElement('div')
  spacer.className = 'world-map-topbar-spacer'

  const currency = document.createElement('div')
  currency.className = 'world-map-currency'
  const coin = document.createElement('span')
  coin.textContent = 'SP'
  const amount = document.createElement('strong')
  amount.textContent = save.wallet.money.toLocaleString()
  currency.append(coin, amount)

  const teamCrest = document.createElement('div')
  teamCrest.className = 'world-map-team-crest'
  teamCrest.textContent = getInitials(save.team.name)

  topBar.append(crest, titleBlock, spacer, currency, teamCrest)
  return topBar
}

function createMapCanvas(options: {
  save: SaveGame
  league: League
  nextOpponent: OpponentTeam | null
  matchReadiness: TeamRosterReadiness
  rewardNotice?: RewardNotice | null
  onArena: () => void
  onPlayer: () => void
  onLeague: () => void
  onTeam: () => void
  onStore: () => void
}): HTMLElement {
  const canvas = document.createElement('div')
  canvas.className = 'world-map-canvas'

  const art = document.createElement('img')
  art.className = 'world-map-art'
  art.src = '/assets/world-map/world_map_background.png'
  art.alt = ''
  art.decoding = 'async'

  const destinations: WorldMapDestination[] = [
    {
      id: 'arena',
      number: '1',
      title: 'Arena',
      kicker: options.matchReadiness.ready ? 'Next match ready' : 'Roster needed',
      icon: 'A',
      onSelect: options.onArena,
    },
    {
      id: 'player-room',
      number: '2',
      title: 'Player Room',
      kicker: `Lv ${options.save.progression.level} / ${options.save.progression.unspentAttributePoints} pts`,
      icon: 'PR',
      onSelect: options.onPlayer,
    },
    {
      id: 'league-office',
      number: '3',
      title: 'League Office',
      kicker: `${options.save.league.record.wins}-${options.save.league.record.losses} record`,
      icon: 'LO',
      onSelect: options.onLeague,
    },
    {
      id: 'team-office',
      number: '4',
      title: 'Team Office',
      kicker: `${options.matchReadiness.activePlayerCount}/${options.matchReadiness.requiredActivePlayerCount} starters`,
      icon: 'HQ',
      onSelect: options.onTeam,
    },
    {
      id: 'store-row',
      number: '5',
      title: 'Store Row',
      kicker: `$${options.save.wallet.money} funds`,
      icon: 'SR',
      onSelect: options.onStore,
    },
  ]

  canvas.appendChild(art)

  if (options.rewardNotice) {
    canvas.appendChild(createRewardToast(options.rewardNotice))
  }

  for (const destination of destinations) {
    canvas.appendChild(createDestination(destination))
  }

  return canvas
}

function createDestination(destination: WorldMapDestination): HTMLElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `world-map-location is-${destination.id}`
  button.setAttribute('aria-label', `Open ${destination.title}`)
  button.addEventListener('click', destination.onSelect)

  const target = document.createElement('span')
  target.className = 'world-map-location-target'

  const plaque = document.createElement('span')
  plaque.className = 'world-map-plaque'
  const number = document.createElement('strong')
  number.textContent = destination.number
  const label = document.createElement('span')
  label.textContent = destination.title
  const icon = document.createElement('small')
  icon.textContent = destination.icon
  plaque.append(number, label, icon)

  const kicker = document.createElement('em')
  kicker.textContent = destination.kicker

  button.append(target, plaque, kicker)
  return button
}

function createBottomHud(options: {
  save: SaveGame
  league: League
  nextOpponent: OpponentTeam | null
  matchReadiness: TeamRosterReadiness
  onArena: () => void
  onStatus: () => void
}): HTMLElement {
  const hud = document.createElement('footer')
  hud.className = 'world-map-hud'

  const compass = document.createElement('div')
  compass.className = 'world-map-compass'
  compass.append(document.createElement('span'), document.createElement('i'))

  const tagline = document.createElement('div')
  tagline.className = 'world-map-tagline'
  const lineOne = document.createElement('strong')
  lineOne.textContent = 'Explore, sign, and rise'
  const lineTwo = document.createElement('span')
  lineTwo.textContent = 'through the ranks.'
  tagline.append(lineOne, lineTwo)

  const controls = document.createElement('div')
  controls.className = 'world-map-controls'
  controls.append(
    createControlHint('Move', 'D'),
    createControlHint('Select', 'A'),
    createControlHint('Back', 'B'),
    createSpincoreButton('Status', options.onStatus, {
      tone: 'quiet',
      compact: true,
    }),
  )

  const next = document.createElement('aside')
  next.className = 'world-map-next-card'
  const nextTitle = document.createElement('strong')
  nextTitle.textContent = options.matchReadiness.ready
    ? 'NEXT MATCH'
    : 'ROSTER CHECK'
  const matchup = document.createElement('div')
  matchup.className = 'world-map-matchup'
  matchup.append(
    createMiniCrest(getInitials(options.save.team.name), 'is-user'),
    createVs(),
    createMiniCrest(options.nextOpponent?.shortName ?? 'CPU', 'is-rival'),
  )
  const nextCopy = document.createElement('span')
  nextCopy.textContent = options.matchReadiness.ready
    ? `${options.league.name} vs ${options.nextOpponent?.name ?? 'Rookie Scrappers'}`
    : options.matchReadiness.message
  next.append(nextTitle, matchup, nextCopy)

  const play = createSpincoreButton(
    options.matchReadiness.ready ? 'Play' : 'Fix Roster',
    options.onArena,
    {
      tone: options.matchReadiness.ready ? 'primary' : 'secondary',
      compact: true,
    },
  )
  next.appendChild(play)

  hud.append(compass, tagline, controls, next)
  return hud
}

function createRewardToast(notice: RewardNotice): HTMLElement {
  const toast = document.createElement('aside')
  toast.className = 'world-map-reward-toast'
  const title = document.createElement('strong')
  title.textContent = notice.title
  const details = document.createElement('span')
  details.textContent = notice.details
  toast.append(
    createSpincoreBadge(`+${notice.xp} XP`, 'gold'),
    createSpincoreBadge(`+$${notice.money}`, 'mint'),
    title,
    details,
  )
  return toast
}

function createControlHint(label: string, key: string): HTMLElement {
  const hint = document.createElement('span')
  const badge = document.createElement('b')
  badge.textContent = key
  hint.append(badge, document.createTextNode(label))
  return hint
}

function createMiniCrest(label: string, className: string): HTMLElement {
  const crest = document.createElement('span')
  crest.className = `world-map-mini-crest ${className}`
  crest.textContent = label.slice(0, 3)
  return crest
}

function createVs(): HTMLElement {
  const vs = document.createElement('b')
  vs.textContent = 'VS'
  return vs
}

function getInitials(value: string): string {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || 'SC'
}
