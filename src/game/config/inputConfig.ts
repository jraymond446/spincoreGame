export type InputModePreference = 'auto' | 'keyboardMouse' | 'touch'

export const inputConfig = {
  mode: 'auto' as InputModePreference,
  movementAcceleration: 8.5,
  debugTouchControls: false,
  debugTouchHud: true,
  touch: {
    movementRegionHeightRatio: 0.82,
    rightSideStartRatio: 0.5,
    joystickRadius: 62,
    joystickKnobRadius: 27,
    joystickMaxDistance: 54,
    joystickFollowThreshold: 1.28,
    aimIndicatorRadius: 35,
    aimDragDeadzone: 18,
    safePadding: 34,
    bottomSafeAreaPadding: 12,
  },
} as const
