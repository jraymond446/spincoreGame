import type { StickStyle, TeamSide } from '../data/matchTypes'

type AssetSlot = {
  key: string
  path: string
}

export const assetOverrideConfig = {
  sticks: {
    hook: {
      key: 'asset-override-stick-hook',
      path: '/assets/sticks/hook.png',
    },
    cradle: {
      key: 'asset-override-stick-cradle',
      path: '/assets/sticks/cradle.png',
    },
    hammer: {
      key: 'asset-override-stick-hammer',
      path: '/assets/sticks/hammer.png',
    },
    whip: {
      key: 'asset-override-stick-whip',
      path: '/assets/sticks/whip.png',
    },
    fork: {
      key: 'asset-override-stick-fork',
      path: '/assets/sticks/fork.png',
    },
  } satisfies Record<StickStyle, AssetSlot>,
  players: {
    base: {
      key: 'asset-override-player-base',
      path: '/assets/players/player_base.png',
    },
    teams: {
      A: {
        key: 'asset-override-player-team-a',
        path: '/assets/players/team_a.png',
      },
      B: {
        key: 'asset-override-player-team-b',
        path: '/assets/players/team_b.png',
      },
    } satisfies Record<TeamSide, AssetSlot>,
    displayWidth: 64,
    displayHeight: 64,
  },
} as const
