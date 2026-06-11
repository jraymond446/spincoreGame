import {
  createButton,
  createScreenFrame,
} from './ui'

export function createSettingsScreen(options: {
  onBack: () => void
  onOpenLab: () => void
}): HTMLElement {
  const { root, body } = createScreenFrame({
    eyebrow: 'SYSTEM',
    title: 'Settings & Prototype',
    subtitle:
      'Career saves and Lab tuning are isolated. Resetting one does not touch the other.',
    compact: true,
  })
  const panel = document.createElement('section')
  panel.className = 'app-panel settings-panel'
  const title = document.createElement('h2')
  title.textContent = 'Current Controls'
  const copy = document.createElement('p')
  copy.textContent =
    'Desktop: WASD to move, pointer to aim, primary action to gather and shoot, Space or Shift to truck. Mobile controls remain available inside the match.'
  const storage = document.createElement('p')
  storage.className = 'panel-note'
  storage.textContent =
    'Career key: spincore_save_v1 · Lab tuning uses its own versioned storage.'
  panel.append(
    title,
    copy,
    storage,
    createButton('Open Prototype Lab', options.onOpenLab, {
      tone: 'primary',
    }),
  )
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(createButton('Back', options.onBack, { tone: 'quiet' }))
  body.append(panel, actions)
  return root
}

