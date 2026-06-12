import {
  createStartingAttributes,
} from '../save/defaultSave'
import type {
  CreatedPlayer,
  PlayerVisualPreset,
} from '../save/saveTypes'
import { playerAttributeKeys } from '../save/saveTypes'
import {
  createSpincoreBadge,
  createSpincoreButton,
  createSpincorePanel,
  createSpincoreScreenFrame,
  createSpincoreStatBar,
  titleCase,
} from '../ui'

type CreatePlayerValues = {
  name: string
  jerseyNumber: number
  handedness: CreatedPlayer['handedness']
  primaryRole: CreatedPlayer['primaryRole']
  visualPreset: PlayerVisualPreset
}

export function createCreatePlayerScreen(options: {
  onCreate: (values: CreatePlayerValues) => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'NEW CIRCUIT ENTRY',
    title: 'Create Your Player',
    subtitle:
      'Choose a starting identity. Roles shape the first attribute spread, not your final ceiling.',
  })
  const form = document.createElement('form')
  form.className = 'creation-layout'
  const identityPanel = createSpincorePanel({
    eyebrow: 'IDENTITY',
    title: 'Player Card',
    copy: 'This profile follows you into every career match.',
  })
  const identity = identityPanel.panel
  identity.classList.add('creation-form')
  const nameField = createInput('Player name', 'text', 'ROOKIE')
  nameField.input.maxLength = 24
  nameField.input.required = true
  const numberField = createInput('Jersey number', 'number', '13')
  numberField.input.min = '0'
  numberField.input.max = '99'
  const handedness = createSelect('Handedness', [
    ['right', 'Right'],
    ['left', 'Left'],
  ])
  const role = createSelect('Starting role', [
    ['striker', 'Striker'],
    ['support', 'Support'],
    ['brute', 'Brute'],
    ['keeper', 'Keeper'],
  ])
  const visualPreset = createSelect('Visual preset', [
    ['circuitBlue', 'Circuit Blue'],
    ['solarGold', 'Solar Gold'],
    ['neonRose', 'Neon Rose'],
    ['deepCourt', 'Deep Court'],
  ])
  const error = document.createElement('p')
  error.className = 'form-error'
  error.setAttribute('role', 'alert')
  identityPanel.content.append(
    nameField.label,
    numberField.label,
    handedness.label,
    role.label,
    visualPreset.label,
    error,
  )

  const attributesPanel = createSpincorePanel({
    eyebrow: 'ARCHETYPE',
    title: 'Starting Attributes',
  })
  const attributes = attributesPanel.panel
  attributes.classList.add('creation-attributes')
  const roleNote = document.createElement('p')
  roleNote.className = 'panel-note'
  const attributeGrid = document.createElement('div')
  attributeGrid.className = 'attribute-preview-grid'
  attributesPanel.content.append(roleNote, attributeGrid)

  const renderAttributes = (): void => {
    const selectedRole =
      role.select.value as CreatedPlayer['primaryRole']
    const values = createStartingAttributes(selectedRole)
    roleNote.textContent =
      `${titleCase(selectedRole)} starts with a specialized, editable foundation.`
    attributeGrid.replaceChildren(
      ...playerAttributeKeys.map((key) => {
        const row = createSpincoreStatBar({
          label: titleCase(key),
          value: values[key],
        })
        return row
      }),
    )
  }

  role.select.addEventListener('change', renderAttributes)
  renderAttributes()

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  const submit = createSpincoreButton('Enter the Circuit', () => {
    form.requestSubmit()
  }, { tone: 'primary' })
  actions.prepend(createSpincoreBadge('LOCAL SAVE', 'mint'))
  actions.append(submit)
  form.append(identity, attributes, actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = nameField.input.value.trim()
    const jerseyNumber = Number(numberField.input.value)

    if (name.length < 2) {
      error.textContent = 'Player name must be at least 2 characters.'
      nameField.input.focus()
      return
    }

    if (
      !Number.isInteger(jerseyNumber) ||
      jerseyNumber < 0 ||
      jerseyNumber > 99
    ) {
      error.textContent = 'Jersey number must be between 0 and 99.'
      numberField.input.focus()
      return
    }

    options.onCreate({
      name,
      jerseyNumber,
      handedness:
        handedness.select.value as CreatedPlayer['handedness'],
      primaryRole:
        role.select.value as CreatedPlayer['primaryRole'],
      visualPreset:
        visualPreset.select.value as PlayerVisualPreset,
    })
  })
  body.append(form)
  return root
}

function createInput(
  labelText: string,
  type: string,
  value: string,
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const label = document.createElement('label')
  label.className = 'app-field'
  const span = document.createElement('span')
  span.textContent = labelText
  const input = document.createElement('input')
  input.type = type
  input.value = value
  label.append(span, input)
  return { label, input }
}

function createSelect(
  labelText: string,
  options: Array<[string, string]>,
): { label: HTMLLabelElement; select: HTMLSelectElement } {
  const label = document.createElement('label')
  label.className = 'app-field'
  const span = document.createElement('span')
  span.textContent = labelText
  const select = document.createElement('select')

  for (const [value, text] of options) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = text
    select.appendChild(option)
  }

  label.append(span, select)
  return { label, select }
}
