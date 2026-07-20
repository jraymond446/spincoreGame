import {
  resolveFacingAngle,
  resolveLocomotionVelocity,
} from './PlayerLocomotion.ts'
import { playerRuntimeConfig } from '../config/playerConfig.ts'

const moving = resolveLocomotionVelocity({
  currentVelocity: { x: 0, y: 0 },
  movementIntent: { x: 1, y: 0 },
  maxSpeed: playerRuntimeConfig.baseMaxSpeed,
  accelerationPerSecond: playerRuntimeConfig.accelerationPerSecond,
  brakingPerSecond: playerRuntimeConfig.brakingPerSecond,
  deltaMs: 16,
})
assertClose(moving.x, 0.608, 'movement accelerates instead of snapping')
assertClose(moving.y, 0, 'movement preserves the intended axis')

const stopped = resolveLocomotionVelocity({
  currentVelocity: { x: 0.5, y: 0 },
  movementIntent: { x: 0, y: 0 },
  maxSpeed: playerRuntimeConfig.baseMaxSpeed,
  accelerationPerSecond: playerRuntimeConfig.accelerationPerSecond,
  brakingPerSecond: playerRuntimeConfig.brakingPerSecond,
  deltaMs: 16,
})
assertClose(stopped.x, 0, 'braking can settle a small velocity in one step')

const reversing = resolveLocomotionVelocity({
  currentVelocity: { x: 5, y: 0 },
  movementIntent: { x: -1, y: 0 },
  maxSpeed: playerRuntimeConfig.baseMaxSpeed,
  accelerationPerSecond: playerRuntimeConfig.accelerationPerSecond,
  brakingPerSecond: playerRuntimeConfig.brakingPerSecond,
  deltaMs: 16,
})
assert(
  reversing.x > 0 && reversing.x < 5,
  'direction reversals brake through momentum instead of flipping instantly',
)

const clampedFrame = resolveLocomotionVelocity({
  currentVelocity: { x: 0, y: 0 },
  movementIntent: { x: 1, y: 0 },
  maxSpeed: playerRuntimeConfig.baseMaxSpeed,
  accelerationPerSecond: playerRuntimeConfig.accelerationPerSecond,
  brakingPerSecond: playerRuntimeConfig.brakingPerSecond,
  deltaMs: 1000,
})
assertClose(clampedFrame.x, 1.9, 'long frames use the capped simulation step')

const facing = resolveFacingAngle({
  currentAngle: 0,
  targetAngle: Math.PI,
  turnRateRadiansPerSecond:
    playerRuntimeConfig.facingTurnRateRadiansPerSecond,
  deltaMs: 16,
})
assertClose(Math.abs(facing), 0.136, 'facing uses a frame-rate-independent turn rate')

console.log('Player locomotion regression cases passed: 6')

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertClose(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`)
  }
}
