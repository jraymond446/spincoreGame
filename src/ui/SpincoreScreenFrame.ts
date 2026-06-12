import { createSpincoreHeader } from './SpincoreHeader'

export function createSpincoreScreenFrame(options: {
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
  const header = createSpincoreHeader(options)
  const body = document.createElement('div')
  body.className = 'app-screen-body'

  shell.append(header, body)
  root.append(backdrop, shell)
  return { root, body, header }
}
