import type {
  MatchResult,
  MatchRewardItem,
  MatchRewards,
} from '../match/MatchResult'
import { defaultLeagues } from '../league/defaultLeagues.ts'
import type { SaveGame } from './saveTypes'

export type LevelAward = {
  levelsGained: number
  previousLevel: number
  newLevel: number
}

export function xpToNextLevel(level: number): number {
  return 100 + Math.max(0, Math.round(level) - 1) * 50
}

export function awardXp(save: SaveGame, amount: number): LevelAward {
  const previousLevel = save.progression.level
  save.progression.xp += Math.max(0, Math.round(amount))

  while (
    save.progression.xp >=
    xpToNextLevel(save.progression.level)
  ) {
    save.progression.xp -= xpToNextLevel(save.progression.level)
    save.progression.level += 1
    save.progression.unspentAttributePoints += 1
  }

  return {
    levelsGained: save.progression.level - previousLevel,
    previousLevel,
    newLevel: save.progression.level,
  }
}

export function awardMoney(save: SaveGame, amount: number): void {
  save.wallet.money += Math.max(0, Math.round(amount))
}

export function calculateMatchRewards(
  result: Pick<MatchResult, 'won' | 'playerStats'>,
): MatchRewards {
  const stats = result.playerStats
  const breakdown: MatchRewardItem[] = [
    { label: 'Match played', xp: 10, money: 5 },
    result.won
      ? { label: 'Victory bonus', xp: 25, money: 20 }
      : { label: 'Match completion', xp: 5, money: 5 },
  ]

  addPerformanceReward(
    breakdown,
    'Goals',
    Math.max(0, stats.goals) * 5,
  )
  addPerformanceReward(
    breakdown,
    'Assists',
    Math.max(0, stats.assists) * 4,
  )
  addPerformanceReward(
    breakdown,
    'Bank-shot bonus',
    Math.max(0, stats.bankShotGoals) * 5,
  )
  addPerformanceReward(
    breakdown,
    'Steals',
    Math.max(0, stats.steals) * 2,
  )
  addPerformanceReward(
    breakdown,
    'Saves',
    Math.max(0, stats.saves) * 2,
  )
  addPerformanceReward(
    breakdown,
    'Gather control',
    Math.min(10, Math.floor(Math.max(0, stats.successfulGathers) / 3)),
  )

  return {
    xp: breakdown.reduce((total, item) => total + item.xp, 0),
    money: breakdown.reduce((total, item) => total + item.money, 0),
    breakdown,
    levelsGained: 0,
    newLevel: 0,
  }
}

export function recordMatchResult(
  save: SaveGame,
  result: MatchResult,
): MatchRewards {
  const rewards = calculateMatchRewards(result)
  const trackedLines = [save.stats, save.seasonStats]
  const leagueStats =
    result.mode === 'league'
      ? save.leagueStats[save.league.currentLeagueId ?? '']
      : null
  const stats = result.playerStats

  for (const line of trackedLines) {
    line.matchesPlayed += 1
    line.goals += stats.goals
    line.assists += stats.assists
    line.shots += stats.shots
    line.bankShotGoals += stats.bankShotGoals
    line.steals += stats.steals
    line.saves += stats.saves
    line.turnovers += stats.turnovers
    line.successfulGathers += stats.successfulGathers
    line.fumbles += stats.fumbles

    if (result.won) {
      line.wins += 1
    } else {
      line.losses += 1
    }
  }

  if (leagueStats) {
    leagueStats.matchesPlayed += 1
    leagueStats.goals += stats.goals
    leagueStats.assists += stats.assists
    leagueStats.bankShotGoals += stats.bankShotGoals

    if (result.won) {
      leagueStats.wins += 1
    } else {
      leagueStats.losses += 1
    }
  }

  if (result.mode === 'league') {
    if (result.won) {
      save.league.record.wins += 1
      advanceRookieCircuit(save, result.opponentTeamId)
    } else {
      save.league.record.losses += 1
    }
  }

  const levelAward = awardXp(save, rewards.xp)
  awardMoney(save, rewards.money)
  return {
    ...rewards,
    levelsGained: levelAward.levelsGained,
    newLevel: levelAward.newLevel,
  }
}

function addPerformanceReward(
  breakdown: MatchRewardItem[],
  label: string,
  xp: number,
): void {
  if (xp > 0) {
    breakdown.push({ label, xp, money: 0 })
  }
}

function advanceRookieCircuit(
  save: SaveGame,
  opponentTeamId: string,
): void {
  const progress = save.league.rookieCircuit
  const league = defaultLeagues.find(
    (candidate) => candidate.id === 'rookie_circuit',
  )
  const currentOpponent =
    league?.teams[progress.currentOpponentIndex]?.opponentTeamId

  if (
    progress.completed ||
    !currentOpponent ||
    currentOpponent !== opponentTeamId
  ) {
    return
  }

  if (!progress.defeatedOpponentTeamIds.includes(opponentTeamId)) {
    progress.defeatedOpponentTeamIds.push(opponentTeamId)
  }

  progress.currentOpponentIndex += 1
  progress.completed =
    progress.currentOpponentIndex >= (league?.teams.length ?? 5)

  if (progress.completed && league) {
    const stats = save.leagueStats[league.id]
    if (stats) {
      stats.championships = Math.max(1, stats.championships)
    }
  }
}
