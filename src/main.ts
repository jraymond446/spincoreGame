import './style.css'
import Phaser from 'phaser'
import { gameConfig } from './game/config/gameConfig'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

app.innerHTML = '<div id="game-root"></div><div id="hud-root" aria-live="polite"></div>'

let game: Phaser.Game | null = null

const syncVisibleViewport = (): void => {
  const viewport = window.visualViewport
  const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth))
  const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight))

  document.documentElement.style.setProperty('--app-width', `${width}px`)
  document.documentElement.style.setProperty('--app-height', `${height}px`)

  if (game) {
    game.scale.resize(width, height)
  }
}

syncVisibleViewport()
game = new Phaser.Game({
  ...gameConfig,
  parent: 'game-root',
})
syncVisibleViewport()

window.visualViewport?.addEventListener('resize', syncVisibleViewport)
window.addEventListener('resize', syncVisibleViewport)
window.addEventListener('orientationchange', syncVisibleViewport)

window.addEventListener('beforeunload', () => {
  window.visualViewport?.removeEventListener('resize', syncVisibleViewport)
  window.removeEventListener('resize', syncVisibleViewport)
  window.removeEventListener('orientationchange', syncVisibleViewport)
  game?.destroy(true)
})
