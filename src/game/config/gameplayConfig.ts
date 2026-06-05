export type GameMode = 'stickLab' | 'match3v3'

export const gameplayConfig = {
  defaultMode: 'stickLab' as GameMode,
  stickLab: {
    playerId: 'a-striker',
    playerSpawn: {
      x: 450,
      y: 930,
    },
    goalId: 'top-goal',
  },
} as const
