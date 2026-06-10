import type { LabTuningState } from './LabConfig'
import {
  getLabApplyDiagnostics,
  labApplyRuntime,
} from './LabApplyState'
import { labEvents } from './LabEvents'
import {
  cloneLabState,
  notifyLabStateChanged,
  replaceLabState,
} from './LabState'
import { saveLabSettings } from './labStorage'
import { sanitizeLabSettings } from './labValidation'

let scheduled = false
let activeToken = 0
let watchdogId: number | null = null

export function queueLabSettingsApply(state: LabTuningState): void {
  labApplyRuntime.pendingApplySettings = cloneLabState(state)
  publishDiagnostics()

  if (labApplyRuntime.applyInProgress || scheduled) {
    return
  }

  scheduled = true
  window.requestAnimationFrame(beginPendingApply)
}

export function completeLabSettingsApply(
  token: number,
  resetTriggered: boolean,
): void {
  if (token !== activeToken) {
    return
  }

  clearWatchdog()
  labApplyRuntime.isApplyingLabSettings = false
  labApplyRuntime.applyInProgress = false
  labApplyRuntime.suppressLabChangeEvents = false
  labApplyRuntime.resetTriggered = resetTriggered
  labApplyRuntime.error = null
  console.info('[Lab Apply] End', {
    token,
    resetTriggered,
    sanitizedSettingCount: labApplyRuntime.sanitizedSettingCount,
  })
  notifyLabStateChanged()
  publishDiagnostics()
  scheduleQueuedApply()
}

export function failLabSettingsApply(
  token: number,
  error: unknown,
): void {
  if (token !== activeToken) {
    return
  }

  clearWatchdog()
  const message = error instanceof Error ? error.message : String(error)
  labApplyRuntime.isApplyingLabSettings = false
  labApplyRuntime.applyInProgress = false
  labApplyRuntime.suppressLabChangeEvents = false
  labApplyRuntime.resetTriggered = false
  labApplyRuntime.error = message
  console.error('[Lab Apply Error]', error)
  notifyLabStateChanged()
  publishDiagnostics()
  scheduleQueuedApply()
}

function beginPendingApply(): void {
  scheduled = false

  if (labApplyRuntime.applyInProgress) {
    return
  }

  const pending = labApplyRuntime.pendingApplySettings

  if (!pending) {
    return
  }

  labApplyRuntime.pendingApplySettings = null
  labApplyRuntime.isApplyingLabSettings = true
  labApplyRuntime.applyInProgress = true
  labApplyRuntime.suppressLabChangeEvents = true
  labApplyRuntime.lastApplyTimestamp = Date.now()
  labApplyRuntime.resetTriggered = false
  labApplyRuntime.error = null
  activeToken += 1

  try {
    const result = sanitizeLabSettings(pending)
    labApplyRuntime.sanitizedSettingCount =
      result.sanitizedSettingCount
    labApplyRuntime.invalidSettingCount = result.invalidSettingCount

    if (result.invalidSettingCount > 0) {
      console.warn('[Lab Validation]', result.warnings)
    }

    replaceLabState(result.state)
    saveLabSettings(result.state)
    console.info('[Lab Apply] Start', {
      token: activeToken,
      sanitizedSettingCount: result.sanitizedSettingCount,
      invalidSettingCount: result.invalidSettingCount,
    })
    publishDiagnostics()
    window.dispatchEvent(
      new CustomEvent(labEvents.apply, {
        detail: { token: activeToken },
      }),
    )
    watchdogId = window.setTimeout(() => {
      failLabSettingsApply(
        activeToken,
        new Error('Timed out waiting for the match rebuild.'),
      )
    }, 5000)
  } catch (error) {
    failLabSettingsApply(activeToken, error)
  }
}

function scheduleQueuedApply(): void {
  if (!labApplyRuntime.pendingApplySettings || scheduled) {
    return
  }

  scheduled = true
  window.requestAnimationFrame(beginPendingApply)
}

function publishDiagnostics(): void {
  window.dispatchEvent(
    new CustomEvent(labEvents.applyDiagnostics, {
      detail: getLabApplyDiagnostics(),
    }),
  )
}

function clearWatchdog(): void {
  if (watchdogId === null) {
    return
  }

  window.clearTimeout(watchdogId)
  watchdogId = null
}
