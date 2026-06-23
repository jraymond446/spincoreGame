import {
  calculateAttendance,
  seededUnit,
  stableSeed,
} from './ArenaAttendance.ts'

const evenRecord = calculateAttendance({
  wins: 5,
  losses: 5,
  baseAttendance: 0.52,
})
const winningRecord = calculateAttendance({
  wins: 10,
  losses: 0,
  baseAttendance: 0.52,
  streak: 4,
  specialMatch: true,
})
const losingRecord = calculateAttendance({
  wins: 0,
  losses: 10,
  baseAttendance: 0.52,
  streak: -4,
})

assert(evenRecord.adjustedWinRate === 0.5, 'even record prior')
assert(
  winningRecord.attendanceRate > evenRecord.attendanceRate,
  'winning record attendance',
)
assert(
  losingRecord.attendanceRate < evenRecord.attendanceRate,
  'losing record attendance',
)
assert(winningRecord.attendanceRate <= 1, 'maximum attendance clamp')
assert(losingRecord.attendanceRate >= 0.08, 'minimum attendance clamp')

const seed = stableSeed('league:rookie:team-a:rookie-scrappers')
assert(seed === stableSeed('league:rookie:team-a:rookie-scrappers'), 'stable seed')
assert(seededUnit(seed, 12) === seededUnit(seed, 12), 'stable seat roll')
assert(seededUnit(seed, 12) !== seededUnit(seed, 13), 'distinct seat rolls')

console.info('Arena attendance and seed cases passed: 8')

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`Arena test failed: ${label}`)
  }
}
