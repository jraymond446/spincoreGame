export type SpincoreButtonTone =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'quiet'

export function createSpincoreButton(
  label: string,
  onClick: () => void,
  options?: {
    tone?: SpincoreButtonTone
    disabled?: boolean
    compact?: boolean
  },
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className =
    `app-button is-${options?.tone ?? 'secondary'} ` +
    `${options?.compact ? 'is-compact' : ''}`
  button.textContent = label
  button.disabled = options?.disabled ?? false
  button.addEventListener('click', onClick)
  return button
}
