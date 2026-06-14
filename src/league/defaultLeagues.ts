import type { League } from './leagueTypes'

export const defaultLeagues: League[] = [
  {
    id: 'rookie_circuit',
    name: 'Rookie Circuit',
    description: 'Five clubs stand between your created player and a first circuit title.',
    teams: [
      { opponentTeamId: 'rookie-scrappers', seed: 1 },
      { opponentTeamId: 'wall-rats', seed: 2 },
      { opponentTeamId: 'crease-crashers', seed: 3 },
      { opponentTeamId: 'net-ghosts', seed: 4 },
      { opponentTeamId: 'apex-circuit', seed: 5 },
    ],
    standings: [],
    schedule: [
      {
        id: 'rookie-01',
        opponentTeamId: 'rookie-scrappers',
        played: false,
      },
      {
        id: 'rookie-02',
        opponentTeamId: 'wall-rats',
        played: false,
      },
      {
        id: 'rookie-03',
        opponentTeamId: 'crease-crashers',
        played: false,
      },
      {
        id: 'rookie-04',
        opponentTeamId: 'net-ghosts',
        played: false,
      },
      {
        id: 'rookie-05',
        opponentTeamId: 'apex-circuit',
        played: false,
      },
    ],
  },
]
