export type DefensiveVisualState =
  | 'IDLE'
  | 'CHECK_STARTUP'
  | 'CHECK_ACTIVE'
  | 'CHECK_RECOVERY'
  | 'SWIPE_STARTUP'
  | 'SWIPE_ACTIVE'
  | 'SWIPE_RECOVERY'

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

