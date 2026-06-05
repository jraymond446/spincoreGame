import type Phaser from 'phaser'
import { gameplayConfig, type GameMode } from '../config/gameplayConfig'
import { playerArchetypes } from '../data/playerArchetypes'
import { teams } from '../data/teams'
import type { Team, TeamSide } from '../data/matchTypes'
import { Player } from '../entities/Player'

export class TeamSystem {
  readonly teams: Team[]
  readonly players: Player[]

  constructor(scene: Phaser.Scene, gameMode: GameMode) {
    this.teams =
      gameMode === 'stickLab'
        ? teams
            .filter((team) => team.side === 'A')
            .map((team) => ({
              ...team,
              roster: team.roster
                .filter((entry) => entry.id === gameplayConfig.stickLab.playerId)
                .map((entry) => ({
                  ...entry,
                  spawn: { ...gameplayConfig.stickLab.playerSpawn },
                })),
            }))
        : teams
    this.players = this.teams.flatMap((team) =>
      team.roster.map(
        (entry) =>
          new Player(
            scene,
            entry,
            playerArchetypes[entry.archetypeId],
            team.color,
            team.accentColor,
          ),
      ),
    )
  }

  getPlayer(id: string | null): Player | null {
    if (!id) {
      return null
    }

    return this.players.find((player) => player.id === id) ?? null
  }

  getPlayersForSide(side: TeamSide): Player[] {
    return this.players.filter((player) => player.teamSide === side)
  }

  getTeam(side: TeamSide): Team {
    const team = this.teams.find((candidate) => candidate.side === side)

    if (!team) {
      throw new Error(`Missing team for side ${side}`)
    }

    return team
  }

  resetFormation(): void {
    for (const player of this.players) {
      player.reset()
    }
  }

  setDebugVisible(isVisible: boolean): void {
    for (const player of this.players) {
      player.setDebugVisible(isVisible)
    }
  }
}
