export function createSpincoreStatBar(options: {
  label: string
  value: number
  max?: number
  detail?: string
  segments?: {
    base: number
    item: number
  }
  detailSegments?: {
    base: number
    item: number
    total: number
  }
}): HTMLElement {
  const row = document.createElement('div')
  row.className = 'spincore-stat-bar'
  const label = document.createElement('span')
  label.textContent = options.label
  const value = document.createElement('strong')
  value.className = 'spincore-stat-value'

  if (options.detailSegments && options.detailSegments.item !== 0) {
    value.classList.add('is-stacked')
    value.setAttribute(
      'aria-label',
      `${options.detailSegments.base} player, ` +
        `${options.detailSegments.item > 0 ? '+' : ''}` +
        `${options.detailSegments.item} items, ` +
        `${options.detailSegments.total} total`,
    )

    const base = document.createElement('span')
    base.className = 'is-player'
    base.textContent = String(options.detailSegments.base)
    const item = document.createElement('span')
    item.className =
      `is-item ${options.detailSegments.item < 0 ? 'is-negative' : ''}`
    item.textContent =
      `${options.detailSegments.item > 0 ? '+' : ''}` +
      String(options.detailSegments.item)
    const total = document.createElement('span')
    total.className = 'is-total'
    total.textContent = `=${options.detailSegments.total}`
    value.append(base, item, total)
  } else {
    value.textContent = options.detail ?? String(options.value)
  }

  const meter = document.createElement('div')
  meter.className = 'attribute-meter'
  const max = options.max ?? 100

  if (options.segments) {
    meter.classList.add('is-stacked')
    const baseWidth = percent(options.segments.base, max)
    const itemWidth = Math.min(
      100 - baseWidth,
      percent(Math.max(0, options.segments.item), max),
    )
    const baseFill = document.createElement('i')
    baseFill.className = 'attribute-meter-base'
    baseFill.style.width = `${baseWidth}%`
    const itemFill = document.createElement('b')
    itemFill.className = 'attribute-meter-item'
    itemFill.style.left = `${baseWidth}%`
    itemFill.style.width = `${itemWidth}%`
    meter.append(baseFill, itemFill)
  } else {
    const fill = document.createElement('i')
    fill.style.width = `${percent(options.value, max)}%`
    meter.appendChild(fill)
  }

  row.append(label, value, meter)
  return row
}

function percent(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return Math.min(100, Math.max(0, value / max * 100))
}
