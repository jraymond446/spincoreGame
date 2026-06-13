import type { StickType } from '../equipment/stickTypes'
import { createSpincoreBadge } from './SpincoreBadge'

export function createSpincoreStickCard(
  stick: StickType,
  options?: { selected?: boolean; onSelect?: () => void; detailed?: boolean },
): HTMLElement {
  const card = options?.onSelect
    ? document.createElement('button')
    : document.createElement('article')

  if (card instanceof HTMLButtonElement) {
    card.type = 'button'
    const onSelect = options?.onSelect

    if (onSelect) {
      card.addEventListener('click', onSelect)
    }
  }

  card.className =
    `spincore-stick-card is-${stick.visualStyle} ` +
    `${options?.selected ? 'is-selected' : ''} ` +
    `${options?.detailed ? 'is-detailed' : ''}`
  const visual = document.createElement('span')
  visual.className = 'spincore-stick-visual'
  const head = document.createElement('i')
  visual.appendChild(head)
  const copy = document.createElement('span')
  copy.className = 'spincore-stick-copy'
  const name = document.createElement('strong')
  name.textContent = stick.name
  const description = document.createElement('small')
  description.textContent = stick.description
  const modifiers = document.createElement('span')
  modifiers.className = 'spincore-stick-modifiers'

  for (const modifier of stick.summaryModifiers) {
    modifiers.appendChild(
      createSpincoreBadge(
        `${modifier.value > 0 ? '+' : ''}${modifier.value} ${modifier.label}`,
        modifier.value > 0 ? 'mint' : 'rose',
      ),
    )
  }

  copy.append(name, description, modifiers)
  card.append(visual, copy)
  return card
}
