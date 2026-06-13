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
import {
  matchEvents,
  type MatchCompletionDetail,
} from '../match/MatchEvents'
import { calculateMatchRewards } from '../save/progression'
import {
  createSpincoreButton,
  createSpincorePlayerPreview,
} from '../ui'

export type MatchExitSummary = {
  result: MatchCompletionDetail | null
}

export class GameHost {
  private readonly root: HTMLElement
  private readonly gameRoot: HTMLDivElement
  private readonly labRoot: HTMLDivElement
  private readonly resizeObserver: ResizeObserver
  private game: Phaser.Game | null = null
  private labPanel: LabPanel | null = null
  private destroyed = false
  private matchResult: MatchCompletionDetail | null = null
  private readonly exitButton: HTMLButtonElement
  private readonly launch: MatchLaunchConfig
  private readonly onExit: (summary: MatchExitSummary) => void
  private resultOverlay: HTMLElement | null = null

  constructor(options: {
    root: HTMLElement
    launch: MatchLaunchConfig
    onExit: (summary: MatchExitSummary) => void
  }) {
    this.root = options.root
    this.launch = structuredClone(options.launch)
    this.onExit = options.onExit
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
    this.exitButton = document.createElement('button')
    this.exitButton.type = 'button'
    this.exitButton.className = 'match-menu-button'
    this.exitButton.textContent = 'MENU'
    this.exitButton.addEventListener('click', () => {
      this.exitMatch()
    })
    shell.append(this.gameRoot, hudRoot, this.exitButton)
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

  private handleMatchCompleted = (event: Event): void => {
    const customEvent = event as CustomEvent<MatchCompletionDetail>
    this.matchResult = structuredClone(customEvent.detail)
    this.exitButton.hidden = true
    this.resultOverlay?.remove()
    this.resultOverlay = createMatchResultOverlay({
      result: this.matchResult,
      launch: this.launch,
      onExit: this.exitMatch,
    })
    this.gameRoot.parentElement?.appendChild(this.resultOverlay)
  }

  private exitMatch = (): void => {
    this.onExit({ result: this.matchResult })
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

export function createMatchResultOverlay(options: {
  result: MatchCompletionDetail
  launch: MatchLaunchConfig
  onExit: () => void
}): HTMLElement {
  const { result, launch } = options
  const won = result.winner === 'A'
  const rewards = calculateMatchRewards({
    won,
    goals: result.playerGoals,
    bankShotGoals: result.playerBankShotGoals,
  })
  const overlay = document.createElement('section')
  overlay.className =
    `match-result-overlay ${won ? 'is-win' : 'is-loss'}`
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Match results')

  const card = document.createElement('div')
  card.className = 'match-result-card'
  const copy = document.createElement('div')
  copy.className = 'match-result-copy'
  const eyebrow = document.createElement('span')
  eyebrow.className = 'match-result-eyebrow'
  eyebrow.textContent = won ? 'CIRCUIT VICTORY' : 'FINAL WHISTLE'
  const title = document.createElement('h1')
  title.textContent = won ? 'YOU OWNED THE CORE' : 'TOUGH LOSS'
  const finalScore = document.createElement('p')
  finalScore.className = 'match-result-final'
  finalScore.textContent =
    `${result.teamNames.A} ${result.score.A} - ` +
    `${result.score.B} ${result.teamNames.B}`
  copy.append(eyebrow, title, finalScore)

  const teamStats = document.createElement('div')
  teamStats.className = 'match-result-team-stats'
  teamStats.append(
    createResultTeamLine('A', result),
    createResultTeamLine('B', result),
  )

  const rewardStrip = document.createElement('div')
  rewardStrip.className = 'match-result-rewards'
  rewardStrip.append(
    createResultMetric(`+${rewards.xp}`, 'XP GAINED'),
    createResultMetric(`+$${rewards.money}`, 'CREDITS'),
    createResultMetric(
      result.playerGoals,
      result.playerGoals === 1 ? 'YOUR GOAL' : 'YOUR GOALS',
    ),
    createResultMetric(result.playerBankShotGoals, 'BANK GOALS'),
  )

  const returnButton = createSpincoreButton(
    'Back to Main Menu',
    options.onExit,
    { tone: 'primary' },
  )
  returnButton.classList.add('match-result-return')

  const player = launch.saveGameSnapshot?.player
  const character = document.createElement('div')
  character.className =
    `match-result-character ${won ? 'is-celebrating' : 'is-disappointed'}`
  const mood = document.createElement('strong')
  mood.className = 'match-result-mood'
  mood.textContent = won ? 'VICTORY POSE' : 'RUN IT BACK'

  if (player) {
    const preview = createSpincorePlayerPreview({
      name: player.name,
      jerseyNumber: player.jerseyNumber,
      handedness: player.handedness,
      archetype: player.archetype,
      cosmetics: player.cosmetics,
      selectedStickId: player.selectedStickId,
    })
    character.append(preview.element, mood)
  } else {
    const fallback = document.createElement('div')
    fallback.className = 'match-result-fallback-character'
    fallback.textContent = won ? '!' : '...'
    character.append(fallback, mood)
  }

  const summary = document.createElement('div')
  summary.className = 'match-result-summary'
  summary.append(copy, teamStats, rewardStrip, returnButton)
  card.append(character, summary)
  overlay.appendChild(card)
  return overlay
}

function createResultTeamLine(
  side: 'A' | 'B',
  result: MatchCompletionDetail,
): HTMLElement {
  const stats = result.stats[side]
  const line = document.createElement('article')
  line.className = `match-result-team-line is-team-${side.toLowerCase()}`
  const heading = document.createElement('div')
  const name = document.createElement('strong')
  name.textContent = result.teamNames[side]
  const score = document.createElement('b')
  score.textContent = String(result.score[side])
  heading.append(name, score)
  const detail = document.createElement('p')
  detail.textContent =
    `${stats.assists} AST  /  ${stats.checks} CHECKS  /  ` +
    `${stats.saves} SAVES`
  line.append(heading, detail)
  return line
}

function createResultMetric(
  value: string | number,
  label: string,
): HTMLElement {
  const metric = document.createElement('div')
  const strong = document.createElement('strong')
  strong.textContent = String(value)
  const span = document.createElement('span')
  span.textContent = label
  metric.append(strong, span)
  return metric
}
