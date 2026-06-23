import {
  arenaStickDefinitions,
  resolveArenaCoreVisualState,
  resolveArenaStickTransform,
} from './ArenaCharacterAssets.ts'

const definition = arenaStickDefinitions['rookie-cesta-01']
const mountTarget = { x: 240, y: 467 }
const rightPocketTarget = { x: 312.5, y: 478 }
const leftPocketTarget = { x: 312.5, y: 456 }
const right = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  1,
  1,
  rightPocketTarget,
  true,
)
const left = resolveArenaStickTransform(
  definition,
  mountTarget,
  0,
  -1,
  1,
  leftPocketTarget,
  true,
)
const rotated = resolveArenaStickTransform(
  definition,
  mountTarget,
  Math.PI / 2,
  1,
  1,
  { x: 229, y: 539.5 },
  true,
)

assertPoint(right.pivot, mountTarget, 'right-handed pivot alignment')
assertPoint(left.pivot, mountTarget, 'left-handed pivot alignment')
assertPoint(rotated.pivot, mountTarget, 'rotated pivot alignment')
assertPoint(right.pocket, rightPocketTarget, 'right-handed pocket alignment')
assertPoint(left.pocket, leftPocketTarget, 'left-handed pocket alignment')
assertPoint(rotated.pocket, { x: 229, y: 539.5 }, 'rotated pocket alignment')
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

console.info('Arena character anchor and core state cases passed: 9')

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
