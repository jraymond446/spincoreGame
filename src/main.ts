import './style.css'
import Phaser from 'phaser'
import { gameConfig } from './game/config/gameConfig'
import { LabPanel } from './game/lab/LabPanel'
import { queueLabSettingsApply } from './game/lab/LabApplyController'
import { labEvents } from './game/lab/LabEvents'
import {
  getLabState,
  replaceLabState,
} from './game/lab/LabState'
import { loadLabSettings } from './game/lab/labStorage'
import { applyLabSettings } from './game/lab/applyLabSettings'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

app.innerHTML =
  '<div id="game-shell">' +
  '<div id="game-root"></div>' +
  '<div id="hud-root" aria-live="polite"></div>' +
  '</div>' +
  '<div id="lab-root"></div>'

const gameRoot = document.querySelector<HTMLDivElement>('#game-root')
const labRoot = document.querySelector<HTMLDivElement>('#lab-root')

if (!gameRoot || !labRoot) {
  throw new Error('Missing game or Lab Console root')
}

let game: Phaser.Game | null = null

const syncVisibleViewport = (): void => {
  const viewport = window.visualViewport
  const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth))
  const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight))

  document.documentElement.style.setProperty('--app-width', `${width}px`)
  document.documentElement.style.setProperty('--app-height', `${height}px`)

  if (game) {
    const gameBounds = gameRoot.getBoundingClientRect()
    game.scale.resize(
      Math.max(1, Math.round(gameBounds.width)),
      Math.max(1, Math.round(gameBounds.height)),
    )
  }
}

const savedLabSettings = loadLabSettings()

if (savedLabSettings) {
  replaceLabState(savedLabSettings)
}

try {
  applyLabSettings(getLabState())
} catch (error) {
  console.error('[Lab Apply Error] Unable to apply startup settings.', error)
}

const labPanel = new LabPanel(labRoot, {
  onApply: (state) => {
    queueLabSettingsApply(state)
  },
  onResetMatch: () => {
    window.dispatchEvent(new CustomEvent(labEvents.resetMatch))
  },
  onResetCore: () => {
    window.dispatchEvent(new CustomEvent(labEvents.resetCore))
  },
})

syncVisibleViewport()
game = new Phaser.Game({
  ...gameConfig,
  parent: 'game-root',
})
window.requestAnimationFrame(syncVisibleViewport)

const gameResizeObserver = new ResizeObserver(syncVisibleViewport)
gameResizeObserver.observe(gameRoot)

window.visualViewport?.addEventListener('resize', syncVisibleViewport)
window.addEventListener('resize', syncVisibleViewport)
window.addEventListener('orientationchange', syncVisibleViewport)

window.addEventListener('beforeunload', () => {
  window.visualViewport?.removeEventListener('resize', syncVisibleViewport)
  window.removeEventListener('resize', syncVisibleViewport)
  window.removeEventListener('orientationchange', syncVisibleViewport)
  gameResizeObserver.disconnect()
  labPanel.destroy()
  game?.destroy(true)
})
