import {
  ArenaProceduralAnimationController,
  arenaProceduralAnimationDefaults,
  type ReleaseVisualTier,
} from './ArenaProceduralAnimation.ts'

testHoverRun()
testCoreTracking()
testChargeLoad()
testReleaseTiers()
testSlashTimelineAndPriority()
testHandednessMirroring()
testTruckAndDisruption()
testReducedMotion()
testDisabledAnimation()

console.info('Arena procedural animation cases passed')

function testHoverRun(): void {
  const controller = new ArenaProceduralAnimationController()
  let movingBobPeak = 0
  let movingSwayPeak = 0
  let movingSquashPeak = 0
  let shadowScaleMin = 1
  let shadowScaleMax = 1
  let frame = controller.update(input())

  for (let index = 0; index < 120; index += 1) {
    frame = controller.update(input({ velocity: { x: 9, y: 0 } }))
    movingBobPeak = Math.max(movingBobPeak, Math.abs(frame.currentVisualBob))
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

  assert(frame.movementSpeedVisual > 0.9, 'movement smooths to full speed')
  assert(movingBobPeak > 1.25, 'hover-run has readable lift')
  assert(movingBobPeak <= 1.85, 'hover-run bob remains controlled')
  assert(movingSwayPeak < 0.001, 'default hover-run has no lateral waddle')
  assert(frame.currentVisualForwardLean > 1, 'movement leans into travel')
  assert(movingSquashPeak > 0.025, 'movement has subtle compression')
  assert(shadowScaleMin < 0.95, 'shadow narrows during lift')
  assert(shadowScaleMax > 1.05, 'shadow widens on landing')
  assert(!frame.footShuffleEnabled, 'feet default to off')
  assertClose(
    arenaProceduralAnimationDefaults.idleBobAmount,
    0.6,
    'default idle bob',
  )
  assertClose(
    arenaProceduralAnimationDefaults.movementBobAmount,
    1.8,
    'default movement bob',
  )
  assertClose(
    arenaProceduralAnimationDefaults.lateralSwayAmount,
    0,
    'default lateral sway',
  )
}

function testCoreTracking(): void {
  const controller = new ArenaProceduralAnimationController()
  let frame = controller.update(input({ aimAngle: 0 }))

  for (let index = 0; index < 24; index += 1) {
    frame = controller.update(input({
      aimAngle: 0,
      trackingTargetAngle: Math.PI / 2,
      trackingTargetDistance: 120,
    }))
  }

  assertEqual(frame.stickActionState, 'trackCore', 'loose-Core tracking state')
  assert(frame.visualStickAimAngle > 1.2, 'stick turns toward the Core')
  assert(
    Math.abs(frame.currentStickLagAngle) <= degreesToRadians(5) + 0.0001,
    'visual follow error is clamped',
  )

  const carrier = new ArenaProceduralAnimationController()
  for (let index = 0; index < 20; index += 1) {
    frame = carrier.update(input({
      aimAngle: 0,
      trackingTargetAngle: Math.PI / 2,
      possessesCore: true,
      stickState: 'CRADLED_STABLE',
    }))
  }
  assertEqual(frame.stickActionState, 'cradle', 'carrier owns cradle aim')
  assert(
    Math.abs(frame.visualStickAimAngle) < 0.01,
    'carrier follows release aim instead of Core tracking target',
  )
}

function testChargeLoad(): void {
  const controller = new ArenaProceduralAnimationController()
  const quarter = controller.update(input({
    stickState: 'CRADLED_CHARGING',
    charge: 0.25,
    possessesCore: true,
  }))
  const quarterAngle = Math.abs(quarter.stickActionAngle)
  const quarterState = quarter.stickActionState
  const medium = controller.update(input({
    stickState: 'CRADLED_CHARGING',
    charge: 0.6,
    possessesCore: true,
  }))
  const mediumAngle = Math.abs(medium.stickActionAngle)
  const full = controller.update(input({
    stickState: 'CRADLED_OVERCHARGED',
    charge: 1,
    possessesCore: true,
  }))

  assertEqual(quarterState, 'chargeLoad', 'quarter charge uses load state')
  assert(quarterAngle > 0.08, 'quarter charge starts a visible load')
  assert(mediumAngle > quarterAngle * 1.8, 'load angle grows with charge')
  assertEqual(full.stickActionState, 'fullyCharged', 'full charge stabilizes')
  assert(full.shadowScaleX > 1, 'charge plants and widens the shadow')
}

function testReleaseTiers(): void {
  const quick = sampleRelease(0.12)
  const firm = sampleRelease(0.4)
  const heavy = sampleRelease(0.75)
  const full = sampleRelease(1)

  assertEqual(quick.tier, 0, 'quick pass release tier')
  assertEqual(firm.tier, 1, 'firm pass release tier')
  assertEqual(heavy.tier, 2, 'heavy shot release tier')
  assertEqual(full.tier, 3, 'full charge release tier')
  assert(firm.maxAngle > quick.maxAngle, 'firm pass snaps more than quick pass')
  assert(heavy.maxAngle > firm.maxAngle, 'heavy shot snaps more than firm pass')
  assert(full.maxRecoil > heavy.maxRecoil, 'full shot has the strongest recoil')
  assert(quick.maxTrail > 0, 'quick pass produces a restrained snap trail')
  assert(full.maxBurst > 0.25, 'full charge release produces a pocket burst')
}

function testSlashTimelineAndPriority(): void {
  const controller = new ArenaProceduralAnimationController()
  let minAngle = 0
  let maxAngle = 0
  let maxTrail = 0
  let frame = controller.update(input({
    defenseState: 'SLASH_STARTUP',
    trackingTargetAngle: Math.PI / 3,
  }))

  for (let index = 0; index < 28; index += 1) {
    frame = controller.update(input({
      defenseState: index < 7 ? 'SLASH_ACTIVE' : 'IDLE',
      trackingTargetAngle: Math.PI / 3,
    }))
    minAngle = Math.min(minAngle, frame.stickActionAngle)
    maxAngle = Math.max(maxAngle, frame.stickActionAngle)
    maxTrail = Math.max(maxTrail, frame.slashTrailAlpha)
  }

  assert(minAngle < -0.2, 'slash has a visible windup')
  assert(maxAngle > 0.35, 'slash sweeps through the target line')
  assert(maxTrail > 0.35, 'slash sweep emits a short trail')

  const priority = new ArenaProceduralAnimationController()
  priority.update(input({
    stickState: 'CRADLED_CHARGING',
    charge: 0.8,
    possessesCore: true,
  }))
  frame = priority.update(input({
    stickState: 'RELEASE_SWING',
    defenseState: 'SLASH_ACTIVE',
  }))
  assertEqual(frame.stickActionState, 'releaseSnap', 'release owns stick priority')
}

function testTruckAndDisruption(): void {
  const truck = new ArenaProceduralAnimationController().update(input({
    defenseState: 'TRUCK_ACTIVE',
  }))
  assertEqual(truck.stickActionState, 'truckCarry', 'truck pulls stick into carry')
  assert(truck.currentActionPulse > 0.8, 'truck has a strong planted pulse')

  const disrupted = new ArenaProceduralAnimationController().update(input({
    stickState: 'FUMBLED_COOLDOWN',
    trackingTargetAngle: null,
  }))
  assertEqual(disrupted.stickActionState, 'disrupted', 'fumble knocks stick aside')
}

function testHandednessMirroring(): void {
  const rightCharge = new ArenaProceduralAnimationController().update(input({
    mountSign: 1,
    stickState: 'CRADLED_CHARGING',
    charge: 0.6,
    possessesCore: true,
  }))
  const leftCharge = new ArenaProceduralAnimationController().update(input({
    mountSign: -1,
    stickState: 'CRADLED_CHARGING',
    charge: 0.6,
    possessesCore: true,
  }))

  assert(
    rightCharge.stickActionAngle < 0 && leftCharge.stickActionAngle > 0,
    'charge load mirrors with handedness',
  )
  assertClose(
    Math.abs(rightCharge.stickActionAngle),
    Math.abs(leftCharge.stickActionAngle),
    'mirrored charge magnitude',
  )
}

function testReducedMotion(): void {
  const controller = new ArenaProceduralAnimationController()
  let frame = controller.update(input({
    velocity: { x: 9, y: 0 },
    trackingTargetAngle: Math.PI / 2,
    reducedMotion: true,
  }))

  for (let index = 0; index < 20; index += 1) {
    frame = controller.update(input({
      velocity: { x: 9, y: 0 },
      trackingTargetAngle: Math.PI / 2,
      reducedMotion: true,
    }))
  }

  assertClose(frame.currentVisualBob, 0, 'reduced-motion bob')
  assertClose(frame.currentVisualSway, 0, 'reduced-motion sway')
  assertClose(frame.currentVisualLean, 0, 'reduced-motion lean')
  assert(frame.visualStickAimAngle > 1, 'reduced motion keeps functional tracking')
  assertClose(frame.slashTrailAlpha, 0, 'reduced-motion slash trail')
  assertClose(frame.releaseTrailAlpha, 0, 'reduced-motion release trail')
  assert(!frame.footShuffleEnabled, 'reduced motion disables feet')
}

function testDisabledAnimation(): void {
  const frame = new ArenaProceduralAnimationController().update(input({
    velocity: { x: 9, y: 0 },
    trackingTargetAngle: Math.PI / 2,
    tuning: { ...arenaProceduralAnimationDefaults, enabled: false },
  }))
  assertClose(frame.currentVisualBob, 0, 'disabled bob')
  assertClose(frame.currentActionPulse, 0, 'disabled action pulse')
  assertClose(frame.visualStickAimAngle, 0, 'disabled tracking')
}

function sampleRelease(charge: number): {
  tier: ReleaseVisualTier
  maxAngle: number
  maxRecoil: number
  maxTrail: number
  maxBurst: number
} {
  const controller = new ArenaProceduralAnimationController()
  controller.update(input({
    stickState: 'CRADLED_CHARGING',
    charge,
    possessesCore: true,
  }))
  let frame = controller.update(input({ stickState: 'RELEASE_SWING' }))
  let maxAngle = 0
  let maxRecoil = 0
  let maxTrail = 0
  let maxBurst = 0

  for (let index = 0; index < 34; index += 1) {
    frame = controller.update(input({ stickState: 'RELEASE_FOLLOW_THROUGH' }))
    maxAngle = Math.max(maxAngle, Math.abs(frame.stickActionAngle))
    maxRecoil = Math.max(maxRecoil, frame.currentReleaseRecoil)
    maxTrail = Math.max(maxTrail, frame.releaseTrailAlpha)
    maxBurst = Math.max(maxBurst, frame.fullChargeBurstAlpha)
  }

  return {
    tier: frame.releaseTier,
    maxAngle,
    maxRecoil,
    maxTrail,
    maxBurst,
  }
}

function input(
  override: Partial<Parameters<ArenaProceduralAnimationController['update']>[0]> = {},
): Parameters<ArenaProceduralAnimationController['update']>[0] {
  return {
    deltaMs: 16.67,
    velocity: { x: 0, y: 0 },
    bodyRotation: 0,
    aimAngle: 0,
    trackingTargetAngle: null,
    trackingTargetDistance: Number.POSITIVE_INFINITY,
    possessesCore: false,
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

function assertEqual(
  actual: string | number,
  expected: string | number,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

function assertClose(actual: number, expected: number, label: string): void {
  assert(
    Math.abs(actual - expected) < 0.000001,
    `${label}: expected ${expected}, got ${actual}`,
  )
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180
}
