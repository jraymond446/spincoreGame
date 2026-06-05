import './style.css'
import Phaser from 'phaser'
import { gameConfig } from './game/config/gameConfig'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

app.innerHTML = '<div id="game-root"></div><div id="hud-root" aria-live="polite"></div>'

const game = new Phaser.Game({
  ...gameConfig,
  parent: 'game-root',
})

window.addEventListener('beforeunload', () => {
  game.destroy(true)
})
