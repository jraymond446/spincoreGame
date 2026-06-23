export const attendanceTuning = {
  priorWins: 5,
  priorGames: 10,
  performanceWeight: 0.48,
  winStreakStep: 0.025,
  lossStreakStep: -0.018,
  maximumStreakGames: 4,
  minimumAttendance: 0.08,
  specialMatchBoost: 0.08,
} as const

export type AttendanceInput = {
  wins: number
  losses: number
  baseAttendance: number
  streak?: number
  specialMatch?: boolean
}

export type AttendanceResult = {
  adjustedWinRate: number
  attendanceRate: number
  streakBoost: number
  specialMatchBoost: number
}

export function calculateAttendance(
  input: AttendanceInput,
): AttendanceResult {
  const gamesPlayed = Math.max(0, input.wins + input.losses)
  const adjustedWinRate =
    (Math.max(0, input.wins) + attendanceTuning.priorWins) /
    (gamesPlayed + attendanceTuning.priorGames)
  const streak = clamp(
    input.streak ?? 0,
    -attendanceTuning.maximumStreakGames,
    attendanceTuning.maximumStreakGames,
  )
  const streakBoost =
    streak >= 0
      ? streak * attendanceTuning.winStreakStep
      : Math.abs(streak) * attendanceTuning.lossStreakStep
  const specialMatchBoost = input.specialMatch
    ? attendanceTuning.specialMatchBoost
    : 0
  const attendanceRate = clamp(
    input.baseAttendance +
      (adjustedWinRate - 0.5) * attendanceTuning.performanceWeight +
      streakBoost +
      specialMatchBoost,
    attendanceTuning.minimumAttendance,
    1,
  )

  return {
    adjustedWinRate,
    attendanceRate,
    streakBoost,
    specialMatchBoost,
  }
}

export function stableSeed(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function seededUnit(seed: number, index: number): number {
  let value = seed + Math.imul(index + 1, 0x9e3779b1)
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  value ^= value >>> 16
  return (value >>> 0) / 0x100000000
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
