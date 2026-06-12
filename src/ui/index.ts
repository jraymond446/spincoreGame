export { createSpincoreAttributeRow } from './SpincoreAttributeRow'
export { createSpincoreBadge } from './SpincoreBadge'
export { createSpincoreButton } from './SpincoreButton'
export {
  createPlayerIdentityCard,
  createSpincoreCard,
} from './SpincoreCard'
export { createSpincoreEquipmentCard } from './SpincoreEquipmentCard'
export { createSpincoreHeader } from './SpincoreHeader'
export { createSpincorePanel } from './SpincorePanel'
export { createSpincoreScreenFrame } from './SpincoreScreenFrame'
export { createSpincoreStatBar } from './SpincoreStatBar'
export { createSpincoreTeamCard } from './SpincoreTeamCard'

export function createSpincoreMetric(
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

export function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
