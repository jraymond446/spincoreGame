import {
  createStartingAttributes,
} from '../save/defaultSave'
import type {
  CreatedPlayer,
  PlayerVisualPreset,
} from '../save/saveTypes'
import { playerAttributeKeys } from '../save/saveTypes'
import {
  createButton,
  createScreenFrame,
  titleCase,
} from './ui'

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
  const { root, body } = createScreenFrame({
    eyebrow: 'NEW CIRCUIT ENTRY',
    title: 'Create Your Player',
    subtitle:
      'Choose a starting identity. Roles shape the first attribute spread, not your final ceiling.',
  })
  const form = document.createElement('form')
  form.className = 'creation-layout'
  const identity = document.createElement('section')
  identity.className = 'app-panel creation-form'
  const heading = document.createElement('h2')
  heading.textContent = 'Player Card'
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
  identity.append(
    heading,
    nameField.label,
    numberField.label,
    handedness.label,
    role.label,
    visualPreset.label,
    error,
  )

  const attributes = document.createElement('section')
  attributes.className = 'app-panel creation-attributes'
  const attributeHeading = document.createElement('h2')
  attributeHeading.textContent = 'Starting Attributes'
  const roleNote = document.createElement('p')
  roleNote.className = 'panel-note'
  const attributeGrid = document.createElement('div')
  attributeGrid.className = 'attribute-preview-grid'
  attributes.append(attributeHeading, roleNote, attributeGrid)

  const renderAttributes = (): void => {
    const selectedRole =
      role.select.value as CreatedPlayer['primaryRole']
    const values = createStartingAttributes(selectedRole)
    roleNote.textContent =
      `${titleCase(selectedRole)} starts with a specialized, editable foundation.`
    attributeGrid.replaceChildren(
      ...playerAttributeKeys.map((key) => {
        const row = document.createElement('div')
        const label = document.createElement('span')
        label.textContent = titleCase(key)
        const value = document.createElement('strong')
        value.textContent = String(values[key])
        row.append(label, value)
        return row
      }),
    )
  }

  role.select.addEventListener('change', renderAttributes)
  renderAttributes()

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions'
  const submit = createButton('Enter the Circuit', () => {
    form.requestSubmit()
  }, { tone: 'primary' })
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

