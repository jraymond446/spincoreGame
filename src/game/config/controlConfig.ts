import type { KeeperControlMode } from '../data/matchTypes'

export const controlConfig = {
  keeperControlMode: 'keeperOnPossession' as KeeperControlMode,
  autoSwitchOnLooseBall: false,
  looseBallSwitchCooldownMs: 1500,
  controlSwitchCooldownMs: 900,
  minControlOwnershipMs: 1000,
  preventRapidSwitching: true,
  manualSwitchIgnoresCooldown: true,
  possessionSwitchIgnoresCooldown: true,
  autoSwitchDistanceAdvantageRequired: 9999,
  keeperAutoSwitchOnPossession: true,
  keeperAutoSwitchOnThreat: false,
  keeperAutoSwitchOnLooseBall: false,
  keeperPossessionSwitchDelayMs: 0,
  keeperReturnToFieldAfterReleaseMs: 650,
} as const
