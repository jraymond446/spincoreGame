import { getStickType } from '../equipment/stickTypes'
import { getCosmeticCssColor } from '../player/playerCosmetics'
import type {
  CreatedPlayerArchetype,
  PlayerCosmetics,
} from '../save/saveTypes'
import { createSpincoreBadge } from './SpincoreBadge'

export type PlayerPreviewData = {
  name: string
  jerseyNumber: number
  handedness: 'left' | 'right'
  archetype: CreatedPlayerArchetype
  cosmetics: PlayerCosmetics
  selectedStickId: string
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}

export function createSpincorePlayerPreview(
  initial: PlayerPreviewData,
): {
  element: HTMLElement
  update: (data: PlayerPreviewData) => void
} {
  const element = document.createElement('section')
  element.className = 'player-builder-preview'
  const arena = document.createElement('div')
  arena.className = 'player-builder-arena'
  const figure = document.createElement('div')
  figure.className = 'player-builder-figure'
  const shadow = document.createElement('div')
  shadow.className = 'player-builder-shadow'
  const aura = document.createElement('div')
  aura.className = 'player-builder-aura'
  const core = document.createElement('div')
  core.className = 'player-builder-core'
  const head = document.createElement('div')
  head.className = 'player-builder-head'
  const hair = document.createElement('div')
  hair.className = 'player-builder-hair'
  const face = document.createElement('div')
  face.className = 'player-builder-face'
  const arms = document.createElement('div')
  arms.className = 'player-builder-arms'
  arms.append(document.createElement('i'), document.createElement('b'))
  const body = document.createElement('div')
  body.className = 'player-builder-body'
  const number = document.createElement('strong')
  number.className = 'player-builder-number'
  body.appendChild(number)
  const shorts = document.createElement('div')
  shorts.className = 'player-builder-shorts'
  const shoes = document.createElement('div')
  shoes.className = 'player-builder-shoes'
  shoes.append(document.createElement('i'), document.createElement('b'))
  const stick = document.createElement('div')
  stick.className = 'player-builder-stick'
  const stickPocket = document.createElement('span')
  const stickHead = document.createElement('i')
  stick.append(stickPocket, stickHead)
  head.append(hair, face)
  figure.append(shadow, aura, core, shoes, shorts, body, arms, stick, head)
  arena.appendChild(figure)

  const footer = document.createElement('div')
  footer.className = 'player-builder-preview-footer'
  const identity = document.createElement('div')
  const badges = document.createElement('div')
  badges.className = 'spincore-player-badges'
  const name = document.createElement('h2')
  const meta = document.createElement('p')
  identity.append(badges, name, meta)
  const stickName = document.createElement('strong')
  footer.append(identity, stickName)
  element.append(arena, footer)

  const update = (data: PlayerPreviewData): void => {
    const selectedStick = getStickType(data.selectedStickId)
    element.style.setProperty(
      '--preview-skin',
      getCosmeticCssColor('skin', data.cosmetics.skinTone),
    )
    element.style.setProperty(
      '--preview-skin-shade',
      getCosmeticCssColor('skinShade', data.cosmetics.skinTone),
    )
    element.style.setProperty(
      '--preview-hair',
      getCosmeticCssColor('hair', data.cosmetics.hairColor),
    )
    element.style.setProperty(
      '--preview-shirt',
      getCosmeticCssColor('shirt', data.cosmetics.shirtColor),
    )
    element.style.setProperty(
      '--preview-shirt-shade',
      getCosmeticCssColor('shirtShade', data.cosmetics.shirtColor),
    )
    element.style.setProperty(
      '--preview-accent',
      getCosmeticCssColor('accent', data.cosmetics.accentColor),
    )
    element.style.setProperty(
      '--preview-shorts',
      getCosmeticCssColor('shirt', data.cosmetics.shortsColor),
    )
    element.style.setProperty(
      '--preview-shorts-shade',
      getCosmeticCssColor('shirtShade', data.cosmetics.shortsColor),
    )
    hair.dataset.style = data.cosmetics.hairStyle
    figure.dataset.hand = data.handedness
    figure.dataset.stick = selectedStick.visualStyle
    number.textContent = String(data.jerseyNumber)
    name.textContent = data.name.trim() || 'ROOKIE'
    meta.textContent =
      `#${data.jerseyNumber} / ${titleCase(data.handedness)} handed`
    badges.replaceChildren(
      createSpincoreBadge(titleCase(data.archetype), 'blue'),
      createSpincoreBadge(titleCase(data.cosmetics.hairStyle), 'mint'),
    )
    stickName.textContent = selectedStick.name
  }

  update(initial)
  return { element, update }
}
