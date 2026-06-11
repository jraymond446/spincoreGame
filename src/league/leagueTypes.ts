export type LeagueStanding = {
  teamId: string
  wins: number
  losses: number
}

export type ScheduleMatch = {
  id: string
  opponentTeamId: string
  played: boolean
}

export type MatchResult = {
  matchId: string
  won: boolean
  scoreFor: number
  scoreAgainst: number
}

export type LeagueTeam = {
  opponentTeamId: string
  seed: number
}

export type League = {
  id: string
  name: string
  description: string
  teams: LeagueTeam[]
  standings: LeagueStanding[]
  schedule: ScheduleMatch[]
}

