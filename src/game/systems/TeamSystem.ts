import type Phaser from 'phaser'
import { gameplayConfig, type GameMode } from '../config/gameplayConfig'
import { playerArchetypes } from '../data/playerArchetypes'
import { opponentTeams } from '../data/opponentTeams'
import { teams } from '../data/teams'
import type {
  FormationAIBias,
  FormationId,
  PlayerArchetype,
  PlayerRosterEntry,
  ResolvedPlayerRosterEntry,
  Team,
  TeamSide,
  TeamTacticalQuality,
} from '../data/matchTypes'
import type { TeamStrategy } from '../tactics/TeamStrategy'
import { Player } from '../entities/Player'
import { getLabState } from '../lab/LabState'
import { getMatchLaunchConfig } from '../../match/MatchLaunchConfig'
import { applyMatchRosterOverrides } from '../../match/buildRosterFromSave'
import { FormationSystem } from './FormationSystem'

export class TeamSystem {
  readonly teams: Team[]
  readonly players: Player[]
  private readonly formationSystem: FormationSystem
  private readonly resetSpawns = new Map<string, { x: number; y: number }>()

  constructor(scene: Phaser.Scene, gameMode: GameMode) {
    const labState = getLabState()
    const runtime = createRuntimeTeams(gameMode)
    const runtimeTeams = runtime.teams
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
          createRuntimeArchetype(entry, runtime.archetypes),
          getLabState().players[entry.id]?.defenseTendencies ?? {
            truckAggression: 0.5,
            slashAggression: 0.5,
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

  getStrategies(): Record<TeamSide, TeamStrategy> {
    return {
      A: structuredClone(this.getTeam('A').strategy),
      B: structuredClone(this.getTeam('B').strategy),
    }
  }

  getTacticalQualities(): Record<TeamSide, TeamTacticalQuality> {
    return {
      A: { ...this.getTeam('A').tacticalQuality },
      B: { ...this.getTeam('B').tacticalQuality },
    }
  }
}

function createRuntimeTeams(gameMode: GameMode): {
  teams: Team[]
  archetypes: Map<string, PlayerArchetype>
} {
  const labState = getLabState()
  const runtimeTeams = teams.map((team) => ({
    ...team,
    formation: labState.formations[team.side],
    strategy: {
      formation: labState.formations[team.side],
      ...labState.strategies[team.side],
    },
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
  const launch = getMatchLaunchConfig()
  const shouldApplyCareerRoster =
    gameMode === 'match3v3' && launch.mode !== 'lab'

  if (!shouldApplyCareerRoster) {
    return {
      teams: runtimeTeams,
      archetypes: new Map(),
    }
  }

  const teamA = runtimeTeams.find((team) => team.side === 'A')
  const teamB = runtimeTeams.find((team) => team.side === 'B')
  const opponent =
    launch.opponentTeam ??
    opponentTeams.find(
      (candidate) => candidate.id === launch.opponentTeamId,
    ) ??
    opponentTeams[0]

  if (!teamA || !teamB) {
    return {
      teams: runtimeTeams,
      archetypes: new Map(),
    }
  }

  const overrides = applyMatchRosterOverrides(
    teamA.roster,
    teamB.roster,
    launch.useCreatedPlayer
      ? launch.saveGameSnapshot
      : undefined,
    opponent,
  )

  if (opponent) {
    teamB.id = opponent.id
    teamB.name = opponent.name
    teamB.color = opponent.primaryColor
    teamB.accentColor = opponent.secondaryColor
    teamB.formation = opponent.formation
    teamB.strategy = structuredClone(opponent.strategy)
    teamB.tacticalQuality = { ...opponent.tacticalQuality }
  }

  return {
    teams: runtimeTeams,
    archetypes: overrides.archetypes,
  }
}

function createRuntimeArchetype(
  entry: PlayerRosterEntry,
  overrides: Map<string, PlayerArchetype>,
): PlayerArchetype {
  const override = overrides.get(entry.id)

  if (override) {
    return override
  }

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
