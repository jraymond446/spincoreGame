export type LeagueStanding = {
  teamId: string
  wins: number
  losses: number
  pointsFor?: number
  pointsAgainst?: number
  streak?: string
}

export type ScheduleMatch = {
  id: string
  opponentTeamId: string
  played: boolean
}

export type LeagueMatchResult = {
  matchId: string
  won: boolean
  scoreFor: number
  scoreAgainst: number
}

export type LeagueTeam = {
  id: string
  opponentTeamId: string
  seed: number
  name: string
  shortName: string
  marketProfile:
    | 'patient'
    | 'balanced'
    | 'starHunters'
    | 'development'
    | 'budget'
    | 'volatile'
  style:
    | 'balanced'
    | 'bankHunter'
    | 'bruiser'
    | 'speed'
    | 'keeperFirst'
    | 'showtime'
}

export type League = {
  id: string
  name: string
  description: string
  teams: LeagueTeam[]
  standings: LeagueStanding[]
  schedule: ScheduleMatch[]
}
