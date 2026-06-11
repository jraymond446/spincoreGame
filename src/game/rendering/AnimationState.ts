export type DefensiveVisualState =
  | 'IDLE'
  | 'TRUCK_STARTUP'
  | 'TRUCK_ACTIVE'
  | 'TRUCK_RECOVERY'
  | 'KNOCKED_DOWN'
  | 'GETTING_UP'
  | 'SLASH_STARTUP'
  | 'SLASH_ACTIVE'
  | 'SLASH_RECOVERY'

export type PlayerAnimationPose = {
  bodyForwardOffset: number
  bodySideOffset: number
  bodyRotationOffset: number
  bodyScaleX: number
  bodyScaleY: number
  headForwardOffset: number
  shadowScale: number
  stickRotationOffset: number
  stickScaleX: number
  stickScaleY: number
  anticipation: number
  impact: number
}
