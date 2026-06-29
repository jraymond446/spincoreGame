import {
  ArenaProceduralAnimationController,
  arenaProceduralAnimationDefaults,
} from './ArenaProceduralAnimation.ts'

const controller = new ArenaProceduralAnimationController()
let movingBobPeak = 0
let movingFootPeak = 0
let movingSwayPeak = 0
let movingSquashPeak = 0
let shadowScaleMin = 1
let shadowScaleMax = 1
let frame = controller.update(input())

for (let index = 0; index < 90; index += 1) {
  frame = controller.update(input({ velocity: { x: 9, y: 0 } }))
  movingBobPeak = Math.max(movingBobPeak, Math.abs(frame.currentVisualBob))
  movingFootPeak = Math.max(
    movingFootPeak,
    Math.abs(frame.currentVisualFootPhase),
  )
  movingSwayPeak = Math.max(
    movingSwayPeak,
    Math.abs(frame.currentVisualSway),
  )
  movingSquashPeak = Math.max(
    movingSquashPeak,
    Math.abs(frame.currentVisualSquash),
  )
  shadowScaleMin = Math.min(shadowScaleMin, frame.shadowScaleX)
  shadowScaleMax = Math.max(shadowScaleMax, frame.shadowScaleX)
}

assert(frame.movementSpeedVisual > 0.9, 'movement speed smooths to running')
assert(movingBobPeak > 1.5, 'running produces readable body bounce')
assert(movingBobPeak <= 2.25, 'running bounce remains controlled')
assert(movingFootPeak > 0.55, 'running produces alternating foot phase')
assert(
  movingSwayPeak <= 0.055,
  'running lateral sway stays minimal',
)
assert(frame.currentVisualForwardLean > 0.8, 'running leans forward')
assert(movingSquashPeak > 0.02, 'running compresses on stride impact')
assert(shadowScaleMin < 0.95, 'shadow narrows on stride recovery')
assert(shadowScaleMax > 1.05, 'shadow widens on stride impact')
assert(!frame.footShuffleEnabled, 'feet default to off')
assertClose(
  arenaProceduralAnimationDefaults.playerScaleMultiplier,
  0.92,
  'default player visual scale',
)

const planted = controller.update(input({
  velocity: { x: 0, y: 0 },
  stickState: 'CRADLED_CHARGING',
  charge: 0.8,
}))
assert(planted.shadowScaleX > 1, 'charging widens the shadow')

controller.update(input({ aimAngle: 0 }))
const lagged = controller.update(input({ aimAngle: Math.PI / 2 }))
assert(
  Math.abs(lagged.currentStickLagAngle) > 0.02,
  'sharp aim changes produce visual stick lag',
)
assert(
  Math.abs(lagged.currentStickLagAngle) <= 0.11,
  'visual stick lag remains clamped',
)

controller.update(input({ stickState: 'IDLE' }))
const released = controller.update(input({ stickState: 'RELEASE_SWING' }))
assert(released.currentActionPulse > 0.5, 'release emits an action pulse')
assert(Math.abs(released.stickActionAngle) > 0, 'release snaps the stick')

controller.update(input())
const slashed = controller.update(input({ defenseState: 'SLASH_ACTIVE' }))
assert(slashed.currentActionPulse > 0.5, 'slash emits an action pulse')
assert(Math.abs(slashed.stickActionAngle) > 0, 'slash sweeps the stick')

controller.update(input())
const trucked = controller.update(input({ defenseState: 'TRUCK_ACTIVE' }))
assert(trucked.currentActionPulse > 0.6, 'truck emits an action pulse')
assert(trucked.shadowScaleX > 1, 'truck stretches the grounded shadow')

controller.update(input())
const fumbled = controller.update(input({ stickState: 'FUMBLED_COOLDOWN' }))
assert(fumbled.currentActionPulse > 0.4, 'fumble emits a hit pulse')
assert(Math.abs(fumbled.stickActionAngle) > 0, 'fumble knocks the stick back')

const reduced = controller.update(input({
  velocity: { x: 9, y: 0 },
  stickState: 'CRADLED_OVERCHARGED',
  charge: 1,
  reducedMotion: true,
}))
assertClose(reduced.currentVisualBob, 0, 'reduced-motion bob')
assertClose(reduced.currentVisualSway, 0, 'reduced-motion sway')
assertClose(reduced.currentVisualLean, 0, 'reduced-motion lean')
assertClose(reduced.currentStickLagAngle, 0, 'reduced-motion stick lag')
assert(!reduced.footShuffleEnabled, 'reduced motion disables foot shuffle')

const disabled = controller.update(input({
  velocity: { x: 9, y: 0 },
  tuning: { ...arenaProceduralAnimationDefaults, enabled: false },
}))
assertClose(disabled.currentVisualBob, 0, 'disabled bob')
assertClose(disabled.currentActionPulse, 0, 'disabled action pulse')

console.info('Arena procedural animation cases passed')

function input(
  override: Partial<Parameters<ArenaProceduralAnimationController['update']>[0]> = {},
): Parameters<ArenaProceduralAnimationController['update']>[0] {
  return {
    deltaMs: 16.67,
    velocity: { x: 0, y: 0 },
    bodyRotation: 0,
    aimAngle: 0,
    mountSign: 1,
    stickState: 'IDLE',
    defenseState: 'IDLE',
    charge: 0,
    reducedMotion: false,
    tuning: arenaProceduralAnimationDefaults,
    ...override,
  }
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label)
  }
}

function assertClose(actual: number, expected: number, label: string): void {
  assert(
    Math.abs(actual - expected) < 0.000001,
    `${label}: expected ${expected}, got ${actual}`,
  )
}
