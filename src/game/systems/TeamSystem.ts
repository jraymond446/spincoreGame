import type Phaser from 'phaser'
import { gameplayConfig, type GameMode } from '../config/gameplayConfig'
import { playerArchetypes } from '../data/playerArchetypes'
import { teams } from '../data/teams'
import type {
  FormationAIBias,
  FormationId,
  PlayerArchetype,
  PlayerRosterEntry,
  ResolvedPlayerRosterEntry,
  Team,
  TeamSide,
} from '../data/matchTypes'
import { Player } from '../entities/Player'
import { getLabState } from '../lab/LabState'
import { FormationSystem } from './FormationSystem'

export class TeamSystem {
  readonly teams: Team[]
  readonly players: Player[]
  private readonly formationSystem: FormationSystem
  private readonly resetSpawns = new Map<string, { x: number; y: number }>()

  constructor(scene: Phaser.Scene, gameMode: GameMode) {
    const labState = getLabState()
    const runtimeTeams = createRuntimeTeams()
    const stickLabPlayerId = resolveControlledPlayerId(
      runtimeTeams.find((team) => team.side === 'A')?.roster ?? [],
      labState.controlledPlayer,
    )

    this.teams =
      gameMode === 'stickLab'
        ? runtimeTeams
            .filter((team) => team.side === 'A')
            .map((team) => ({
              ...team,
              roster: team.roster
                .filter((entry) => entry.id === stickLabPlayerId)
                .map((entry) => ({ ...entry })),
            }))
        : runtimeTeams
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
          createRuntimeArchetype(entry),
          getLabState().players[entry.id]?.defenseTendencies ?? {
            bodyCheckAggression: 0.5,
            stickSwipeAggression: 0.5,
            fumblePressurePreference: 0.5,
          },
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

function createRuntimeTeams(): Team[] {
  const labState = getLabState()

  return teams.map((team) => ({
    ...team,
    formation: labState.formations[team.side],
    roster: team.roster.map((entry) => {
      const tuning = labState.players[entry.id]

      if (!tuning) {
        return { ...entry }
      }

      return {
        ...entry,
        role: tuning.role,
        archetypeId: tuning.role,
        handedness: tuning.handedness,
        playStyle: tuning.playStyle,
        stickStyle: tuning.stickStyle,
      }
    }),
  }))
}

function createRuntimeArchetype(entry: PlayerRosterEntry): PlayerArchetype {
  const tuning = getLabState().players[entry.id]
  const base = playerArchetypes[entry.archetypeId]

  if (!tuning) {
    return base
  }

  return {
    ...base,
    id: entry.archetypeId,
    role: entry.role,
    defaultHandedness: entry.handedness,
    defaultPlayStyle: entry.playStyle,
    attributes: {
      ...tuning.attributes,
    },
  }
}

function resolveControlledPlayerId(
  roster: PlayerRosterEntry[],
  selection: ReturnType<typeof getLabState>['controlledPlayer'],
): string {
  if (selection === 'auto') {
    return (
      roster.find((entry) => entry.id === gameplayConfig.stickLab.playerId)?.id ??
      roster.find((entry) => entry.role !== 'keeper')?.id ??
      roster[0]?.id ??
      gameplayConfig.stickLab.playerId
    )
  }

  const preferredId =
    selection === 'keeper'
      ? 'a-keeper'
      : selection === 'flex'
        ? 'a-support'
        : 'a-striker'
  const selected =
    roster.find((entry) => entry.id === preferredId) ??
    (selection === 'flex'
      ? roster.find(
          (entry) => entry.role === 'support' || entry.role === 'brute',
        )
      : roster.find((entry) => entry.role === selection))

  return (
    selected?.id ??
    roster.find((entry) => entry.role !== 'keeper')?.id ??
    roster[0]?.id ??
    gameplayConfig.stickLab.playerId
  )
}
