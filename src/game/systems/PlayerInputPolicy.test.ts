import { resolveExplicitSlashAction } from './PlayerInputPolicy.ts'
import { isActionMovementLocked } from './PlayerActionStateSystem.ts'

assertEqual(
  resolveExplicitSlashAction({
    gameplayEnabled: true,
    carrying: false,
    rawExplicitSlashAction: true,
  }),
  'slash',
  'explicit action slashes while off-ball',
)
assertEqual(
  resolveExplicitSlashAction({
    gameplayEnabled: true,
    carrying: true,
    rawExplicitSlashAction: true,
  }),
  'quickRelease',
  'explicit action reaches quick-release mapping while carrying',
)
assertEqual(
  resolveExplicitSlashAction({
    gameplayEnabled: false,
    carrying: true,
    rawExplicitSlashAction: true,
  }),
  'none',
  'explicit action remains disabled while gameplay is disabled',
)
assertEqual(
  resolveExplicitSlashAction({
    gameplayEnabled: true,
    carrying: false,
    rawExplicitSlashAction: false,
  }),
  'none',
  'no raw action produces no contextual action',
)
assertEqual(
  isActionMovementLocked('fumble'),
  true,
  'fumbled carriers briefly lose movement',
)
assertEqual(
  isActionMovementLocked('none'),
  false,
  'normal play keeps movement available',
)

console.log('Player input policy regression cases passed: 6')

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`)
  }
}
