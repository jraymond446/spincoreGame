import { createDefaultLabTuning } from '../config/tuningDefaults'
import type { GameMode } from '../config/gameplayConfig'
import type { LabTuningState } from './LabConfig'
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

function notifyLabStateChanged(): void {
  window.dispatchEvent(new CustomEvent(labEvents.stateChanged))
}
