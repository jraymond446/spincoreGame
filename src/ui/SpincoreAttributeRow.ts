import { createSpincoreButton } from './SpincoreButton'
import { createSpincoreStatBar } from './SpincoreStatBar'

export function createSpincoreAttributeRow(options: {
  label: string
  base: number
  effective: number
  canIncrease: boolean
  max?: number
  onIncrease: () => void
}): HTMLElement {
  const row = document.createElement('div')
  row.className = 'spincore-attribute-row'
  const detail =
    options.effective > options.base
      ? `${options.base} +${options.effective - options.base}`
      : String(options.base)
  const item = options.effective - options.base
  const stat = createSpincoreStatBar({
    label: options.label,
    value: options.effective,
    max: options.max,
    detail,
    segments: {
      base: options.base,
      item,
    },
    detailSegments: {
      base: options.base,
      item,
      total: options.effective,
    },
  })
  const add = createSpincoreButton('+', options.onIncrease, {
    tone: 'primary',
    disabled: !options.canIncrease,
    compact: true,
  })
  add.setAttribute('aria-label', `Increase ${options.label}`)
  row.append(stat, add)
  return row
}
