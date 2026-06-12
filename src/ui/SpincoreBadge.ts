export function createSpincoreBadge(
  label: string,
  tone: 'navy' | 'gold' | 'blue' | 'rose' | 'mint' = 'navy',
): HTMLSpanElement {
  const badge = document.createElement('span')
  badge.className = `spincore-badge is-${tone}`
  badge.textContent = label
  return badge
}
