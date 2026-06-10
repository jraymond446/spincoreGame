import type { LabTuningState } from './LabConfig'
import { sanitizeLabSettings } from './labValidation'

const storageKey = 'spincore:lab-settings:v2'

export function loadLabSettings(): LabTuningState | null {
  try {
    const serialized = window.localStorage.getItem(storageKey)

    if (!serialized) {
      return null
    }

    const result = sanitizeLabSettings(JSON.parse(serialized))

    if (result.invalidSettingCount > 0) {
      console.warn(
        '[Lab Validation] Saved settings required fallback values.',
        result.warnings,
      )
    }

    return result.state
  } catch (error) {
    console.error('[Lab Apply Error] Unable to load saved settings.', error)
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // Storage may be unavailable or blocked.
    }
    return null
  }
}

export function saveLabSettings(state: LabTuningState): boolean {
  try {
    const plainData = JSON.parse(
      JSON.stringify(state),
    ) as LabTuningState
    window.localStorage.setItem(storageKey, JSON.stringify(plainData))
    return true
  } catch (error) {
    console.error('[Lab Apply Error] Unable to save Lab settings.', error)
    return false
  }
}
