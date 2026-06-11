import type { League } from './leagueTypes'

export const defaultLeagues: League[] = [
  {
    id: 'local-circuit',
    name: 'Local Circuit',
    description: 'Short travel, loud walls, and everybody knows your game.',
    teams: [
      { opponentTeamId: 'rookie-scrappers', seed: 1 },
      { opponentTeamId: 'wall-rats', seed: 2 },
      { opponentTeamId: 'crease-crashers', seed: 3 },
      { opponentTeamId: 'net-ghosts', seed: 4 },
    ],
    standings: [],
    schedule: [
      {
        id: 'local-01',
        opponentTeamId: 'rookie-scrappers',
        played: false,
      },
    ],
  },
]

