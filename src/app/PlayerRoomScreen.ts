import type { SaveGame } from '../save/saveTypes'

type PlayerRoomDestination = {
  id: 'closet' | 'weight-rack' | 'gear-chest' | 'laptop'
  title: string
  detail: string
  onSelect: () => void
}

export function createPlayerRoomScreen(options: {
  save: SaveGame
  onBack: () => void
  onCloset: () => void
  onAttributes: () => void
  onItems: () => void
  onStats: () => void
}): HTMLElement {
  const root = document.createElement('main')
  root.className = 'player-room-screen'

  const frame = document.createElement('section')
  frame.className = 'player-room-frame'

  const artFrame = document.createElement('picture')
  artFrame.className = 'player-room-art-frame'
  const mobileArt = document.createElement('source')
  mobileArt.media = '(max-width: 620px)'
  mobileArt.srcset = '/assets/player_room/player_room_background_mobile.png'
  const art = document.createElement('img')
  art.className = 'player-room-art'
  art.src = '/assets/player_room/player_room_background.png'
  art.alt = ''
  art.decoding = 'async'
  artFrame.append(mobileArt, art)

  const heading = document.createElement('header')
  heading.className = 'player-room-heading'
  const eyebrow = document.createElement('span')
  eyebrow.textContent = 'HOME BASE'
  const title = document.createElement('strong')
  title.textContent = 'Player Room'
  heading.append(eyebrow, title)

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'player-room-back'
  back.textContent = 'World Map'
  back.setAttribute('aria-label', 'Return to World Map')
  back.addEventListener('click', options.onBack)

  const destinations: PlayerRoomDestination[] = [
    {
      id: 'closet',
      title: 'Closet',
      detail: 'Customize',
      onSelect: options.onCloset,
    },
    {
      id: 'weight-rack',
      title: 'Weight Rack',
      detail: options.save.progression.unspentAttributePoints > 0
        ? `${options.save.progression.unspentAttributePoints} points ready`
        : 'Attributes',
      onSelect: options.onAttributes,
    },
    {
      id: 'gear-chest',
      title: 'Gear Chest',
      detail: 'Items',
      onSelect: options.onItems,
    },
    {
      id: 'laptop',
      title: 'Laptop',
      detail: 'Player stats',
      onSelect: options.onStats,
    },
  ]

  frame.append(artFrame, heading, back)

  for (const destination of destinations) {
    frame.appendChild(createDestination(destination))
  }

  root.appendChild(frame)
  return root
}

function createDestination(destination: PlayerRoomDestination): HTMLElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `player-room-location is-${destination.id}`
  button.setAttribute('aria-label', `Open ${destination.title}: ${destination.detail}`)
  button.addEventListener('click', destination.onSelect)

  const target = document.createElement('span')
  target.className = 'player-room-location-target'

  const plaque = document.createElement('span')
  plaque.className = 'player-room-plaque'
  const marker = document.createElement('i')
  marker.textContent = '+'
  const text = document.createElement('span')
  const title = document.createElement('strong')
  title.textContent = destination.title
  const detail = document.createElement('small')
  detail.textContent = destination.detail
  text.append(title, detail)
  plaque.append(marker, text)

  button.append(target, plaque)
  return button
}
