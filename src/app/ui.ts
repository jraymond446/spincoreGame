export function createScreenFrame(options: {
  eyebrow: string
  title: string
  subtitle: string
  compact?: boolean
}): {
  root: HTMLElement
  body: HTMLElement
  header: HTMLElement
} {
  const root = document.createElement('main')
  root.className =
    `app-screen ${options.compact ? 'is-compact' : ''}`.trim()
  const backdrop = document.createElement('div')
  backdrop.className = 'app-screen-backdrop'
  const shell = document.createElement('div')
  shell.className = 'app-screen-shell'
  const header = document.createElement('header')
  header.className = 'app-screen-header'
  const eyebrow = document.createElement('p')
  eyebrow.className = 'app-eyebrow'
  eyebrow.textContent = options.eyebrow
  const title = document.createElement('h1')
  title.textContent = options.title
  const subtitle = document.createElement('p')
  subtitle.className = 'app-subtitle'
  subtitle.textContent = options.subtitle
  const body = document.createElement('div')
  body.className = 'app-screen-body'

  header.append(eyebrow, title, subtitle)
  shell.append(header, body)
  root.append(backdrop, shell)

  return { root, body, header }
}

export function createButton(
  label: string,
  onClick: () => void,
  options?: {
    tone?: 'primary' | 'secondary' | 'danger' | 'quiet'
    disabled?: boolean
  },
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `app-button is-${options?.tone ?? 'secondary'}`
  button.textContent = label
  button.disabled = options?.disabled ?? false
  button.addEventListener('click', onClick)
  return button
}

export function createMetric(
  label: string,
  value: string | number,
  accent = false,
): HTMLElement {
  const metric = document.createElement('div')
  metric.className = `app-metric ${accent ? 'is-accent' : ''}`.trim()
  const valueElement = document.createElement('strong')
  valueElement.textContent = String(value)
  const labelElement = document.createElement('span')
  labelElement.textContent = label
  metric.append(valueElement, labelElement)
  return metric
}

export function createCard(
  titleText: string,
  description: string,
): {
  card: HTMLElement
  content: HTMLElement
  actions: HTMLElement
} {
  const card = document.createElement('article')
  card.className = 'app-card'
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

export function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}

