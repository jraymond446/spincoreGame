export type ExplicitSlashActionInput = {
  gameplayEnabled: boolean
  carrying: boolean
  rawExplicitSlashAction: boolean
}

export type ContextualExplicitAction =
  | 'none'
  | 'slash'
  | 'quickRelease'

/**
 * The explicit slash control is contextual: it slashes without possession and
 * performs a quick release/pass while carrying. Carrying must not suppress the
 * input before GameScene assigns that context-specific meaning.
 */
export function resolveExplicitSlashAction(
  input: ExplicitSlashActionInput,
): ContextualExplicitAction {
  if (!input.gameplayEnabled || !input.rawExplicitSlashAction) {
    return 'none'
  }

  return input.carrying ? 'quickRelease' : 'slash'
}
