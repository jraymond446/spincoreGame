import type { OpponentTeam } from '../game/data/opponentTeams'
import type { CreatedPlayer, SaveGame } from '../save/saveTypes'

export type MatchLaunchMode = 'exhibition' | 'lab' | 'league'

export type MatchLaunchConfig = {
  mode: MatchLaunchMode
  useCreatedPlayer: boolean
  teamAOverride?: CreatedPlayer
  opponentTeamId?: string
  opponentTeam?: OpponentTeam
  saveGameSnapshot?: SaveGame
}

let activeMatchLaunchConfig: MatchLaunchConfig = {
  mode: 'lab',
  useCreatedPlayer: false,
}

export function setMatchLaunchConfig(config: MatchLaunchConfig): void {
  activeMatchLaunchConfig = structuredClone(config)
}

export function getMatchLaunchConfig(): MatchLaunchConfig {
  return activeMatchLaunchConfig
}

export function clearMatchLaunchConfig(): void {
  activeMatchLaunchConfig = {
    mode: 'lab',
    useCreatedPlayer: false,
  }
}

