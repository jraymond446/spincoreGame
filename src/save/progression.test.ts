import {
  awardXp,
  calculateMatchRewards,
  recordMatchResult,
} from './progression.ts'
import {
  createEmptyMatchPlayerStats,
  type MatchResult,
} from '../match/MatchResult.ts'
import type { PlayerStatLine, SaveGame } from './saveTypes.ts'

const rewardResult = createResult({
  won: true,
  goals: 2,
  assists: 1,
  bankShotGoals: 1,
  saves: 1,
  steals: 1,
  successfulGathers: 7,
})
const rewards = calculateMatchRewards(rewardResult)
assertEqual(rewards.xp, 60, 'reward XP total')
assertEqual(rewards.money, 25, 'reward money total')

const levelingSave = createTestSave()
const levelAward = awardXp(levelingSave, 280)
assertEqual(levelingSave.progression.level, 3, 'multi-level result')
assertEqual(levelingSave.progression.xp, 30, 'XP carry')
assertEqual(
  levelingSave.progression.unspentAttributePoints,
  2,
  'level attribute points',
)
assertEqual(levelAward.levelsGained, 2, 'reported levels gained')

const leagueSave = createTestSave()
const leagueResult = createResult({
  mode: 'league',
  opponentTeamId: 'rookie-scrappers',
  won: true,
})
leagueResult.rewards = recordMatchResult(leagueSave, leagueResult)
assertEqual(leagueSave.league.record.wins, 1, 'league win')
assertEqual(
  leagueSave.league.rookieCircuit.currentOpponentIndex,
  1,
  'Rookie Circuit advancement',
)
assertEqual(leagueSave.stats.matchesPlayed, 1, 'career match count')
assertEqual(
  leagueSave.league.rookieCircuit.defeatedOpponentTeamIds[0],
  'rookie-scrappers',
  'defeated opponent record',
)

console.info('Progression regression cases passed: 8')

function createTestSave(): SaveGame {
  const stats = createEmptyStats()
  return {
    version: 3,
    createdAt: '2026-06-13T12:00:00.000Z',
    updatedAt: '2026-06-13T12:00:00.000Z',
    player: {} as SaveGame['player'],
    wallet: { money: 100 },
    progression: {
      xp: 0,
      level: 1,
      unspentAttributePoints: 0,
    },
    equipment: {
      equipped: {
        stickId: 'balanced-cesta',
        shieldId: null,
        shoesId: null,
        armorId: null,
      },
      inventory: ['balanced-cesta'],
    },
    team: {
      name: 'Test Club',
      colors: {
        primary: 'teal',
        secondary: 'gold',
        homeField: 'blue',
      },
      sponsorId: null,
      coachId: 'mara-voss',
      rosterAssignments: {
        'a-keeper': null,
        'a-support': null,
        'a-striker': null,
        bench: null,
      },
      rosterLoadouts: {
        'a-keeper': {
          equipment: {
            stickId: null,
            shieldId: null,
            shoesId: null,
            armorId: null,
          },
        },
        'a-support': {
          equipment: {
            stickId: null,
            shieldId: null,
            shoesId: null,
            armorId: null,
          },
        },
        'a-striker': {
          equipment: {
            stickId: null,
            shieldId: null,
            shoesId: null,
            armorId: null,
          },
        },
        bench: {
          equipment: {
            stickId: null,
            shieldId: null,
            shoesId: null,
            armorId: null,
          },
        },
      },
    },
    league: {
      currentLeagueId: 'rookie_circuit',
      unlockedLeagueIds: ['rookie_circuit'],
      record: { wins: 0, losses: 0 },
      rookieCircuit: {
        currentOpponentIndex: 0,
        defeatedOpponentTeamIds: [],
        completed: false,
      },
    },
    seasonStats: {
      seasonId: 'rookie-season-1',
      ...structuredClone(stats),
    },
    stats,
    leagueStats: {
      rookie_circuit: {
        leagueName: 'Rookie Circuit',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        bankShotGoals: 0,
        championships: 0,
      },
    },
    settings: { createdPlayerComplete: true },
  }
}

function createResult(
  overrides: Partial<
    MatchResult['playerStats'] & {
      won: boolean
      mode: MatchResult['mode']
      opponentTeamId: string
    }
  >,
): MatchResult {
  const stats = createEmptyMatchPlayerStats()

  for (const key of Object.keys(stats) as Array<keyof typeof stats>) {
    const value = overrides[key]
    if (typeof value === 'number') {
      stats[key] = value
    }
  }

  return {
    matchId: 'test-match',
    mode: overrides.mode ?? 'exhibition',
    opponentTeamId: overrides.opponentTeamId ?? 'rookie-scrappers',
    opponentName: 'Rookie Scrappers',
    playerTeamScore: overrides.won === false ? 2 : 5,
    opponentTeamScore: overrides.won === false ? 5 : 2,
    won: overrides.won ?? true,
    completedAt: '2026-06-13T12:00:00.000Z',
    playerStats: stats,
    teamStats: {
      A: { score: 5, assists: 0, checks: 0, saves: 0 },
      B: { score: 2, assists: 0, checks: 0, saves: 0 },
    },
    rewards: {
      xp: 0,
      money: 0,
      breakdown: [],
      levelsGained: 0,
      newLevel: 0,
    },
  }
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    )
  }
}

function createEmptyStats(): PlayerStatLine {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    bankShotGoals: 0,
    saves: 0,
    steals: 0,
    turnovers: 0,
    hitsTaken: 0,
    slashes: 0,
    successfulGathers: 0,
    fumbles: 0,
  }
}
