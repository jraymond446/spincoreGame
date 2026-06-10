import type { LabTuningState } from './LabConfig'
import {
  getLabApplyDiagnostics,
  labApplyRuntime,
} from './LabApplyState'
import { labEvents } from './LabEvents'
import {
  cloneLabState,
  getLabState,
  notifyLabStateChanged,
  replaceLabState,
} from './LabState'
import {
  resetSavedLabSettings,
  saveLabSettings,
} from './labStorage'
import { sanitizeLabSettings } from './labValidation'
import { applyLabSettings } from './applyLabSettings'

let scheduled = false

export function updateDraftSettings(
  state: LabTuningState,
): LabTuningState {
  return cloneLabState(state)
}

export function applyDraftSettings(state: LabTuningState): void {
  labApplyRuntime.pendingApplySettings = cloneLabState(state)
  labApplyRuntime.applyQueued = true
  labApplyRuntime.lastApplyStatus = 'queued'
  labApplyRuntime.labApplyError = null
  publishDiagnostics()

  if (labApplyRuntime.isApplyingLabSettings || scheduled) {
    return
  }

  scheduled = true
  window.requestAnimationFrame(beginPendingApply)
}

export const queueLabSettingsApply = applyDraftSettings

export function saveDraftSettings(state: LabTuningState): void {
  if (labApplyRuntime.isSavingLabSettings) {
    return
  }

  const startedAt = performance.now()
  labApplyRuntime.isSavingLabSettings = true
  labApplyRuntime.lastSaveStartedAt = Date.now()
  labApplyRuntime.lastSaveStatus = 'saving'
  labApplyRuntime.labSaveError = null
  console.info('[Lab Save] Start')
  publishDiagnostics()

  try {
    const result = sanitizeLabSettings(state)

    if (!saveLabSettings(result.state)) {
      throw new Error('Browser storage rejected the Lab settings.')
    }

    labApplyRuntime.lastSaveStatus = 'saved'
    console.info('[Lab Save] End', {
      sanitizedSettingCount: result.sanitizedSettingCount,
      invalidSettingCount: result.invalidSettingCount,
    })
  } catch (error) {
    labApplyRuntime.lastSaveStatus = 'failed'
    labApplyRuntime.labSaveError = errorMessage(error)
    console.error('[Lab Save Error]', error)
  } finally {
    labApplyRuntime.isSavingLabSettings = false
    labApplyRuntime.lastSaveDurationMs = performance.now() - startedAt
    publishDiagnostics()
  }
}

export function clearSavedLabSettings(): void {
  const startedAt = performance.now()
  labApplyRuntime.isSavingLabSettings = true
  labApplyRuntime.lastSaveStartedAt = Date.now()
  labApplyRuntime.lastSaveStatus = 'saving'
  labApplyRuntime.labSaveError = null
  publishDiagnostics()

  try {
    resetSavedLabSettings()
    labApplyRuntime.lastSaveStatus = 'saved'
    console.info('[Lab Save] Saved settings reset')
  } catch (error) {
    labApplyRuntime.lastSaveStatus = 'failed'
    labApplyRuntime.labSaveError = errorMessage(error)
    console.error('[Lab Save Error]', error)
  } finally {
    labApplyRuntime.isSavingLabSettings = false
    labApplyRuntime.lastSaveDurationMs = performance.now() - startedAt
    publishDiagnostics()
  }
}

function beginPendingApply(): void {
  scheduled = false

  if (labApplyRuntime.isApplyingLabSettings) {
    return
  }

  const pending = labApplyRuntime.pendingApplySettings

  if (!pending) {
    labApplyRuntime.applyQueued = false
    return
  }

  const previous = cloneLabState(getLabState())
  const startedAt = performance.now()
  labApplyRuntime.pendingApplySettings = null
  labApplyRuntime.applyQueued = false
  labApplyRuntime.isApplyingLabSettings = true
  labApplyRuntime.suppressLabEvents = true
  labApplyRuntime.lastApplyStartedAt = Date.now()
  labApplyRuntime.lastApplyStatus = 'applying'
  labApplyRuntime.resetTriggered = false
  labApplyRuntime.labApplyError = null
  console.info('[Lab Apply] Start')
  publishDiagnostics()

  try {
    const result = sanitizeLabSettings(pending)
    const requiresSceneRestart = hasStructuralChanges(previous, result.state)
    labApplyRuntime.sanitizedSettingCount =
      result.sanitizedSettingCount
    labApplyRuntime.invalidSettingCount = result.invalidSettingCount

    if (result.invalidSettingCount > 0) {
      console.warn('[Lab Validation]', result.warnings)
    }

    applyLabSettings(result.state)
    replaceLabState(result.state)
    labApplyRuntime.resetTriggered = requiresSceneRestart
    labApplyRuntime.lastApplyStatus = 'applied'

    if (requiresSceneRestart) {
      window.dispatchEvent(
        new CustomEvent(labEvents.apply, {
          detail: { requiresSceneRestart: true },
        }),
      )
    }

    console.info('[Lab Apply] End', {
      requiresSceneRestart,
      sanitizedSettingCount: result.sanitizedSettingCount,
      invalidSettingCount: result.invalidSettingCount,
    })
  } catch (error) {
    try {
      applyLabSettings(previous)
      replaceLabState(previous)
    } catch (rollbackError) {
      console.error('[Lab Apply Error] Rollback failed.', rollbackError)
    }

    labApplyRuntime.lastApplyStatus = 'failed'
    labApplyRuntime.resetTriggered = false
    labApplyRuntime.labApplyError = errorMessage(error)
    console.error('[Lab Apply Error]', error)
  } finally {
    labApplyRuntime.isApplyingLabSettings = false
    labApplyRuntime.suppressLabEvents = false
    labApplyRuntime.lastApplyDurationMs = performance.now() - startedAt
    notifyLabStateChanged()
    publishDiagnostics()
    scheduleQueuedApply()
  }
}

function scheduleQueuedApply(): void {
  if (!labApplyRuntime.pendingApplySettings || scheduled) {
    return
  }

  scheduled = true
  window.requestAnimationFrame(beginPendingApply)
}

function hasStructuralChanges(
  previous: LabTuningState,
  next: LabTuningState,
): boolean {
  return JSON.stringify({
    mode: previous.mode,
    formations: previous.formations,
    strategies: previous.strategies,
    players: previous.players,
    field: previous.field,
    wall: previous.wall,
    keeperEquipmentType: previous.keeper.keeperEquipmentType,
  }) !== JSON.stringify({
    mode: next.mode,
    formations: next.formations,
    strategies: next.strategies,
    players: next.players,
    field: next.field,
    wall: next.wall,
    keeperEquipmentType: next.keeper.keeperEquipmentType,
  })
}

function publishDiagnostics(): void {
  window.dispatchEvent(
    new CustomEvent(labEvents.applyDiagnostics, {
      detail: getLabApplyDiagnostics(),
    }),
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
