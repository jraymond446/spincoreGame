import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type { SaveGame } from '../save/saveTypes'
import {
  characterPortraitOptionsFromAppearance,
  createCharacterPortrait,
} from './CharacterPortrait'
import { createSpincoreBadge } from './SpincoreBadge'

export function createSpincoreCard(
  titleText: string,
  description: string,
): {
  card: HTMLElement
  content: HTMLElement
  actions: HTMLElement
} {
  const card = document.createElement('article')
  card.className = 'app-card spincore-card'
  const content = document.createElement('div')
  content.className = 'app-card-content'
  const title = document.createElement('h2')
  title.textContent = titleText
  const copy = document.createElement('p')
  copy.textContent = description
  const actions = document.createElement('div')
  actions.className = 'app-card-actions'
  content.append(title, copy)
  card.append(content, actions)
  return { card, content, actions }
}

export function createPlayerIdentityCard(
  save: SaveGame,
  options?: { expanded?: boolean },
): HTMLElement {
  const card = document.createElement('article')
  card.className =
    `spincore-player-card ${options?.expanded ? 'is-expanded' : ''}`
  card.style.setProperty(
    '--player-accent',
    cosmeticAccent(save.player.cosmetics.accentColor),
  )
  card.style.setProperty(
    '--player-shirt',
    cosmeticShirt(save.player.cosmetics.shirtColor),
  )
  card.style.setProperty(
    '--player-skin',
    cosmeticSkin(save.player.cosmetics.skinTone),
  )
  const portrait = createCharacterPortrait({
    ...characterPortraitOptionsFromAppearance(save.player.appearance),
    animated: false,
    selected: false,
    size: 'md',
    className: 'spincore-player-portrait',
    label: `${save.player.name} portrait`,
  })
  const identity = document.createElement('div')
  identity.className = 'spincore-player-identity'
  const badges = document.createElement('div')
  badges.className = 'spincore-player-badges'
  badges.append(
    createSpincoreBadge(`LV ${save.progression.level}`, 'gold'),
    createSpincoreBadge(titleCase(save.player.archetype), 'blue'),
  )
  const name = document.createElement('h2')
  name.textContent = save.player.name
  const meta = document.createElement('p')
  meta.textContent =
    `#${save.player.jerseyNumber} / ` +
    `${titleCase(save.player.handedness)} handed`
  identity.append(badges, name, meta)

  const attributes = getEffectivePlayerAttributes(save)
  const leaders = Object.entries(attributes)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  const ratings = document.createElement('div')
  ratings.className = 'spincore-player-ratings'

  for (const [key, value] of leaders) {
    const rating = document.createElement('div')
    const ratingValue = document.createElement('strong')
    ratingValue.textContent = String(value)
    const ratingLabel = document.createElement('span')
    ratingLabel.textContent = titleCase(key)
    rating.append(ratingValue, ratingLabel)
    ratings.appendChild(rating)
  }

  card.append(portrait.element, identity, ratings)
  return card
}

function cosmeticAccent(value: string): string {
  const colors: Record<string, string> = {
    gold: '#f2c84b',
    cyan: '#78e5ff',
    pink: '#e54872',
    navy: '#16324f',
    orange: '#e78c3f',
    lime: '#8fd26e',
  }
  return colors[value] ?? colors.gold
}

function cosmeticShirt(value: string): string {
  const colors: Record<string, string> = {
    cyan: '#25b9c7',
    blue: '#198bd5',
    red: '#df4b4b',
    pink: '#e4588d',
    yellow: '#f2c84b',
    green: '#35a970',
    purple: '#7868ba',
    black: '#253344',
    white: '#f7f3e7',
  }
  return colors[value] ?? colors.cyan
}

function cosmeticSkin(value: string): string {
  const colors: Record<string, string> = {
    light: '#f3cda4',
    tan: '#f0bd91',
    medium: '#c98760',
    brown: '#a96f50',
    dark: '#744836',
  }
  return colors[value] ?? colors.tan
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
