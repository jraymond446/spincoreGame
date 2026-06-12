import {
  createSpincoreBadge,
  createSpincoreButton,
  createSpincorePanel,
  createSpincoreScreenFrame,
} from '../ui'

export function createSettingsScreen(options: {
  onBack: () => void
  onOpenLab: () => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'SYSTEM',
    title: 'Settings',
    subtitle: 'Controls, storage boundaries, and prototype access.',
    compact: true,
  })
  const controls = createSpincorePanel({
    eyebrow: 'INPUT',
    title: 'Current Controls',
    copy:
      'Desktop: WASD to move, pointer to aim, primary action to gather ' +
      'and shoot, Space or Shift to truck. Mobile controls remain live in match.',
  })
  controls.content.append(
    createSpincoreBadge('DESKTOP', 'blue'),
    createSpincoreBadge('TOUCH', 'mint'),
  )
  const storage = createSpincorePanel({
    eyebrow: 'STORAGE',
    title: 'Separate Save Channels',
    copy:
      'Career progress and Lab tuning remain isolated. Resetting either one does not touch the other.',
  })
  const storageKeys = document.createElement('div')
  storageKeys.className = 'settings-storage-keys'
  storageKeys.append(
    createStorageKey('Career', 'spincore_save_v1'),
    createStorageKey('Lab', 'spincore_lab_settings_v1'),
  )
  storage.content.appendChild(storageKeys)
  const lab = createSpincorePanel({
    eyebrow: 'PROTOTYPE',
    title: 'Gameplay Lab',
    copy:
      'Open the full tuning console. Lab sessions never award career XP or cash.',
    tone: 'featured',
  })
  lab.actions.append(
    createSpincoreButton('Open Prototype Lab', options.onOpenLab, {
      tone: 'primary',
    }),
  )
  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  actions.append(
    createSpincoreButton('Back', options.onBack, { tone: 'quiet' }),
  )
  body.append(controls.panel, storage.panel, lab.panel, actions)
  return root
}

function createStorageKey(labelText: string, valueText: string): HTMLElement {
  const row = document.createElement('div')
  const label = document.createElement('span')
  label.textContent = labelText
  const value = document.createElement('code')
  value.textContent = valueText
  row.append(label, value)
  return row
}
