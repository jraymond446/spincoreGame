import type { SaveGame } from './saveTypes'

export type MatchResultRewardInput = {
  won: boolean
  goals: number
  assists?: number
  shots?: number
  bankShotGoals?: number
  steals?: number
  saves?: number
  turnovers?: number
}

export type MatchRewardBreakdown = {
  xp: number
  money: number
  completed: boolean
  won: boolean
  goals: number
  bankShotGoals: number
}

export function awardXp(save: SaveGame, amount: number): void {
  save.progression.xp += Math.max(0, Math.round(amount))
  const nextLevel = 1 + Math.floor(save.progression.xp / 100)

  if (nextLevel > save.progression.level) {
    save.progression.unspentAttributePoints +=
      nextLevel - save.progression.level
    save.progression.level = nextLevel
  }
}

export function awardMoney(save: SaveGame, amount: number): void {
  save.wallet.money += Math.max(0, Math.round(amount))
}

export function addMatchStats(
  save: SaveGame,
  result: MatchResultRewardInput,
): void {
  recordMatchRewards(save, result)
}

export function recordMatchRewards(
  save: SaveGame,
  result: MatchResultRewardInput | null,
): MatchRewardBreakdown {
  save.stats.matchesPlayed += 1
  const goals = Math.max(0, result?.goals ?? 0)
  const bankShotGoals = Math.max(0, result?.bankShotGoals ?? 0)

  if (result) {
    save.stats.goals += goals
    save.stats.assists += Math.max(0, result.assists ?? 0)
    save.stats.shots += Math.max(0, result.shots ?? 0)
    save.stats.bankShotGoals += bankShotGoals
    save.stats.steals += Math.max(0, result.steals ?? 0)
    save.stats.saves += Math.max(0, result.saves ?? 0)
    save.stats.turnovers += Math.max(0, result.turnovers ?? 0)

    if (result.won) {
      save.league.record.wins += 1
    } else {
      save.league.record.losses += 1
    }
  }

  const xp =
    10 + (result?.won ? 20 : 0) + goals * 5 + bankShotGoals * 3
  const money = 5 + (result?.won ? 15 : 0)
  awardXp(save, xp)
  awardMoney(save, money)
  return {
    xp,
    money,
    completed: Boolean(result),
    won: result?.won ?? false,
    goals,
    bankShotGoals,
  }
}
