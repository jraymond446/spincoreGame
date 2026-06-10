import { createDefaultLabTuning } from '../config/tuningDefaults'
import type { GameMode } from '../config/gameplayConfig'
import type { LabTuningState } from './LabConfig'
import { labApplyRuntime } from './LabApplyState'
import { labEvents } from './LabEvents'

let activeState = createDefaultLabTuning()

export function getLabState(): LabTuningState {
  return activeState
}

export function replaceLabState(nextState: LabTuningState): void {
  activeState = cloneLabState(nextState)
  notifyLabStateChanged()
}

export function resetLabState(): LabTuningState {
  activeState = createDefaultLabTuning()
  notifyLabStateChanged()
  return cloneLabState(activeState)
}

export function setLabMode(mode: GameMode): void {
  if (activeState.mode === mode) {
    return
  }

  activeState.mode = mode
  notifyLabStateChanged()
}

export function cloneLabState(state: LabTuningState): LabTuningState {
  return structuredClone(state)
}

export function notifyLabStateChanged(): void {
  if (labApplyRuntime.suppressLabChangeEvents) {
    return
  }

  window.dispatchEvent(new CustomEvent(labEvents.stateChanged))
}
