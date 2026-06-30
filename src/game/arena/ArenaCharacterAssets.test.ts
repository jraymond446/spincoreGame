import {
  arenaStickDefinitions,
  MAX_ARENA_STICK_POCKET_OFFSET_RADIANS,
  resolveArenaCoreVisualState,
  resolveArenaStickTransform,
} from './ArenaCharacterAssets.ts'

const definition = arenaStickDefinitions['rookie-cesta-01']
const mountTarget = { x: 240, y: 467 }
const rightPocketTarget = { x: 312.5, y: 478 }
const leftPocketTarget = { x: 312.5, y: 456 }
const displaySize = {
  width: definition.canvas.width * definition.displayScale,
  height: definition.canvas.height * definition.displayScale,
}
const neutral = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  1,
)
const right = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  1,
  definition.displayScale,
  rightPocketTarget,
  true,
)
const left = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  -1,
  definition.displayScale,
  leftPocketTarget,
  true,
)
const rotated = resolveArenaStickTransform(
  definition,
  mountTarget,
  Math.PI / 2,
  1,
  definition.displayScale,
  { x: 229, y: 539.5 },
  true,
)
const laggedRight = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  1,
  definition.displayScale,
  rightPocketTarget,
  true,
  0.1,
)
const laggedLeft = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  -1,
  definition.displayScale,
  leftPocketTarget,
  true,
  -0.1,
)
const fullyLoadedRight = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  1,
  definition.displayScale,
  rightPocketTarget,
  true,
  MAX_ARENA_STICK_POCKET_OFFSET_RADIANS,
)

assertClose(definition.displayScale, 0.42, 'default stick render scale')
assertClose(displaySize.width, 67.2, 'default stick display width')
assertClose(displaySize.height, 40.32, 'default stick display height')
assertPoint(neutral.pivot, mountTarget, 'neutral pivot alignment')
assertClose(neutral.scaleX, 0.42, 'neutral scale X')
assertClose(neutral.scaleY, 0.42, 'neutral scale Y')
assert(right.pivot.x > mountTarget.x, 'right-handed aligned pivot preserves authored scale')
assert(left.pivot.x > mountTarget.x, 'left-handed aligned pivot preserves authored scale')
assert(rotated.pivot.y > mountTarget.y, 'rotated aligned pivot preserves authored scale')
assertPoint(right.pocket, rightPocketTarget, 'right-handed pocket alignment')
assertPoint(left.pocket, leftPocketTarget, 'left-handed pocket alignment')
assertPoint(rotated.pocket, { x: 229, y: 539.5 }, 'rotated pocket alignment')
assertPoint(laggedRight.pocket, rightPocketTarget, 'lagged right pocket alignment')
assertPoint(laggedLeft.pocket, leftPocketTarget, 'lagged left pocket alignment')
assertPoint(
  fullyLoadedRight.pocket,
  rightPocketTarget,
  'fully loaded pocket alignment',
)
assert(
  distance(laggedRight.grip, right.grip) < 5,
  'right visual lag keeps grip near the hand',
)
assert(
  distance(laggedLeft.grip, left.grip) < 5,
  'left visual lag keeps grip near the hand',
)
assert(
  distance(fullyLoadedRight.grip, right.grip) < 11,
  'maximum charge load keeps grip within the hand tolerance',
)
assertClose(right.scaleX, 0.42, 'right-handed aligned scale X')
assertClose(right.scaleY, 0.42, 'right-handed aligned scale Y')
assertClose(left.scaleX, 0.42, 'left-handed aligned scale X')
assertClose(left.scaleY, -0.42, 'left-handed aligned scale Y')
assert(right.pocket.y > right.pivot.y, 'right-handed local Y')
assert(left.pocket.y < left.pivot.y, 'left-handed local Y mirror')

assertEqual(
  resolveArenaCoreVisualState({
    possessed: false,
    charge: 0,
    fullyCharged: false,
    released: false,
    disrupted: false,
  }),
  'free',
)
assertEqual(
  resolveArenaCoreVisualState({
    possessed: true,
    charge: 0.5,
    fullyCharged: false,
    released: false,
    disrupted: false,
  }),
  'charging',
)
assertEqual(
  resolveArenaCoreVisualState({
    possessed: true,
    charge: 1,
    fullyCharged: true,
    released: false,
    disrupted: false,
  }),
  'fullyCharged',
)
assertEqual(
  resolveArenaCoreVisualState({
    possessed: false,
    charge: 0.6,
    fullyCharged: false,
    released: true,
    disrupted: false,
  }),
  'released',
)
assertEqual(
  resolveArenaCoreVisualState({
    possessed: false,
    charge: 0,
    fullyCharged: false,
    released: false,
    disrupted: true,
  }),
  'disrupted',
)

console.info('Arena character anchor, scale, and core state cases passed')

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label)
  }
}

function assertEqual(
  actual: string,
  expected: string,
): void {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`)
  }
}

function assertClose(
  actual: number,
  expected: number,
  label: string,
): void {
  assert(
    Math.abs(actual - expected) < 0.000001,
    `${label}: expected ${expected}, got ${actual}`,
  )
}

function assertPoint(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  label: string,
): void {
  const close =
    Math.abs(actual.x - expected.x) < 0.000001 &&
    Math.abs(actual.y - expected.y) < 0.000001
  assert(close, `${label}: ${JSON.stringify(actual)}`)
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
