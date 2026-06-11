import { createDefaultLabTuning } from '../config/tuningDefaults'
import type { LabTuningState } from './LabConfig'
import { sanitizeLabSettings } from './labValidation'

const storageKey = 'spincore:lab-settings:v3'
const legacyStorageKey = 'spincore:lab-settings:v2'
const settingsVersion = 3

type StoredLabSettings = {
  version: number
  settings: unknown
}

export function loadLabSettings(): LabTuningState | null {
  try {
    const current = window.localStorage.getItem(storageKey)
    const legacy = window.localStorage.getItem(legacyStorageKey)

    if (!current && !legacy) {
      return null
    }

    const parsed = JSON.parse(current ?? legacy ?? 'null') as unknown
    const candidate = migrateGameplayDefaults(
      current ? readVersionedSettings(parsed) : parsed,
    )
    const result = sanitizeLabSettings(
      fillMissingSettings(
        candidate,
        createDefaultLabTuning(),
      ),
    )

    if (result.invalidSettingCount > 0) {
      console.warn(
        '[Lab Validation] Saved settings required fallback values.',
        result.warnings,
      )
      if (current) {
        discardStoredSettings()
        return null
      }
    }

    if (!current && legacy) {
      saveLabSettings(result.state)
      window.localStorage.removeItem(legacyStorageKey)
    } else if (current) {
      saveLabSettings(result.state)
    }

    return result.state
  } catch (error) {
    console.error('[Lab Save Error] Unable to load saved settings.', error)
    discardStoredSettings()
    return null
  }
}

export function saveLabSettings(state: LabTuningState): boolean {
  try {
    const plainData = JSON.parse(
      JSON.stringify(state),
    ) as LabTuningState
    const stored: StoredLabSettings = {
      version: settingsVersion,
      settings: plainData,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(stored))
    return true
  } catch (error) {
    console.error('[Lab Save Error] Unable to save Lab settings.', error)
    return false
  }
}

export function resetSavedLabSettings(): void {
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(legacyStorageKey)
}

function readVersionedSettings(parsed: unknown): unknown {
  if (!isStoredLabSettings(parsed) || parsed.version !== settingsVersion) {
    throw new Error('Unsupported or invalid Lab settings schema.')
  }

  return parsed.settings
}

function isStoredLabSettings(value: unknown): value is StoredLabSettings {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'version' in value &&
      'settings' in value,
  )
}

function discardStoredSettings(): void {
  try {
    resetSavedLabSettings()
  } catch {
    // Storage may be unavailable or blocked.
  }
}

function migrateGameplayDefaults(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== 'object') {
    return candidate
  }

  const migrated = structuredClone(candidate) as Record<string, unknown>
  const aiOffense =
    migrated.aiOffense &&
    typeof migrated.aiOffense === 'object'
      ? migrated.aiOffense as Record<string, unknown>
      : null
  const stick =
    migrated.stick &&
    typeof migrated.stick === 'object'
      ? migrated.stick as Record<string, unknown>
      : null

  replaceLegacyDefault(aiOffense, 'aiMaxCarryMs', 2200, 2950)
  replaceLegacyDefault(
    aiOffense,
    'opponentAiForceShotAfterMs',
    2000,
    2450,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiMaxCarryBeforeShotMs',
    2000,
    2450,
  )
  replaceLegacyDefault(aiOffense, 'aiForceShotAfterMs', 2000, 2450)
  replaceLegacyDefault(aiOffense, 'aiSpinDurationMs', 500, 650)
  replaceLegacyDefault(
    aiOffense,
    'aiGoodDirectShotThreshold',
    0.55,
    0.62,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiGoodBankShotThreshold',
    0.45,
    0.55,
  )
  replaceLegacyDefault(
    aiOffense,
    'aiBankShotMinScore',
    0.45,
    0.55,
  )
  replaceLegacyDefault(stick, 'fumbleMs', 2150, 2500)

  return migrated
}

function replaceLegacyDefault(
  values: Record<string, unknown> | null,
  key: string,
  previous: number,
  next: number,
): void {
  if (values?.[key] === previous) {
    values[key] = next
  }
}

function fillMissingSettings(
  candidate: unknown,
  defaults: unknown,
): unknown {
  if (
    !defaults ||
    typeof defaults !== 'object' ||
    Array.isArray(defaults)
  ) {
    return candidate === undefined ? defaults : candidate
  }

  const source =
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? candidate as Record<string, unknown>
      : {}
  const result: Record<string, unknown> = {}

  for (const [key, fallback] of Object.entries(defaults)) {
    result[key] = fillMissingSettings(source[key], fallback)
  }

  return result
}
