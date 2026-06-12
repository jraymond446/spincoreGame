export function createSpincoreHeader(options: {
  eyebrow: string
  title: string
  subtitle: string
}): HTMLElement {
  const header = document.createElement('header')
  header.className = 'app-screen-header spincore-header'
  const copy = document.createElement('div')
  copy.className = 'spincore-header-copy'
  const eyebrow = document.createElement('p')
  eyebrow.className = 'app-eyebrow'
  eyebrow.textContent = options.eyebrow
  const title = document.createElement('h1')
  title.textContent = options.title
  const subtitle = document.createElement('p')
  subtitle.className = 'app-subtitle'
  subtitle.textContent = options.subtitle
  copy.append(eyebrow, title, subtitle)
  header.appendChild(copy)
  return header
}
