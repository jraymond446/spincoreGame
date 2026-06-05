import type Phaser from 'phaser'
import { gameplayConfig, type GameMode } from '../config/gameplayConfig'
import { playerArchetypes } from '../data/playerArchetypes'
import { teams } from '../data/teams'
import type {
  FormationAIBias,
  FormationId,
  ResolvedPlayerRosterEntry,
  Team,
  TeamSide,
} from '../data/matchTypes'
import { Player } from '../entities/Player'
import { FormationSystem } from './FormationSystem'

export class TeamSystem {
  readonly teams: Team[]
  readonly players: Player[]
  private readonly formationSystem: FormationSystem
  private readonly resetSpawns = new Map<string, { x: number; y: number }>()

  constructor(scene: Phaser.Scene, gameMode: GameMode) {
    this.teams =
      gameMode === 'stickLab'
        ? teams
            .filter((team) => team.side === 'A')
            .map((team) => ({
              ...team,
              roster: team.roster
                .filter((entry) => entry.id === gameplayConfig.stickLab.playerId)
                .map((entry) => ({ ...entry })),
            }))
        : teams
    this.formationSystem = new FormationSystem(
      scene,
      this.teams,
      gameMode === 'match3v3',
    )
    this.players = this.teams.flatMap((team) =>
      team.roster.map((entry) => {
        const spawn =
          gameMode === 'stickLab'
            ? { ...gameplayConfig.stickLab.playerSpawn }
            : this.formationSystem.getSpawn(entry.id)
        const resolvedEntry: ResolvedPlayerRosterEntry = {
          ...entry,
          spawn,
        }

        this.resetSpawns.set(entry.id, spawn)
        return new Player(
          scene,
          resolvedEntry,
          playerArchetypes[entry.archetypeId],
        )
      }),
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
      const spawn = this.resetSpawns.get(player.id)

      if (!spawn) {
        throw new Error(`Missing reset spawn for ${player.id}`)
      }

      player.reset(spawn)
    }
  }

  setDebugVisible(isVisible: boolean): void {
    this.formationSystem.setDebugVisible(isVisible)

    for (const player of this.players) {
      player.setDebugVisible(isVisible)
    }
  }

  getFormationIds(): Record<TeamSide, FormationId> {
    return this.formationSystem.getFormationIds()
  }

  getFormationBiases(): Record<TeamSide, FormationAIBias> {
    return this.formationSystem.getFormationBiases()
  }
}
