import type { ArenaLayout } from './ArenaLayout'
import type { ArenaTheme, ArenaThemeId } from './ArenaTheme'

export const defaultArenaThemeId: ArenaThemeId = 'rookie'

export function getArenaTheme(
  id: ArenaThemeId,
  layout: ArenaLayout,
): ArenaTheme {
  switch (id) {
    case 'rookie':
      return createRookieTheme(layout)
  }
}

export function getArenaThemeOptions(): Array<{
  value: ArenaThemeId
  label: string
}> {
  return [{ value: 'rookie', label: 'Rookie Arena' }]
}

function createRookieTheme(layout: ArenaLayout): ArenaTheme {
  return {
    id: 'rookie',
    leagueId: 'rookie_circuit',
    shellAsset: {
      key: 'arena-rookie-shell',
      path: '/assets/arena/venues/rookie/rookie-shell.png',
    },
    surfaceAsset: {
      key: 'arena-standard-blue-surface',
      path: '/assets/arena/surfaces/standard-blue.png',
    },
    scoreboardFrameAsset: {
      key: 'arena-rookie-scoreboard-frame',
      path: '/assets/arena/scoreboards/rookie-frame.png',
    },
    spectatorAtlasAsset: {
      key: 'arena-spectator-atlas',
      path: '/assets/arena/crowd/spectator-atlas.png',
      frameWidth: 64,
      frameHeight: 64,
    },
    capacity: 420,
    baseAttendance: 0.52,
    seatingSections: layout.seatingSections,
    crestPlacement: layout.crestPlacement,
    scoreboardPlacement: layout.scoreboardPlacement,
    palette: {
      surface: 0x198bd5,
      lines: 0xd9f6ff,
      structure: 0xf5f0df,
      accent: 0xf2c84b,
    },
  }
}
