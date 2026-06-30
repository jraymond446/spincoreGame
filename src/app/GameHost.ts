import Phaser from 'phaser'
import { gameConfig } from '../game/config/gameConfig'
import { createDefaultLabTuning } from '../game/config/tuningDefaults'
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
import {
  matchEvents,
  type MatchCompletionDetail,
} from '../match/MatchEvents'
import { MatchLoadingOverlay } from './MatchLoadingOverlay'
import {
  matchLoadingEvents,
  type MatchLoadingSnapshot,
  type MatchSceneReadyDetail,
} from '../game/loading/MatchAssetPreloader'

export class GameHost {
  private readonly root: HTMLElement
  private readonly launch: MatchLaunchConfig
  private readonly shell: HTMLDivElement
  private readonly gameRoot: HTMLDivElement
  private readonly labRoot: HTMLDivElement
  private readonly resizeObserver: ResizeObserver
  private game: Phaser.Game | null = null
  private labPanel: LabPanel | null = null
  private matchCompleteOverlay: HTMLDivElement | null = null
  private destroyed = false
  private readonly exitButton: HTMLButtonElement
  private readonly onExit: () => void
  private readonly onCompleted: (result: MatchCompletionDetail) => void
  private completionHandled = false
  private readonly loadingOverlay: MatchLoadingOverlay
  private preloadReady = false
  private sceneReady = false
  private revealTimer: number | null = null

  constructor(options: {
    root: HTMLElement
    launch: MatchLaunchConfig
    onExit: () => void
    onCompleted: (result: MatchCompletionDetail) => void
  }) {
    this.root = options.root
    this.launch = options.launch
    this.onExit = options.onExit
    this.onCompleted = options.onCompleted
    this.root.replaceChildren()
    setMatchLaunchConfig(options.launch)
    this.prepareLabState(options.launch.mode === 'lab')

    const host = document.createElement('main')
    host.className =
      `game-host ${options.launch.mode === 'lab' ? 'has-lab' : ''}`.trim()
    this.shell = document.createElement('div')
    this.shell.id = 'game-shell'
    this.shell.classList.add('is-match-loading')
    this.gameRoot = document.createElement('div')
    this.gameRoot.id = 'game-root'
    const hudRoot = document.createElement('div')
    hudRoot.id = 'hud-root'
    hudRoot.setAttribute('aria-live', 'polite')
    this.exitButton = document.createElement('button')
    this.exitButton.type = 'button'
    this.exitButton.className = 'match-menu-button'
    this.exitButton.textContent = 'MENU'
    this.exitButton.addEventListener('click', () => {
      this.exitMatch()
    })
    this.shell.append(this.gameRoot, hudRoot, this.exitButton)
    this.labRoot = document.createElement('div')
    this.labRoot.id = 'lab-root'
    host.append(this.shell, this.labRoot)
    this.root.appendChild(host)
    this.loadingOverlay = new MatchLoadingOverlay(this.shell)

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
        onSimulateGoalTop: () => {
          window.dispatchEvent(
            new CustomEvent(labEvents.simulateGoalTop),
          )
        },
        onSimulateGoalBottom: () => {
          window.dispatchEvent(
            new CustomEvent(labEvents.simulateGoalBottom),
          )
        },
      })
    }

    window.addEventListener(
      matchLoadingEvents.state,
      this.handleLoadingState,
    )
    window.addEventListener(
      matchLoadingEvents.sceneReady,
      this.handleSceneReady,
    )

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
    window.addEventListener(
      matchEvents.completed,
      this.handleMatchCompleted,
    )
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
    window.removeEventListener(
      matchEvents.completed,
      this.handleMatchCompleted,
    )
    window.removeEventListener(
      matchLoadingEvents.state,
      this.handleLoadingState,
    )
    window.removeEventListener(
      matchLoadingEvents.sceneReady,
      this.handleSceneReady,
    )
    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer)
      this.revealTimer = null
    }
    this.resizeObserver.disconnect()
    this.labPanel?.destroy()
    this.labPanel = null
    this.matchCompleteOverlay?.remove()
    this.matchCompleteOverlay = null
    this.loadingOverlay.destroy()
    this.game?.destroy(true)
    this.game = null
    clearMatchLaunchConfig()
    this.root.replaceChildren()
  }

  private prepareLabState(showLab: boolean): void {
    const nextState = showLab
      ? loadLabSettings() ?? createDefaultLabTuning()
      : createDefaultLabTuning()

    replaceLabState(nextState)
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

  private handleMatchCompleted = (event: Event): void => {
    if (this.completionHandled) {
      return
    }

    this.completionHandled = true
    const customEvent = event as CustomEvent<MatchCompletionDetail>
    this.showMatchCompleteOverlay(structuredClone(customEvent.detail))
  }

  private handleLoadingState = (event: Event): void => {
    const snapshot = (event as CustomEvent<MatchLoadingSnapshot>).detail
    if (
      snapshot.state === 'loading' &&
      this.shell.classList.contains('is-match-ready')
    ) {
      this.preloadReady = false
      this.sceneReady = false
      this.shell.classList.remove('is-match-ready')
      this.shell.classList.add('is-match-loading')
      this.loadingOverlay.reset(this.shell)
    }
    this.loadingOverlay.update(snapshot)
    this.shell.dataset.matchLoadingState = snapshot.state
    this.shell.dataset.matchFallbackCount = String(snapshot.failures.length)
    if (snapshot.durationMs !== null) {
      this.shell.dataset.matchPreloadMs = snapshot.durationMs.toFixed(1)
    }
    this.preloadReady =
      snapshot.state === 'ready' ||
      snapshot.state === 'failedButPlayable'
    this.tryRevealMatch()
  }

  private handleSceneReady = (event: Event): void => {
    const detail = (event as CustomEvent<MatchSceneReadyDetail>).detail
    this.sceneReady = Number.isFinite(detail.initDurationMs)
    this.shell.dataset.matchInitMs = detail.initDurationMs.toFixed(1)
    this.shell.dataset.matchTextureCount = String(detail.textureCount)
    this.shell.dataset.matchSpectatorCount = String(detail.spectatorCount)
    this.tryRevealMatch()
  }

  private tryRevealMatch(): void {
    if (
      !this.preloadReady ||
      !this.sceneReady ||
      this.revealTimer !== null ||
      this.shell.classList.contains('is-match-ready')
    ) {
      return
    }

    this.loadingOverlay.setFinalizing()
    const arena = getLabState().arenaVisual
    const delayMs =
      this.launch.mode === 'lab' && arena.simulateSlowLoading ? 1200 : 0
    this.revealTimer = window.setTimeout(() => {
      this.revealTimer = null
      const fadeMs = arena.reducedMotion ? 80 : 260
      this.shell.classList.remove('is-match-loading')
      this.shell.classList.add('is-match-ready')
      this.loadingOverlay.reveal(fadeMs)
      window.dispatchEvent(new CustomEvent(matchLoadingEvents.reveal))
    }, delayMs)
  }

  private exitMatch = (): void => {
    this.matchCompleteOverlay?.remove()
    this.matchCompleteOverlay = null
    this.onExit()
  }

  private showMatchCompleteOverlay(detail: MatchCompletionDetail): void {
    this.matchCompleteOverlay?.remove()
    this.exitButton.hidden = true

    const isLab = this.launch.mode === 'lab'
    const won = detail.winner === 'A'
    const winnerName = detail.teamNames[detail.winner]
    const overlay = document.createElement('div')
    overlay.className = 'match-complete-overlay'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Match complete')

    const card = document.createElement('section')
    card.className =
      `match-complete-card ${won ? 'is-win' : 'is-loss'}`.trim()

    const eyebrow = document.createElement('p')
    eyebrow.className = 'match-complete-eyebrow'
    eyebrow.textContent = isLab ? 'LAB RUN COMPLETE' : 'FINAL WHISTLE'

    const title = document.createElement('h2')
    title.textContent = isLab
      ? `${winnerName} wins`
      : won
        ? 'You win'
        : 'Final whistle'

    const score = document.createElement('p')
    score.className = 'match-complete-score'
    score.textContent = `${detail.score.A} - ${detail.score.B}`

    const copy = document.createElement('p')
    copy.className = 'match-complete-copy'
    copy.textContent = isLab
      ? 'The Lab match reached first to five. Reset the run or leave the court cleanly.'
      : 'The match is final. Continue to bank your XP, funds, and career stats.'

    const stats = document.createElement('dl')
    stats.className = 'match-complete-stat-grid'
    const playerStats = detail.playerStats
    const statEntries: Array<[string, number]> = [
      ['Goals', playerStats?.goals ?? detail.playerGoals],
      ['Assists', playerStats?.assists ?? 0],
      ['Shots', playerStats?.shots ?? 0],
      ['Gathers', playerStats?.successfulGathers ?? 0],
      ['Team saves', detail.stats.A.saves],
      ['Team checks', detail.stats.A.checks],
    ]

    for (const [label, value] of statEntries) {
      stats.appendChild(this.createMatchCompleteStat(label, value))
    }

    const actions = document.createElement('div')
    actions.className = 'match-complete-actions'

    if (isLab) {
      actions.append(
        this.createMatchCompleteButton('Run it back', 'primary', () => {
          this.matchCompleteOverlay?.remove()
          this.matchCompleteOverlay = null
          this.exitButton.hidden = false
          this.completionHandled = false
          window.dispatchEvent(new CustomEvent(labEvents.resetMatch))
        }),
        this.createMatchCompleteButton('Main menu', 'secondary', () => {
          this.exitMatch()
        }),
      )
    } else {
      actions.append(
        this.createMatchCompleteButton('Continue to rewards', 'primary', () => {
          actions
            .querySelectorAll('button')
            .forEach((button) => {
              button.disabled = true
            })
          this.onCompleted(structuredClone(detail))
        }),
      )
    }

    card.append(eyebrow, title, score, copy, stats, actions)
    overlay.appendChild(card)
    this.root.appendChild(overlay)
    this.matchCompleteOverlay = overlay
  }

  private createMatchCompleteStat(
    label: string,
    value: number,
  ): HTMLDivElement {
    const item = document.createElement('div')
    const term = document.createElement('dt')
    const description = document.createElement('dd')

    term.textContent = label
    description.textContent = String(value)
    item.append(term, description)
    return item
  }

  private createMatchCompleteButton(
    label: string,
    tone: 'primary' | 'secondary',
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button')

    button.type = 'button'
    button.className = `match-complete-button is-${tone}`
    button.textContent = label
    button.addEventListener('click', onClick)
    return button
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
