import {
  enforceMinimumSeparation,
  isDeepAttackPosition,
  resolveBehindNetOffBallJob,
  resolveWeakSideLaneSign,
} from './PlaymakingGeometry.ts'

assert(
  isDeepAttackPosition({ x: 0, y: 200 }, { x: 0, y: 0 }, 240),
  'deep attack activates inside its distance',
)
assert(
  !isDeepAttackPosition({ x: 0, y: 260 }, { x: 0, y: 0 }, 240),
  'deep attack remains inactive outside its distance',
)
assert(
  resolveBehindNetOffBallJob({ x: 80, y: 180 }, { x: 0, y: 0 }, 240) ===
    'frontSlot',
  'a deep carrier sends the receiver to the front slot',
)
assert(
  resolveBehindNetOffBallJob({ x: 0, y: 400 }, { x: 0, y: 0 }, 240) ===
    'supportOutlet',
  'a distant carrier retains a safe outlet',
)

const separated = enforceMinimumSeparation(
  { x: 40, y: 0 },
  { x: 0, y: 0 },
  250,
  { x: 0, y: 1 },
)
assertClose(separated.x, 250, 'receiver is pushed outside carrier exclusion')
assertClose(separated.y, 0, 'receiver separation preserves its lane')

const fallback = enforceMinimumSeparation(
  { x: 10, y: 10 },
  { x: 10, y: 10 },
  100,
  { x: 0, y: -1 },
)
assertClose(fallback.x, 10, 'overlapping targets use fallback X')
assertClose(fallback.y, -90, 'overlapping targets use fallback direction')

assert(
  resolveWeakSideLaneSign(300, 500) === 1,
  'left-side carrier creates a right-side receiving lane',
)
assert(
  resolveWeakSideLaneSign(700, 500) === -1,
  'right-side carrier creates a left-side receiving lane',
)

console.info('Playmaking geometry regression cases passed: 10')

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
