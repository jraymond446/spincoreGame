export function createSpincorePanel(options?: {
  title?: string
  eyebrow?: string
  copy?: string
  tone?: 'plain' | 'featured' | 'locked'
}): {
  panel: HTMLElement
  content: HTMLElement
  actions: HTMLElement
} {
  const panel = document.createElement('section')
  panel.className =
    `app-panel spincore-panel is-${options?.tone ?? 'plain'}`
  const content = document.createElement('div')
  content.className = 'spincore-panel-content'
  const actions = document.createElement('div')
  actions.className = 'spincore-panel-actions'

  if (options?.eyebrow) {
    const eyebrow = document.createElement('p')
    eyebrow.className = 'spincore-panel-eyebrow'
    eyebrow.textContent = options.eyebrow
    content.appendChild(eyebrow)
  }

  if (options?.title) {
    const title = document.createElement('h2')
    title.textContent = options.title
    content.appendChild(title)
  }

  if (options?.copy) {
    const copy = document.createElement('p')
    copy.textContent = options.copy
    content.appendChild(copy)
  }

  panel.append(content, actions)
  return { panel, content, actions }
}
