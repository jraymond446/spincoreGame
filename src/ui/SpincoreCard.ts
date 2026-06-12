import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type { SaveGame } from '../save/saveTypes'
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
    `spincore-player-card is-${save.player.visualPreset} ` +
    `${options?.expanded ? 'is-expanded' : ''}`
  const avatar = document.createElement('div')
  avatar.className = 'spincore-player-avatar'
  const jersey = document.createElement('strong')
  jersey.textContent = String(save.player.jerseyNumber)
  avatar.appendChild(jersey)
  const identity = document.createElement('div')
  identity.className = 'spincore-player-identity'
  const badges = document.createElement('div')
  badges.className = 'spincore-player-badges'
  badges.append(
    createSpincoreBadge(`LV ${save.progression.level}`, 'gold'),
    createSpincoreBadge(titleCase(save.player.primaryRole), 'blue'),
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

  card.append(avatar, identity, ratings)
  return card
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
