export function createSpincoreStatBar(options: {
  label: string
  value: number
  max?: number
  detail?: string
}): HTMLElement {
  const row = document.createElement('div')
  row.className = 'spincore-stat-bar'
  const label = document.createElement('span')
  label.textContent = options.label
  const value = document.createElement('strong')
  value.textContent = options.detail ?? String(options.value)
  const meter = document.createElement('div')
  meter.className = 'attribute-meter'
  const fill = document.createElement('i')
  fill.style.width =
    `${Math.min(100, (options.value / (options.max ?? 100)) * 100)}%`
  meter.appendChild(fill)
  row.append(label, value, meter)
  return row
}
