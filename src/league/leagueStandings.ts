import type { League, LeagueStanding, LeagueTeam } from './leagueTypes'
import type { SaveGame } from '../save/saveTypes'

export type LeagueStandingsRow = {
  teamId: string
  name: string
  shortName: string
  seed: number
  wins: number
  losses: number
  played: number
  winPct: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
  streak: string
  style: string
  marketProfile: string
  isUserTeam: boolean
}

const userTeamId = 'player-club'

export function buildLeagueStandings(
  league: League,
  save: SaveGame,
): LeagueStandingsRow[] {
  const standingsByTeamId = new Map(
    league.standings.map((standing) => [standing.teamId, standing]),
  )
  const opponentRows = league.teams.map((leagueTeam) =>
    createOpponentRow(
      leagueTeam,
      standingsByTeamId.get(leagueTeam.id),
      league,
      save,
    ),
  )
  const rows = [
    createUserRow(league, save),
    ...opponentRows,
  ]

  return rows.sort(compareStandingsRows).map((row, index) => ({
    ...row,
    seed: index + 1,
  }))
}

function createOpponentRow(
  leagueTeam: LeagueTeam,
  standing: LeagueStanding | undefined,
  league: League,
  save: SaveGame,
): LeagueStandingsRow {
  const live = {
    wins: standing?.wins ?? 0,
    losses: standing?.losses ?? 0,
    pointsFor: standing?.pointsFor ?? 0,
    pointsAgainst: standing?.pointsAgainst ?? 0,
    streak: standing?.streak ?? '--',
  }

  if (
    league.id === 'rookie_circuit' &&
    league.id === save.league.currentLeagueId
  ) {
    const defeated = save.league.rookieCircuit.defeatedOpponentTeamIds
      .includes(leagueTeam.opponentTeamId)
    const currentOpponent =
      league.teams[save.league.rookieCircuit.currentOpponentIndex]
        ?.opponentTeamId

    if (defeated) {
      live.losses += 1
      live.pointsFor += 2
      live.pointsAgainst += 5
      live.streak = 'L1'
    }

    if (
      currentOpponent === leagueTeam.opponentTeamId &&
      save.league.record.losses > 0
    ) {
      live.wins += save.league.record.losses
      live.pointsFor += save.league.record.losses * 5
      live.pointsAgainst += save.league.record.losses * 2
      live.streak = `W${save.league.record.losses}`
    }
  }

  return toRow({
    teamId: leagueTeam.id,
    name: leagueTeam.name,
    shortName: leagueTeam.shortName,
    seed: leagueTeam.seed,
    style: leagueTeam.style,
    marketProfile: leagueTeam.marketProfile,
    isUserTeam: false,
    ...live,
  })
}

function createUserRow(
  league: League,
  save: SaveGame,
): LeagueStandingsRow {
  const leagueStats = save.leagueStats[league.id]
  const wins =
    league.id === save.league.currentLeagueId
      ? save.league.record.wins
      : leagueStats?.wins ?? 0
  const losses =
    league.id === save.league.currentLeagueId
      ? save.league.record.losses
      : leagueStats?.losses ?? 0
  const pointsFor = leagueStats?.goals ?? wins * 5 + losses * 2
  const pointsAgainst = wins * 2 + losses * 5

  return toRow({
    teamId: userTeamId,
    name: save.team.name,
    shortName: initials(save.team.name),
    seed: 0,
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    streak: createUserStreak(wins, losses),
    style: 'userClub',
    marketProfile: 'userManaged',
    isUserTeam: true,
  })
}

function toRow(input: {
  teamId: string
  name: string
  shortName: string
  seed: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  streak: string
  style: string
  marketProfile: string
  isUserTeam: boolean
}): LeagueStandingsRow {
  const played = input.wins + input.losses
  const winPct = played > 0 ? input.wins / played : 0

  return {
    ...input,
    played,
    winPct,
    pointDiff: input.pointsFor - input.pointsAgainst,
  }
}

function compareStandingsRows(
  left: LeagueStandingsRow,
  right: LeagueStandingsRow,
): number {
  return (
    right.winPct - left.winPct ||
    right.wins - left.wins ||
    right.pointDiff - left.pointDiff ||
    left.seed - right.seed
  )
}

function createUserStreak(wins: number, losses: number): string {
  if (wins === 0 && losses === 0) {
    return '--'
  }

  return wins >= losses ? `W${Math.max(1, wins)}` : `L${Math.max(1, losses)}`
}

function initials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'SC'
  )
}
