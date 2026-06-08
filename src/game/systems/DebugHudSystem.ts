import type { GameMode } from '../config/gameplayConfig'
import { inputConfig } from '../config/inputConfig'
import { viewConfig } from '../config/viewConfig'
import type { Point } from '../data/geometry'
import type {
  FormationId,
  KeeperControlMode,
  PlayerPlayStyle,
  PlayerHandedness,
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
import type { DefensiveActionState } from './DefenseSystem'
import type { MatchFlowState } from './MatchFlowSystem'
import type { KeeperLegalState } from './KeeperAreaSystem'

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
  controlledPlayerHandedness: PlayerHandedness
  handednessMountSign: number
  pocketFacingSign: number
  visualMirrorSign: number
  cradleSocketSign: number
  chargeElapsedMs: number
  chargeNormalized: number
  hardChargeActive: boolean
  releaseForcePreview: number
  cradlePhase: string
  stickVisualRotation: number
  rawInputAimAngle: number
  releaseAimAngle: number
  rawInputAimDirection: Point
  releaseAimDirection: Point
  visualStickDirection: Point
  releaseImpulseDirection: Point | null
  carryPoseAngle: number
  loadbackAngle: number
  carrySocket: Point | null
  desiredCarrySocket: Point | null
  readyStanceOffset: number
  cradleFacingOffset: number
  catchAutoOrientActive: boolean
  coreInCatchAssistRadius: boolean
  recoveryStatus: string
  cradleFailure: CradleFailureReason
  lastInteraction: StickInteractionResult
  formations: Record<TeamSide, FormationId>
  defenseState: DefensiveActionState
  defenseAction: string
  defenseCooldowns: {
    truckMs: number
    slashMs: number
  }
  fumblePressure: number
  fumblePressureNormalized: number
  matchFlowState: MatchFlowState
  matchFlowTimerMs: number
  countdownLabel: string
  lastScorer: TeamSide | null
  carrierBallHandling: number | null
  controlledToughness: number
  defenseTargetId: string | null
  defenseTargetAction: string | null
  defenseTargetToughness: number | null
  defenseTargetBallHandling: number | null
  truckAvailable: boolean
  slashAvailable: boolean
  inputIntent: string
  keeperControlMode: KeeperControlMode
  keeperStyle: PlayerPlayStyle
  keeperTarget: Point
  keeperTargetRatio: number
  keeperHumanBias: Point
  keeperThreatActive: boolean
  keeperAutoSwitchThreat: boolean
  keeperLegalState: KeeperLegalState
  keeperLastViolation: KeeperLegalState
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
      `MATCH    ${state.matchFlowState}\n` +
      `TIMER    ${Math.ceil(state.matchFlowTimerMs)}ms / ${state.countdownLabel}\n` +
      `SCORER   ${state.lastScorer ?? '-'}\n` +
      `Team A Formation: ${state.formations.A}\n` +
      `Team B Formation: ${state.formations.B}\n` +
      `INPUT    ${state.inputMode}\n` +
      `LEFT     ${formatVector(state.leftJoystickVector)}\n` +
      `RIGHT    ${formatVector(state.rightAimVector)}\n` +
      `INTENT   ${state.inputIntent}\n` +
      `PLAYER   ${state.controlledPlayerId} / ${state.controlledPlayerRole}\n` +
      `HAND     ${state.controlledPlayerHandedness.toUpperCase()}\n` +
      `MOUNT    ${signed(state.handednessMountSign)}\n` +
      `POCKET   ${signed(state.pocketFacingSign)}\n` +
      `MIRROR   ${signed(state.visualMirrorSign)}\n` +
      `SOCKET   ${signed(state.cradleSocketSign)}\n` +
      `KEEPER   ${state.keeperStyle} / ${state.keeperControlMode}\n` +
      `K TARGET ${formatVector(state.keeperTarget)} @ ${state.keeperTargetRatio.toFixed(2)}\n` +
      `K BIAS   ${formatVector(state.keeperHumanBias)}\n` +
      `K THREAT ${state.keeperThreatActive ? 'ACTIVE' : 'CLEAR'} / SWITCH ${state.keeperAutoSwitchThreat ? 'HOT' : 'IDLE'}\n` +
      `K LEGAL  ${state.keeperLegalState} / LAST ${state.keeperLastViolation}\n` +
      `STICK    ${state.stickState}\n` +
      `CORE     ${state.coreState}\n` +
      `PHASE    ${state.cradlePhase}\n` +
      `CHARGE   ${Math.round(state.chargeElapsedMs)}ms / ${state.chargeNormalized.toFixed(2)}\n` +
      `HARD     ${state.hardChargeActive ? 'ACTIVE' : 'INACTIVE'}\n` +
      `FORCE    ${state.releaseForcePreview.toFixed(2)}\n` +
      `AUTO     ${state.catchAutoOrientActive ? 'ACTIVE' : 'INACTIVE'}\n` +
      `ASSIST   ${state.coreInCatchAssistRadius ? 'IN RADIUS' : 'OUTSIDE'}\n` +
      `FAIL     ${state.cradleFailure}\n` +
      `CONTACT  ${state.lastInteraction}\n` +
      `DEFENSE  ${state.defenseState}\n` +
      `ACTION   ${state.defenseAction}\n` +
      `TRUCK CD ${Math.ceil(state.defenseCooldowns.truckMs)}ms\n` +
      `SLASH CD ${Math.ceil(state.defenseCooldowns.slashMs)}ms\n` +
      `FUMBLE   ${state.fumblePressure.toFixed(2)} / ${state.fumblePressureNormalized.toFixed(2)}\n` +
      `HANDLING ${state.carrierBallHandling?.toFixed(2) ?? '-'}\n` +
      `TOUGH    ${state.controlledToughness.toFixed(2)}\n` +
      `TARGET   ${state.defenseTargetId ?? '-'} / ${state.defenseTargetAction ?? '-'}\n` +
      `TGT TOUGH ${state.defenseTargetToughness?.toFixed(2) ?? '-'}\n` +
      `TGT HANDLE ${state.defenseTargetBallHandling?.toFixed(2) ?? '-'}\n` +
      `TRUCK    ${state.truckAvailable ? 'READY' : 'LOCKED'}\n` +
      `SLASH    ${state.slashAvailable ? 'READY' : 'LOCKED'}\n` +
      `RECOVERY ${state.recoveryStatus}\n` +
      `RAW AIM  ${signed(state.rawInputAimAngle)} rad\n` +
      `RELEASE  ${signed(state.releaseAimAngle)} rad\n` +
      `RAW DIR  ${formatVector(state.rawInputAimDirection)}\n` +
      `AIM DIR  ${formatVector(state.releaseAimDirection)}\n` +
      `VIS DIR  ${formatVector(state.visualStickDirection)}\n` +
      `IMPULSE  ${formatOptionalVector(state.releaseImpulseDirection)}\n` +
      `CARRY    ${signed(state.carryPoseAngle)} rad\n` +
      `LOADBACK ${signed(state.loadbackAngle)} rad\n` +
      `SOCKET   ${formatOptionalVector(state.carrySocket)}\n` +
      `DESIRED  ${formatOptionalVector(state.desiredCarrySocket)}\n` +
      `VISUAL   ${state.stickVisualRotation.toFixed(2)}\n` +
      `READY    ${signed(state.readyStanceOffset)} rad\n` +
      `CRADLE   ${signed(state.cradleFacingOffset)} rad\n` +
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

function formatOptionalVector(vector: Point | null): string {
  return vector ? formatVector(vector) : '-'
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
