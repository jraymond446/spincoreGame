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
  const trackedLines = [save.stats, save.seasonStats]
  const leagueId = save.league.currentLeagueId
  const leagueStats = leagueId ? save.leagueStats[leagueId] : null

  for (const stats of trackedLines) {
    stats.matchesPlayed += 1
  }
  if (leagueStats) {
    leagueStats.matchesPlayed += 1
  }
  const goals = Math.max(0, result?.goals ?? 0)
  const bankShotGoals = Math.max(0, result?.bankShotGoals ?? 0)

  if (result) {
    for (const stats of trackedLines) {
      stats.goals += goals
      stats.assists += Math.max(0, result.assists ?? 0)
      stats.shots += Math.max(0, result.shots ?? 0)
      stats.bankShotGoals += bankShotGoals
      stats.steals += Math.max(0, result.steals ?? 0)
      stats.saves += Math.max(0, result.saves ?? 0)
      stats.turnovers += Math.max(0, result.turnovers ?? 0)
    }
    if (leagueStats) {
      leagueStats.goals += goals
      leagueStats.assists += Math.max(0, result.assists ?? 0)
      leagueStats.bankShotGoals += bankShotGoals
    }

    if (result.won) {
      save.league.record.wins += 1
      save.stats.wins += 1
      save.seasonStats.wins += 1
      if (leagueStats) {
        leagueStats.wins += 1
      }
    } else {
      save.league.record.losses += 1
      save.stats.losses += 1
      save.seasonStats.losses += 1
      if (leagueStats) {
        leagueStats.losses += 1
      }
    }
  }

  const rewards = calculateMatchRewards(result)
  const { xp, money } = rewards
  awardXp(save, xp)
  awardMoney(save, money)
  return rewards
}

export function calculateMatchRewards(
  result: MatchResultRewardInput | null,
): MatchRewardBreakdown {
  const goals = Math.max(0, result?.goals ?? 0)
  const bankShotGoals = Math.max(0, result?.bankShotGoals ?? 0)

  return {
    xp:
      10 + (result?.won ? 20 : 0) + goals * 5 + bankShotGoals * 3,
    money: 5 + (result?.won ? 15 : 0),
    completed: Boolean(result),
    won: result?.won ?? false,
    goals,
    bankShotGoals,
  }
}
