export function createBootScreen(): HTMLElement {
  const root = document.createElement('main')
  root.className = 'app-boot-screen'
  const mark = document.createElement('div')
  mark.className = 'app-logo-mark'
  mark.textContent = 'SC'
  const title = document.createElement('h1')
  title.textContent = 'SPINCORE'
  const status = document.createElement('p')
  status.textContent = 'Loading circuit profile...'
  root.append(mark, title, status)
  return root
}

