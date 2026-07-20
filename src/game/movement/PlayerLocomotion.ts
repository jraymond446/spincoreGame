export type LocomotionVector = { x: number; y: number }

export function resolveLocomotionVelocity(input: {
  currentVelocity: LocomotionVector
  movementIntent: LocomotionVector
  maxSpeed: number
  accelerationPerSecond: number
  brakingPerSecond: number
  deltaMs: number
}): LocomotionVector {
  const deltaSeconds = clamp(input.deltaMs / 1000, 0, 0.05)
  const hasMovementIntent =
    Math.hypot(input.movementIntent.x, input.movementIntent.y) > 0.001
  const target = hasMovementIntent
    ? {
        x: input.movementIntent.x * input.maxSpeed,
        y: input.movementIntent.y * input.maxSpeed,
      }
    : { x: 0, y: 0 }
  const rate = hasMovementIntent
    ? input.accelerationPerSecond
    : input.brakingPerSecond

  return moveVectorToward(
    input.currentVelocity,
    target,
    Math.max(0, rate) * deltaSeconds,
  )
}

export function resolveFacingAngle(input: {
  currentAngle: number
  targetAngle: number
  turnRateRadiansPerSecond: number
  deltaMs: number
}): number {
  const deltaSeconds = clamp(input.deltaMs / 1000, 0, 0.05)
  const difference = wrapAngle(input.targetAngle - input.currentAngle)
  const maximumTurn = Math.max(0, input.turnRateRadiansPerSecond) * deltaSeconds

  return wrapAngle(
    input.currentAngle + clamp(difference, -maximumTurn, maximumTurn),
  )
}

function moveVectorToward(
  current: LocomotionVector,
  target: LocomotionVector,
  maximumDelta: number,
): LocomotionVector {
  const deltaX = target.x - current.x
  const deltaY = target.y - current.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance <= maximumDelta || distance <= 0.0001) {
    return { ...target }
  }

  const scale = maximumDelta / distance
  return {
    x: current.x + deltaX * scale,
    y: current.y + deltaY * scale,
  }
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
