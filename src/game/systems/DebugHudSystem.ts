import type { GameMode } from '../config/gameplayConfig'
import { inputConfig } from '../config/inputConfig'
import { viewConfig } from '../config/viewConfig'
import type { Point } from '../data/geometry'
import type {
  PlayerRole,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type {
  CorePossessionState,
  CradleFailureReason,
  StickInteractionResult,
} from './StickInteractionSystem'
import type { InputMode } from './PlayerInputController'

type DebugHudState = {
  gameMode: GameMode
  score: Record<TeamSide, number>
  coreState: CorePossessionState
  stickState: StickActionState
  possessionOwner: string | null
  inputMode: InputMode
  leftJoystickVector: Point
  rightAimVector: Point
  controlledPlayerId: string
  controlledPlayerRole: PlayerRole
  chargeElapsedMs: number
  chargeNormalized: number
  releaseForcePreview: number
  cradlePhase: string
  stickVisualRotation: number
  catchAutoOrientActive: boolean
  coreInCatchAssistRadius: boolean
  recoveryStatus: string
  cradleFailure: CradleFailureReason
  lastInteraction: StickInteractionResult
}

type DebugHudActions = {
  onReset: () => void
  onToggleMode: () => void
  onToggleDebug: () => void
}

export class DebugHudSystem {
  private root: HTMLDivElement
  private mini: HTMLDivElement
  private panel: HTMLDivElement
  private readout: HTMLPreElement
  private toggleButton: HTMLButtonElement
  private resetButton: HTMLButtonElement
  private modeButton: HTMLButtonElement
  private actions: DebugHudActions
  private mobile: boolean
  private expanded: boolean

  constructor(hudRoot: HTMLDivElement, actions: DebugHudActions) {
    this.actions = actions
    this.mobile = detectMobileDevice()
    this.expanded = this.mobile
      ? viewConfig.hud.debugHudDefaultExpandedMobile
      : viewConfig.hud.debugHudDefaultExpandedDesktop

    this.root = document.createElement('div')
    this.root.className = 'debug-hud-shell'
    this.root.style.setProperty(
      '--debug-hud-opacity',
      `${viewConfig.hud.debugHudOpacity}`,
    )
    this.root.style.setProperty(
      '--debug-hud-max-height',
      `calc(var(--app-height) * ${
        viewConfig.hud.debugHudMaxHeightPercent / 100
      })`,
    )
    this.root.style.setProperty(
      '--debug-hud-mobile-font-size',
      `${viewConfig.hud.debugHudMobileFontSize}px`,
    )
    this.root.style.right = `calc(${viewConfig.hud.debugPadding.x}px + env(safe-area-inset-right, 0px))`
    this.root.style.top = `calc(${viewConfig.hud.debugPadding.y}px + env(safe-area-inset-top, 0px))`
    this.root.classList.toggle('is-mobile', this.mobile)
    this.root.hidden = this.mobile && !inputConfig.debugTouchHud

    this.toggleButton = this.createButton('DEBUG', 'debug-toggle-button')
    this.mini = document.createElement('div')
    this.mini.className = 'debug-mini-hud'

    this.panel = document.createElement('div')
    this.panel.className = 'debug-hud-panel'
    this.readout = document.createElement('pre')
    this.readout.className = 'debug-hud-readout'
    this.resetButton = this.createButton('RESET', 'debug-reset-button')
    this.modeButton = this.createButton('3V3', 'debug-mode-button')

    const actionsRoot = document.createElement('div')
    actionsRoot.className = 'debug-hud-actions'
    actionsRoot.append(this.resetButton, this.modeButton)
    this.panel.append(this.readout, actionsRoot)
    this.root.append(this.toggleButton, this.mini, this.panel)
    hudRoot.appendChild(this.root)

    this.toggleButton.addEventListener('click', this.handleToggleDebug)
    this.resetButton.addEventListener('click', this.handleReset)
    this.modeButton.addEventListener('click', this.handleToggleMode)
    this.setExpanded(this.expanded)
  }

  isExpanded(): boolean {
    return this.expanded
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded
    this.root.classList.toggle('is-expanded', expanded)
    this.toggleButton.setAttribute('aria-pressed', `${expanded}`)
    this.toggleButton.textContent = expanded ? 'CLOSE' : 'DEBUG'
  }

  update(state: DebugHudState): void {
    this.modeButton.textContent = state.gameMode === 'stickLab' ? '3V3' : 'LAB'
    this.mini.hidden = !viewConfig.hud.debugMiniHud
    this.mini.textContent =
      `${state.gameMode === 'stickLab' ? 'LAB' : '3V3'}  ` +
      `${scoreText(state)}  ${state.stickState}/${state.coreState}`
    this.readout.textContent =
      `MODE     ${state.gameMode === 'stickLab' ? 'STICK LAB' : '3V3'}\n` +
      `SCORE    ${scoreText(state)}\n` +
      `INPUT    ${state.inputMode}\n` +
      `LEFT     ${formatVector(state.leftJoystickVector)}\n` +
      `RIGHT    ${formatVector(state.rightAimVector)}\n` +
      `PLAYER   ${state.controlledPlayerId} / ${state.controlledPlayerRole}\n` +
      `STICK    ${state.stickState}\n` +
      `CORE     ${state.coreState}\n` +
      `PHASE    ${state.cradlePhase}\n` +
      `CHARGE   ${Math.round(state.chargeElapsedMs)}ms / ${state.chargeNormalized.toFixed(2)}\n` +
      `FORCE    ${state.releaseForcePreview.toFixed(2)}\n` +
      `AUTO     ${state.catchAutoOrientActive ? 'ACTIVE' : 'INACTIVE'}\n` +
      `ASSIST   ${state.coreInCatchAssistRadius ? 'IN RADIUS' : 'OUTSIDE'}\n` +
      `FAIL     ${state.cradleFailure}\n` +
      `CONTACT  ${state.lastInteraction}\n` +
      `RECOVERY ${state.recoveryStatus}\n` +
      `VISUAL   ${state.stickVisualRotation.toFixed(2)}\n` +
      `OWNER    ${state.possessionOwner ?? 'LOOSE'}`
  }

  destroy(): void {
    this.toggleButton.removeEventListener('click', this.handleToggleDebug)
    this.resetButton.removeEventListener('click', this.handleReset)
    this.modeButton.removeEventListener('click', this.handleToggleMode)

    for (const button of [
      this.toggleButton,
      this.resetButton,
      this.modeButton,
    ]) {
      button.removeEventListener('pointerdown', stopPointerEvent)
      button.removeEventListener('pointerup', stopPointerEvent)
    }

    this.root.remove()
  }

  private createButton(label: string, className: string): HTMLButtonElement {
    const button = document.createElement('button')

    button.type = 'button'
    button.className = `debug-hud-button ${className}`
    button.textContent = label
    button.addEventListener('pointerdown', stopPointerEvent)
    button.addEventListener('pointerup', stopPointerEvent)
    return button
  }

  private handleToggleDebug = (event: MouseEvent): void => {
    stopMouseEvent(event)
    this.actions.onToggleDebug()
  }

  private handleReset = (event: MouseEvent): void => {
    stopMouseEvent(event)
    this.actions.onReset()
  }

  private handleToggleMode = (event: MouseEvent): void => {
    stopMouseEvent(event)
    this.actions.onToggleMode()
  }
}

function detectMobileDevice(): boolean {
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

function scoreText(state: DebugHudState): string {
  return state.gameMode === 'stickLab'
    ? `GOALS ${state.score.A}`
    : `A ${state.score.A}-${state.score.B} B`
}

function formatVector(vector: Point): string {
  return `${signed(vector.x)}, ${signed(vector.y)}`
}

function signed(value: number): string {
  const rounded = Math.abs(value) < 0.005 ? 0 : value

  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function stopPointerEvent(event: PointerEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

function stopMouseEvent(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
}
