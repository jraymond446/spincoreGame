import type { SaveGame } from './saveTypes'
import { validateSave } from './saveValidation'

export const saveGameKey = 'spincore_save_v1'

export function loadSave(): SaveGame | null {
  try {
    const stored = window.localStorage.getItem(saveGameKey)

    if (!stored) {
      return null
    }

    const parsed: unknown = JSON.parse(stored)
    const save = validateSave(parsed)

    if (!save) {
      console.warn(
        '[Save Load Error]',
        new Error('Stored save did not pass validation.'),
      )
    } else if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      parsed.version !== save.version
    ) {
      window.localStorage.setItem(saveGameKey, JSON.stringify(save))
    }

    return save
  } catch (error) {
    console.warn('[Save Load Error]', error)
    return null
  }
}

export function saveGame(save: SaveGame): SaveGame | null {
  try {
    const next = validateSave({
      ...structuredClone(save),
      updatedAt: new Date().toISOString(),
    })

    if (!next) {
      throw new Error('Refused to write invalid save data.')
    }

    window.localStorage.setItem(saveGameKey, JSON.stringify(next))
    return next
  } catch (error) {
    console.warn('[Save Write Error]', error)
    return null
  }
}

export function resetSave(): void {
  try {
    window.localStorage.removeItem(saveGameKey)
  } catch (error) {
    console.warn('[Save Write Error]', error)
  }
}

export function updateSave(
  mutator: (draft: SaveGame) => void,
): SaveGame | null {
  const current = loadSave()

  if (!current) {
    return null
  }

  const draft = structuredClone(current)
  mutator(draft)
  return saveGame(draft)
}
