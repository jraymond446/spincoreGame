import type { DefensiveActionState } from './DefenseSystem'
import type { CorePossessionState } from './StickInteractionSystem'
import type { StickActionState } from '../data/matchTypes'

export type PlayerActionLock =
  | 'none'
  | 'carrier'
  | 'juke'
  | 'slash'
  | 'gather'
  | 'recovery'
  | 'fumble'

export function getPlayerActionLock(
  playerId: string,
  carrierId: string | null,
  coreState: CorePossessionState,
  stickState: StickActionState,
  defenseState: DefensiveActionState,
): PlayerActionLock {
  if (
    playerId === carrierId &&
    (coreState === 'CRADLED_STABLE' ||
      coreState === 'CRADLED_CHARGING' ||
      coreState === 'CRADLED_OVERCHARGED')
  ) {
    return 'carrier'
  }

  if (stickState === 'FUMBLED_COOLDOWN') {
    return 'fumble'
  }

  if (
    defenseState === 'SLASH_STARTUP' ||
    defenseState === 'SLASH_ACTIVE'
  ) {
    return 'slash'
  }

  if (
    defenseState === 'TRUCK_STARTUP' ||
    defenseState === 'TRUCK_ACTIVE'
  ) {
    return 'juke'
  }

  if (
    defenseState === 'SLASH_RECOVERY' ||
    defenseState === 'TRUCK_RECOVERY' ||
    stickState === 'RELEASE_WINDUP' ||
    stickState === 'RELEASE_SWING' ||
    stickState === 'RELEASE_FOLLOW_THROUGH' ||
    stickState === 'SWINGING' ||
    stickState === 'RELEASE_RECOVERY' ||
    stickState === 'RELEASE_COOLDOWN'
  ) {
    return 'recovery'
  }

  if (stickState === 'CATCH_READY') {
    return 'gather'
  }

  return 'none'
}
