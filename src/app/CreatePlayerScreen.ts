import { startingStickTypes } from '../equipment/stickTypes'
import {
  accentColorOptions,
  defaultPlayerCosmetics,
  hairColorOptions,
  hairStyleOptions,
  shirtColorOptions,
  skinToneOptions,
} from '../player/playerCosmetics'
import {
  createStartingAttributes,
} from '../save/defaultSave'
import type {
  CreatedPlayer,
  CreatedPlayerArchetype,
  CreatedPlayerAttributes,
  PlayerAttributeKey,
  PlayerCosmetics,
} from '../save/saveTypes'
import {
  playerAttributeMax,
  playerArchetypeKeys,
  playerAttributeKeys,
} from '../save/saveTypes'
import {
  createSpincoreBadge,
  createSpincoreButton,
  createSpincorePanel,
  createSpincorePlayerPreview,
  createSpincoreScreenFrame,
  createSpincoreStickCard,
  createSpincoreStatBar,
  titleCase,
} from '../ui'

const startingPointBudget = 4
const creationAttributeCap = 18

export type CreatePlayerValues = {
  name: string
  jerseyNumber: number
  handedness: CreatedPlayer['handedness']
  archetype: CreatedPlayerArchetype
  cosmetics: PlayerCosmetics
  attributes: CreatedPlayerAttributes
  selectedStickId: string
  unspentStartingPoints: number
}

export function createCreatePlayerScreen(options: {
  onCreate: (values: CreatePlayerValues) => void
}): HTMLElement {
  const { root, body } = createSpincoreScreenFrame({
    eyebrow: 'NEW CIRCUIT ENTRY',
    title: 'Create Your Player',
    subtitle:
      'Build the athlete, tune the six core ratings, and choose how you handle the Core.',
  })
  const form = document.createElement('form')
  form.className = 'player-builder-layout'
  let archetype: CreatedPlayerArchetype = 'striker'
  let baseline = createStartingAttributes(archetype)
  let attributes = structuredClone(baseline)
  let pointsRemaining = startingPointBudget
  let cosmetics = structuredClone(defaultPlayerCosmetics)
  let selectedStickId = startingStickTypes[0].id

  const preview = createSpincorePlayerPreview({
    name: 'ROOKIE',
    jerseyNumber: 13,
    handedness: 'right',
    archetype,
    cosmetics,
    selectedStickId,
  })
  const previewPanel = createSpincorePanel({
    eyebrow: 'LIVE PREVIEW',
    title: 'Your Circuit Look',
    copy: 'Every choice below updates this card immediately.',
    tone: 'featured',
  })
  previewPanel.content.appendChild(preview.element)
  previewPanel.panel.classList.add('player-builder-preview-panel')

  const setupPanel = createSpincorePanel({
    eyebrow: 'PLAYER SETUP',
    title: 'Identity & Attributes',
  })
  setupPanel.panel.classList.add('player-builder-setup')
  const fields = document.createElement('div')
  fields.className = 'player-builder-fields'
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
  const role = createSelect(
    'Archetype',
    playerArchetypeKeys.map((key) => [key, titleCase(key)]),
  )
  fields.append(
    nameField.label,
    numberField.label,
    handedness.label,
    role.label,
  )

  const allocationHeader = document.createElement('div')
  allocationHeader.className = 'player-allocation-header'
  const allocationCopy = document.createElement('div')
  const allocationTitle = document.createElement('strong')
  allocationTitle.textContent = 'Starting Point Allocation'
  const allocationNote = document.createElement('span')
  allocationNote.textContent =
    'Spend now or carry unused points into your career.'
  allocationCopy.append(allocationTitle, allocationNote)
  const pointsBadge = createSpincoreBadge(
    `${pointsRemaining} POINTS`,
    'gold',
  )
  allocationHeader.append(allocationCopy, pointsBadge)
  const attributeList = document.createElement('div')
  attributeList.className = 'player-builder-attributes'
  const error = document.createElement('p')
  error.className = 'form-error'
  error.setAttribute('role', 'alert')
  setupPanel.content.append(
    fields,
    allocationHeader,
    attributeList,
    error,
  )

  const cosmeticPanel = createSpincorePanel({
    eyebrow: 'COSMETICS',
    title: 'Court Style',
    copy: 'Simple now, saved permanently, ready for richer art later.',
  })
  cosmeticPanel.panel.classList.add('player-builder-cosmetics')
  const cosmeticFields = document.createElement('div')
  cosmeticFields.className = 'player-cosmetic-grid'
  const skin = createSelect(
    'Skin tone',
    skinToneOptions.map((value) => [value, titleCase(value)]),
  )
  const hairStyle = createSelect(
    'Hair style',
    hairStyleOptions.map((value) => [value, titleCase(value)]),
  )
  const hairColor = createSelect(
    'Hair color',
    hairColorOptions.map((value) => [value, titleCase(value)]),
  )
  const shirtColor = createSelect(
    'Shirt color',
    shirtColorOptions.map((value) => [value, titleCase(value)]),
  )
  const accentColor = createSelect(
    'Accent color',
    accentColorOptions.map((value) => [value, titleCase(value)]),
  )
  const shortsColor = createSelect(
    'Shorts color',
    shirtColorOptions.map((value) => [value, titleCase(value)]),
  )
  skin.select.value = cosmetics.skinTone
  hairStyle.select.value = cosmetics.hairStyle
  hairColor.select.value = cosmetics.hairColor
  shirtColor.select.value = cosmetics.shirtColor
  accentColor.select.value = cosmetics.accentColor
  shortsColor.select.value = cosmetics.shortsColor
  cosmeticFields.append(
    skin.label,
    hairStyle.label,
    hairColor.label,
    shirtColor.label,
    accentColor.label,
    shortsColor.label,
  )
  cosmeticPanel.content.appendChild(cosmeticFields)

  const stickPanel = createSpincorePanel({
    eyebrow: 'STARTING STICK',
    title: 'Choose Your Handling Style',
    copy: 'Your first stick is free and its modifiers apply in match.',
  })
  stickPanel.panel.classList.add('player-builder-sticks')
  const stickGrid = document.createElement('div')
  stickGrid.className = 'player-stick-selection'
  stickPanel.content.appendChild(stickGrid)

  const currentPreviewData = () => ({
    name: nameField.input.value,
    jerseyNumber: Number(numberField.input.value) || 0,
    handedness: handedness.select.value as CreatedPlayer['handedness'],
    archetype,
    cosmetics,
    selectedStickId,
  })

  const renderAttributes = (): void => {
    pointsBadge.textContent = `${pointsRemaining} POINTS`
    attributeList.replaceChildren(
      ...playerAttributeKeys.map((key) =>
        createAllocationRow(key),
      ),
    )
  }

  const createAllocationRow = (key: PlayerAttributeKey): HTMLElement => {
    const row = document.createElement('div')
    row.className = 'player-allocation-row'
    const stat = createSpincoreStatBar({
      label: titleCase(key),
      value: attributes[key],
      max: playerAttributeMax,
      detail: String(attributes[key]),
    })
    const controls = document.createElement('div')
    controls.className = 'player-allocation-controls'
    const subtract = createSpincoreButton('-', () => {
      if (attributes[key] <= baseline[key]) {
        return
      }
      attributes[key] -= 1
      pointsRemaining += 1
      renderAttributes()
    }, {
      tone: 'quiet',
      compact: true,
      disabled: attributes[key] <= baseline[key],
    })
    subtract.setAttribute('aria-label', `Decrease ${titleCase(key)}`)
    const add = createSpincoreButton('+', () => {
      if (
        pointsRemaining <= 0 ||
        attributes[key] >= Math.min(creationAttributeCap, playerAttributeMax)
      ) {
        return
      }
      attributes[key] += 1
      pointsRemaining -= 1
      renderAttributes()
    }, {
      tone: 'primary',
      compact: true,
      disabled:
        pointsRemaining <= 0 ||
        attributes[key] >= Math.min(creationAttributeCap, playerAttributeMax),
    })
    add.setAttribute('aria-label', `Increase ${titleCase(key)}`)
    controls.append(subtract, add)
    row.append(stat, controls)
    return row
  }

  const renderSticks = (): void => {
    stickGrid.replaceChildren(
      ...startingStickTypes.map((stick) =>
        createSpincoreStickCard(stick, {
          selected: stick.id === selectedStickId,
          onSelect: () => {
            selectedStickId = stick.id
            renderSticks()
            preview.update(currentPreviewData())
          },
        }),
      ),
    )
  }

  const syncCosmetics = (): void => {
    cosmetics = {
      skinTone: skin.select.value as PlayerCosmetics['skinTone'],
      hairStyle: hairStyle.select.value as PlayerCosmetics['hairStyle'],
      hairColor: hairColor.select.value as PlayerCosmetics['hairColor'],
      shirtColor:
        shirtColor.select.value as PlayerCosmetics['shirtColor'],
      accentColor:
        accentColor.select.value as PlayerCosmetics['accentColor'],
      shortsColor:
        shortsColor.select.value as PlayerCosmetics['shortsColor'],
    }
    preview.update(currentPreviewData())
  }

  for (const field of [
    skin.select,
    hairStyle.select,
    hairColor.select,
    shirtColor.select,
    accentColor.select,
    shortsColor.select,
  ]) {
    field.addEventListener('change', syncCosmetics)
  }
  nameField.input.addEventListener('input', () => {
    preview.update(currentPreviewData())
  })
  numberField.input.addEventListener('input', () => {
    preview.update(currentPreviewData())
  })
  handedness.select.addEventListener('change', () => {
    preview.update(currentPreviewData())
  })
  role.select.addEventListener('change', () => {
    archetype = role.select.value as CreatedPlayerArchetype
    baseline = createStartingAttributes(archetype)
    attributes = structuredClone(baseline)
    pointsRemaining = startingPointBudget
    renderAttributes()
    preview.update(currentPreviewData())
  })
  renderAttributes()
  renderSticks()

  const actions = document.createElement('div')
  actions.className = 'app-screen-actions player-builder-actions'
  const submit = createSpincoreButton('Enter the Circuit', () => {
    form.requestSubmit()
  }, { tone: 'primary' })
  actions.append(
    createSpincoreBadge('SAVED LOCALLY', 'mint'),
    submit,
  )
  form.append(
    previewPanel.panel,
    setupPanel.panel,
    cosmeticPanel.panel,
    stickPanel.panel,
    actions,
  )
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
      archetype,
      cosmetics,
      attributes,
      selectedStickId,
      unspentStartingPoints: pointsRemaining,
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
