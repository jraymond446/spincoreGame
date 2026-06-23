import type { ArenaRect, ArenaSeatingSection } from './ArenaLayout'

export type ArenaThemeId = 'rookie'

export type ArenaAssetSlot = {
  key: string
  path: string
}

export type ArenaTheme = {
  id: ArenaThemeId
  leagueId: string
  shellAsset?: ArenaAssetSlot
  surfaceAsset?: ArenaAssetSlot
  scoreboardFrameAsset?: ArenaAssetSlot
  spectatorAtlasAsset?: ArenaAssetSlot & {
    frameWidth: number
    frameHeight: number
  }
  capacity: number
  baseAttendance: number
  seatingSections: ArenaSeatingSection[]
  crestPlacement: ArenaRect
  scoreboardPlacement?: ArenaRect
  palette: {
    surface: number
    lines: number
    structure: number
    accent: number
  }
}
