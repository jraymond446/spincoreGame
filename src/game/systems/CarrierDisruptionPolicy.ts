import type { NormalizedCarrierState } from './CarrierVulnerability.ts'

export type CarrierDisruptionOutcome =
  | 'none'
  | 'interruptCharge'
  | 'fumble'

export function resolveCarrierDisruption(input: {
  normalizedCarrierState: NormalizedCarrierState
  shouldFumble: boolean
  chargeInterruptEnabled: boolean
}): CarrierDisruptionOutcome {
  if (input.shouldFumble) {
    return 'fumble'
  }

  if (
    input.chargeInterruptEnabled &&
    isChargingState(input.normalizedCarrierState)
  ) {
    return 'interruptCharge'
  }

  return 'none'
}

export function isChargingState(
  state: NormalizedCarrierState,
): boolean {
  return (
    state === 'charging' ||
    state === 'highCharge' ||
    state === 'fullyCharged'
  )
}
