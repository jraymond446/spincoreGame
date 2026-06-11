import Phaser from 'phaser'
import { gameConfig } from '../game/config/gameConfig'
import {
  applyDraftSettings,
  clearSavedLabSettings,
  saveDraftSettings,
} from '../game/lab/LabApplyController'
import { labEvents } from '../game/lab/LabEvents'
import { LabPanel } from '../game/lab/LabPanel'
import {
  getLabState,
  replaceLabState,
  setLabMode,
} from '../game/lab/LabState'
import { applyLabSettings } from '../game/lab/applyLabSettings'
import { loadLabSettings } from '../game/lab/labStorage'
import {
  clearMatchLaunchConfig,
  setMatchLaunchConfig,
  type MatchLaunchConfig,
} from '../match/MatchLaunchConfig'

export class GameHost {
  private readonly root: HTMLElement
  private readonly gameRoot: HTMLDivElement
  private readonly labRoot: HTMLDivElement
  private readonly resizeObserver: ResizeObserver
  private game: Phaser.Game | null = null
  private labPanel: LabPanel | null = null
  private destroyed = false

  constructor(options: {
    root: HTMLElement
    launch: MatchLaunchConfig
    onExit: () => void
  }) {
    this.root = options.root
    this.root.replaceChildren()
    setMatchLaunchConfig(options.launch)
    this.prepareLabState(options.launch.mode === 'lab')

    const host = document.createElement('main')
    host.className =
      `game-host ${options.launch.mode === 'lab' ? 'has-lab' : ''}`.trim()
    const shell = document.createElement('div')
    shell.id = 'game-shell'
    this.gameRoot = document.createElement('div')
    this.gameRoot.id = 'game-root'
    const hudRoot = document.createElement('div')
    hudRoot.id = 'hud-root'
    hudRoot.setAttribute('aria-live', 'polite')
    const exitButton = document.createElement('button')
    exitButton.type = 'button'
    exitButton.className = 'match-menu-button'
    exitButton.textContent = 'MENU'
    exitButton.addEventListener('click', options.onExit)
    shell.append(this.gameRoot, hudRoot, exitButton)
    this.labRoot = document.createElement('div')
    this.labRoot.id = 'lab-root'
    host.append(shell, this.labRoot)
    this.root.appendChild(host)

    if (options.launch.mode === 'lab') {
      this.labPanel = new LabPanel(this.labRoot, {
        onApply: (state) => applyDraftSettings(state),
        onSave: (state) => saveDraftSettings(state),
        onResetSaved: () => clearSavedLabSettings(),
        onResetMatch: () => {
          window.dispatchEvent(new CustomEvent(labEvents.resetMatch))
        },
        onResetCore: () => {
          window.dispatchEvent(new CustomEvent(labEvents.resetCore))
        },
      })
    }

    this.game = new Phaser.Game({
      ...gameConfig,
      parent: this.gameRoot,
    })
    this.resizeObserver = new ResizeObserver(this.syncViewport)
    this.resizeObserver.observe(this.gameRoot)
    window.visualViewport?.addEventListener(
      'resize',
      this.syncViewport,
    )
    window.addEventListener('resize', this.syncViewport)
    window.addEventListener('orientationchange', this.syncViewport)
    this.syncViewport()
    window.requestAnimationFrame(this.syncViewport)
  }

  destroy(): void {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    window.visualViewport?.removeEventListener(
      'resize',
      this.syncViewport,
    )
    window.removeEventListener('resize', this.syncViewport)
    window.removeEventListener('orientationchange', this.syncViewport)
    this.resizeObserver.disconnect()
    this.labPanel?.destroy()
    this.labPanel = null
    this.game?.destroy(true)
    this.game = null
    clearMatchLaunchConfig()
    this.root.replaceChildren()
  }

  private prepareLabState(showLab: boolean): void {
    const savedLabSettings = loadLabSettings()

    if (savedLabSettings) {
      replaceLabState(savedLabSettings)
    }

    if (!showLab) {
      setLabMode('match3v3')
    }

    try {
      applyLabSettings(getLabState())
    } catch (error) {
      console.error(
        '[Lab Apply Error] Unable to apply startup settings.',
        error,
      )
    }
  }

  private syncViewport = (): void => {
    const viewport = window.visualViewport
    const width = Math.max(
      1,
      Math.round(viewport?.width ?? window.innerWidth),
    )
    const height = Math.max(
      1,
      Math.round(viewport?.height ?? window.innerHeight),
    )

    document.documentElement.style.setProperty(
      '--app-width',
      `${width}px`,
    )
    document.documentElement.style.setProperty(
      '--app-height',
      `${height}px`,
    )

    if (!this.game) {
      return
    }

    const bounds = this.gameRoot.getBoundingClientRect()
    this.game.scale.resize(
      Math.max(1, Math.round(bounds.width)),
      Math.max(1, Math.round(bounds.height)),
    )
  }
}

