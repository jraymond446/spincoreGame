import Phaser from 'phaser'
import { aiCarrierConfig } from '../config/aiCarrierConfig'
import { arenaConfig } from '../config/arenaConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { spacingConfig } from '../config/spacingConfig'
import { tacticsConfig } from '../config/tacticsConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import {
  clampFieldPlayerTargetToLegalZones,
  isPointInKeeperZone,
} from '../rules/KeeperZoneAccess'
import type {
  TacticalAssignment,
  TacticalJob,
  TeamPhase,
} from '../tactics/TacticalJobs'
import type {
  DefenseScheme,
  TeamStrategy,
} from '../tactics/TeamStrategy'
import {
  enforceMinimumSeparation,
  resolveBehindNetOffBallJob,
  resolveWeakSideLaneSign,
} from '../tactics/PlaymakingGeometry'
import {
  clampVectorMagnitude,
  normalizeSafe,
  sanitizeVector,
} from '../utils/vectorSafety'

type PresserState = {
  playerId: string | null
  cooldownMs: number
}

type JobState = {
  job: TacticalJob
  cooldownMs: number
}

export class TeamShapeSystem {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly strategies: Record<TeamSide, TeamStrategy>
  private readonly labels = new Map<string, Phaser.GameObjects.Text>()
  private readonly strategyLabels: Record<
    TeamSide,
    Phaser.GameObjects.Text
  >
  private readonly assignments = new Map<string, TacticalAssignment>()
  private readonly jobStates = new Map<string, JobState>()
  private readonly pressers: Record<TeamSide, PresserState> = {
    A: { playerId: null, cooldownMs: 0 },
    B: { playerId: null, cooldownMs: 0 },
  }
  private readonly phases: Record<TeamSide, TeamPhase> = {
    A: 'LOOSE',
    B: 'LOOSE',
  }
  private readonly transitionTimers: Record<TeamSide, number> = {
    A: 0,
    B: 0,
  }
  private readonly phaseChanged: Record<TeamSide, boolean> = {
    A: false,
    B: false,
  }
  private readonly cleanupAssignments: Record<TeamSide, string[]> = {
    A: [],
    B: [],
  }
  private readonly previousCarrierIds: Record<TeamSide, string | null> = {
    A: null,
    B: null,
  }
  private lastCarrierId: string | null = null
  private lastPossessionSide: TeamSide | null = null
  private debugEnabled = false

  constructor(
    scene: Phaser.Scene,
    strategies: Record<TeamSide, TeamStrategy>,
  ) {
    this.scene = scene
    this.strategies = strategies
    this.graphics = scene.add.graphics().setDepth(18)
    this.strategyLabels = {
      A: this.createStrategyLabel(),
      B: this.createStrategyLabel(),
    }
  }

  update(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
    deltaMs: number,
  ): void {
    const carrier =
      players.find((player) => player.id === carrierId) ?? null

    this.updatePossession(carrier, deltaMs)
    this.updateJobCooldowns(deltaMs)

    for (const side of ['A', 'B'] as const) {
      this.pressers[side].cooldownMs = Math.max(
        0,
        this.pressers[side].cooldownMs - deltaMs,
      )
      this.assignTeam(
        side,
        players,
        core,
        carrier,
        controlledPlayerId,
      )
    }

    this.drawDebug(players)
  }

  getAssignment(playerId: string): TacticalAssignment | null {
    const assignment = this.assignments.get(playerId)

    return assignment
      ? {
          ...assignment,
          target: { ...assignment.target },
        }
      : null
  }

  getAssignments(): Map<string, TacticalAssignment> {
    return new Map(
      [...this.assignments].map(([playerId, assignment]) => [
        playerId,
        {
          ...assignment,
          target: { ...assignment.target },
        },
      ]),
    )
  }

  getActivePresser(side: TeamSide): string | null {
    return this.pressers[side].playerId
  }

  getCleanupPlayerIds(side: TeamSide): string[] {
    return [...this.cleanupAssignments[side]]
  }

  getPhase(side: TeamSide): TeamPhase {
    return this.phases[side]
  }

  getStrategy(side: TeamSide): TeamStrategy {
    return structuredClone(this.strategies[side])
  }

  getBankAimTarget(side: TeamSide, origin: Point): Point | null {
    if (
      this.phases[side] !== 'OFFENSE' ||
      this.strategies[side].offenseScheme !== 'bankHunter'
    ) {
      return null
    }

    const attackGoal = this.attackGoal(side)
    const left = arenaConfig.center.x - arenaConfig.width / 2
    const right = arenaConfig.center.x + arenaConfig.width / 2
    const wallX =
      origin.x < arenaConfig.center.x
        ? left + tacticsConfig.bankReboundWallInset
        : right - tacticsConfig.bankReboundWallInset

    return {
      x: wallX,
      y: Phaser.Math.Linear(origin.y, attackGoal.y, 0.72),
    }
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.graphics.setVisible(enabled)

    for (const label of [
      ...this.labels.values(),
      ...Object.values(this.strategyLabels),
    ]) {
      label.setVisible(enabled)
    }

    if (!enabled) {
      this.graphics.clear()
    }
  }

  reset(): void {
    this.assignments.clear()
    this.jobStates.clear()
    this.pressers.A = { playerId: null, cooldownMs: 0 }
    this.pressers.B = { playerId: null, cooldownMs: 0 }
    this.phases.A = 'LOOSE'
    this.phases.B = 'LOOSE'
    this.transitionTimers.A = 0
    this.transitionTimers.B = 0
    this.phaseChanged.A = false
    this.phaseChanged.B = false
    this.cleanupAssignments.A = []
    this.cleanupAssignments.B = []
    this.previousCarrierIds.A = null
    this.previousCarrierIds.B = null
    this.lastCarrierId = null
    this.lastPossessionSide = null
  }

  private updatePossession(carrier: Player | null, deltaMs: number): void {
    const previousPhases = { ...this.phases }

    for (const side of ['A', 'B'] as const) {
      this.transitionTimers[side] = Math.max(
        0,
        this.transitionTimers[side] - deltaMs,
      )
    }

    const possessionSide = carrier?.teamSide ?? null

    if (carrier?.id !== this.lastCarrierId) {
      if (
        this.lastCarrierId &&
        this.lastPossessionSide &&
        this.lastPossessionSide === possessionSide
      ) {
        this.previousCarrierIds[possessionSide] = this.lastCarrierId
      }
      this.lastCarrierId = carrier?.id ?? null
    }

    if (
      possessionSide &&
      possessionSide !== this.lastPossessionSide
    ) {
      const defendingSide = oppositeSide(possessionSide)
      this.transitionTimers[possessionSide] =
        spacingConfig.possessionOffenseTransitionMs
      this.transitionTimers[defendingSide] =
        spacingConfig.possessionDefenseTransitionMs
    } else if (!possessionSide) {
      this.transitionTimers.A = 0
      this.transitionTimers.B = 0
    }
    this.lastPossessionSide = possessionSide

    for (const side of ['A', 'B'] as const) {
      if (!possessionSide) {
        this.phases[side] = 'LOOSE'
      } else if (this.transitionTimers[side] > 0) {
        this.phases[side] = 'TRANSITION'
      } else {
        this.phases[side] =
          possessionSide === side ? 'OFFENSE' : 'DEFENSE'
      }
      this.phaseChanged[side] =
        this.phases[side] !== previousPhases[side]
    }
  }

  private updateJobCooldowns(deltaMs: number): void {
    for (const state of this.jobStates.values()) {
      state.cooldownMs = Math.max(0, state.cooldownMs - deltaMs)
    }
  }

  private assignTeam(
    side: TeamSide,
    players: Player[],
    core: Core,
    carrier: Player | null,
    controlledPlayerId: string,
  ): void {
    const teammates = players.filter((player) => player.teamSide === side)
    const fieldPlayers = teammates.filter((player) => player.role !== 'keeper')
    const opponents = players.filter((player) => player.teamSide !== side)
    const teamCarrier = carrier?.teamSide === side ? carrier : null
    const opponentCarrier =
      carrier && carrier.teamSide !== side ? carrier : null
    const pressurePoint = opponentCarrier?.position ?? core.position
    const phase = this.phases[side]
    const strategy = this.strategies[side]
    const cleanupPlayers = this.selectDefensiveCleaners(
      side,
      fieldPlayers,
      core,
      carrier,
    )
    const cleanupIds = new Set(cleanupPlayers.map((player) => player.id))
    this.cleanupAssignments[side] = cleanupPlayers.map(
      (player) => player.id,
    )
    const needsPresser =
      cleanupPlayers.length === 0 &&
      (phase === 'DEFENSE' ||
        phase === 'LOOSE' ||
        (phase === 'TRANSITION' && !teamCarrier))
    const presser = needsPresser
      ? this.selectPresser(
          side,
          fieldPlayers,
          pressurePoint,
          controlledPlayerId,
          strategy.defenseScheme,
        )
      : null

    if (!needsPresser) {
      this.pressers[side].playerId = null
    }

    for (const player of teammates) {
      if (player.role === 'keeper') {
        this.setAssignment(player, 'keeper', player.position)
        continue
      }

      if (
        aiCarrierConfig.freezeCarrierTacticalJob &&
        player.id === teamCarrier?.id
      ) {
        this.setAssignment(player, 'carrier', player.position)
        continue
      }

      if (cleanupIds.has(player.id)) {
        const cleanupIndex = cleanupPlayers.findIndex(
          (candidate) => candidate.id === player.id,
        )
        const cleanupJob =
          cleanupIndex === 0 ? 'defensiveCleanup' : 'creaseSupport'
        const target = this.applySpacing(
          core.position,
          player,
          teammates,
          cleanupJob,
        )
        this.setAssignment(player, cleanupJob, target)
        continue
      }

      if (cleanupPlayers.length > 0) {
        const job: TacticalJob = 'outletAfterClear'
        const target = this.applySpacing(
          this.getJobTarget(
            job,
            player,
            teammates,
            opponents,
            teamCarrier,
            opponentCarrier,
            core,
            strategy.defenseScheme,
          ).target,
          player,
          teammates,
          job,
        )
        this.setAssignment(player, job, target)
        continue
      }

      if (player.id === presser?.id) {
        const target = this.applySpacing(
          pressurePoint,
          player,
          teammates,
          'primaryPresser',
        )
        this.setAssignment(player, 'primaryPresser', target)
        continue
      }

      const desiredJob = this.chooseJob(
        player,
        phase,
        strategy,
        teamCarrier,
        opponentCarrier,
        core,
      )
      const job = this.stabilizeJob(
        player.id,
        desiredJob,
        this.phaseChanged[side],
      )
      const tacticalTarget = this.getJobTarget(
        job,
        player,
        teammates,
        opponents,
        teamCarrier,
        opponentCarrier,
        core,
        strategy.defenseScheme,
      )
      const target = this.applySpacing(
        tacticalTarget.target,
        player,
        teammates,
        job,
        teamCarrier,
      )

      this.assignments.set(player.id, {
        job,
        target,
        markTargetId: tacticalTarget.markTargetId,
      })
    }
  }

  private selectPresser(
    side: TeamSide,
    players: Player[],
    target: Point,
    controlledPlayerId: string,
    defenseScheme: DefenseScheme,
  ): Player | null {
    if (spacingConfig.maxCorePressersPerTeam <= 0 || players.length === 0) {
      this.pressers[side].playerId = null
      return null
    }

    const controlled = players.find(
      (player) => player.id === controlledPlayerId,
    )
    const brute =
      defenseScheme === 'bruteShadow'
        ? players.find((player) => player.role === 'brute')
        : null
    const sorted = [...players].sort(
      (a, b) => distance(a.position, target) - distance(b.position, target),
    )
    const current = players.find(
      (player) => player.id === this.pressers[side].playerId,
    )
    const preferred = controlled ?? brute ?? sorted[0]

    if (!current) {
      this.setPresser(side, preferred.id)
      return preferred
    }

    if (this.pressers[side].cooldownMs > 0) {
      return current
    }

    const challenger = controlled ?? brute ?? sorted[0]
    const advantage =
      distance(current.position, target) -
      distance(challenger.position, target)

    if (
      challenger.id !== current.id &&
      (controlled ||
        brute ||
        advantage >= spacingConfig.presserDistanceAdvantageRequired)
    ) {
      this.setPresser(side, challenger.id)
      return challenger
    }

    return current
  }

  private selectDefensiveCleaners(
    side: TeamSide,
    players: Player[],
    core: Core,
    carrier: Player | null,
  ): Player[] {
    if (
      !keeperZoneRulesConfig.defendersAllowedInOwnKeeperZone ||
      keeperZoneRulesConfig.maxDefensiveCleanersInZone <= 0 ||
      carrier !== null ||
      !isPointInKeeperZone(core.position, side)
    ) {
      return []
    }

    const maximumApproachDistance =
      keeperAreaConfig.keeperZoneRadius +
      keeperZoneRulesConfig.defensiveCleanupRadius
    const priority = keeperZoneRulesConfig.defensiveCleanupPriority

    return players
      .filter(
        (player) =>
          distance(player.position, core.position) <=
          maximumApproachDistance,
      )
      .sort((a, b) => {
        const aRoleBonus =
          a.role === 'brute' ? 0.35 : a.role === 'support' ? 0.22 : 0.1
        const bRoleBonus =
          b.role === 'brute' ? 0.35 : b.role === 'support' ? 0.22 : 0.1
        const aScore =
          distance(a.position, core.position) -
          aRoleBonus *
            priority *
            keeperZoneRulesConfig.defensiveCleanupRadius
        const bScore =
          distance(b.position, core.position) -
          bRoleBonus *
            priority *
            keeperZoneRulesConfig.defensiveCleanupRadius

        return aScore - bScore
      })
      .slice(0, keeperZoneRulesConfig.maxDefensiveCleanersInZone)
  }

  private setPresser(side: TeamSide, playerId: string): void {
    this.pressers[side] = {
      playerId,
      cooldownMs: spacingConfig.presserSwitchCooldownMs,
    }
  }

  private chooseJob(
    player: Player,
    phase: TeamPhase,
    strategy: TeamStrategy,
    teamCarrier: Player | null,
    opponentCarrier: Player | null,
    core: Core,
  ): TacticalJob {
    if (phase === 'OFFENSE') {
      return this.chooseOffenseJob(player, strategy, teamCarrier, core)
    }

    if (phase === 'DEFENSE') {
      return this.chooseDefenseJob(
        player,
        strategy.defenseScheme,
        opponentCarrier,
      )
    }

    if (phase === 'TRANSITION') {
      return this.chooseTransitionJob(
        player,
        strategy,
        Boolean(teamCarrier),
      )
    }

    return player.role === 'brute' ? 'defensiveCover' : 'supportOutlet'
  }

  private chooseOffenseJob(
    player: Player,
    strategy: TeamStrategy,
    carrier: Player | null,
    core: Core,
  ): TacticalJob {
    if (carrier?.id === player.id) {
      return 'carrier'
    }

    if (
      carrier &&
      player.role === 'support' &&
      strategy.offenseScheme === 'giveAndGo'
    ) {
      return 'playmaker'
    }

    switch (strategy.offenseScheme) {
      case 'behindNet': {
        return resolveBehindNetOffBallJob(
          carrier?.position ?? null,
          this.attackGoal(player.teamSide),
          spacingConfig.deepAttackActivationDistance,
        )
      }
      case 'sideSpread':
        return this.isWeakSide(player.position, carrier?.position ?? core.position)
          ? 'weakSideLane'
          : 'strongSideLane'
      case 'verticalStack':
        return player.role === 'striker' ? 'verticalHigh' : 'verticalMiddle'
      case 'crashNet':
        return player.role === 'striker' ? 'frontSlot' : 'reboundHunter'
      case 'bankHunter':
        return carrier &&
          this.isBehindGoal(
            carrier.position,
            this.attackGoal(player.teamSide),
            player.teamSide,
          )
          ? 'frontSlot'
          : 'bankRebound'
      case 'giveAndGo':
        return this.previousCarrierIds[player.teamSide] === player.id
          ? 'frontSlot'
          : 'supportOutlet'
      default: {
        const nearGoal =
          carrier &&
          distance(carrier.position, this.attackGoal(player.teamSide)) <=
            keeperAreaConfig.keeperZoneRadius * 2.5

        if (
          nearGoal &&
          (player.role === 'striker' || carrier.role === 'support')
        ) {
          return 'frontSlot'
        }

        if (
          spacingConfig.enableBehindGoalCuts &&
          nearGoal &&
          stableChance(player.id, core.position) <
            (player.role === 'support'
              ? spacingConfig.behindGoalCutChanceSupport
              : spacingConfig.behindGoalCutChanceStriker)
        ) {
          return 'behindNet'
        }
        return player.role === 'brute' ? 'defensiveCover' : 'supportOutlet'
      }
    }
  }

  private chooseDefenseJob(
    player: Player,
    scheme: DefenseScheme,
    opponentCarrier: Player | null,
  ): TacticalJob {
    switch (scheme) {
      case 'manMark':
        return 'manMark'
      case 'lowBlock':
        return 'defensiveCover'
      case 'highPress':
        return 'manMark'
      case 'trapBehindGoal':
        return opponentCarrier &&
          this.isBehindGoal(
            opponentCarrier.position,
            this.ownGoal(player.teamSide),
            oppositeSide(player.teamSide),
          )
          ? 'frontSlot'
          : 'zoneGuard'
      case 'bruteShadow':
        return player.role === 'brute' ? 'manMark' : 'defensiveCover'
      default:
        return 'zoneGuard'
    }
  }

  private chooseTransitionJob(
    player: Player,
    strategy: TeamStrategy,
    gainedPossession: boolean,
  ): TacticalJob {
    if (!gainedPossession) {
      return strategy.transitionScheme === 'regroup'
        ? 'defensiveCover'
        : 'zoneGuard'
    }

    switch (strategy.transitionScheme) {
      case 'counterAttack':
        return player.role === 'striker' ? 'verticalHigh' : 'supportOutlet'
      case 'regroup':
        return 'verticalLow'
      case 'pressAfterLoss':
        return 'strongSideLane'
      case 'safeOutlet':
        return 'supportOutlet'
      default:
        return player.role === 'striker' ? 'verticalMiddle' : 'supportOutlet'
    }
  }

  private stabilizeJob(
    playerId: string,
    desiredJob: TacticalJob,
    forceTransition = false,
  ): TacticalJob {
    const current = this.jobStates.get(playerId)

    if (!current) {
      this.jobStates.set(playerId, {
        job: desiredJob,
        cooldownMs: tacticsConfig.tacticalJobSwitchCooldownMs,
      })
      return desiredJob
    }

    const leavingPressure =
      current.job === 'primaryPresser' &&
      desiredJob !== 'primaryPresser'

    if (
      current.job !== desiredJob &&
      (forceTransition || leavingPressure || current.cooldownMs <= 0)
    ) {
      current.job = desiredJob
      current.cooldownMs = tacticsConfig.tacticalJobSwitchCooldownMs
    }

    return current.job
  }

  private setAssignment(
    player: Player,
    job: TacticalJob,
    target: Point,
  ): void {
    this.jobStates.set(player.id, {
      job,
      cooldownMs: tacticsConfig.tacticalJobSwitchCooldownMs,
    })
    this.assignments.set(player.id, {
      job,
      target: { ...target },
    })
  }

  private getJobTarget(
    job: TacticalJob,
    player: Player,
    teammates: Player[],
    opponents: Player[],
    carrier: Player | null,
    opponentCarrier: Player | null,
    core: Core,
    defenseScheme: DefenseScheme,
  ): { target: Point; markTargetId?: string } {
    const side = player.teamSide
    const direction = this.attackDirection(side)
    const right = { x: -direction.y, y: direction.x }
    const ownGoal = this.ownGoal(side)
    const attackGoal = this.attackGoal(side)
    const anchor = carrier?.position ?? core.position
    const laneSign = resolveWeakSideLaneSign(
      anchor.x,
      arenaConfig.center.x,
    )
    const supportPreferredSpacing =
      this.phases[side] === 'OFFENSE'
        ? spacingConfig.offenseSupportPreferredSpacing
        : spacingConfig.supportPreferredSpacing
    const supportMinSpacing =
      this.phases[side] === 'OFFENSE'
        ? spacingConfig.offenseSupportMinSpacingFromCarrier
        : spacingConfig.supportMinSpacingFromCarrier

    switch (job) {
      case 'carrier':
        return { target: { ...player.position } }
      case 'playmaker':
      case 'supportOutlet':
        return {
          target: {
            x:
              anchor.x +
              right.x * supportPreferredSpacing * laneSign,
            y:
              anchor.y +
              right.y * supportPreferredSpacing * laneSign -
              direction.y *
                Math.max(
                  supportMinSpacing,
                  supportPreferredSpacing * 0.42,
                ),
          },
        }
      case 'frontSlot':
        if (defenseScheme === 'trapBehindGoal' && opponentCarrier) {
          return {
            target: this.slotTarget(
              ownGoal,
              { x: -direction.x, y: -direction.y },
              right,
              laneSign,
              0.3,
            ),
          }
        }
        return {
          target: this.slotTarget(
            attackGoal,
            direction,
            right,
            laneSign,
            0.3,
          ),
        }
      case 'behindNet':
        return {
          target: this.behindGoalTarget(
            attackGoal,
            direction,
            right,
            laneSign,
          ),
        }
      case 'weakSideLane':
      case 'strongSideLane': {
        const strongSign = anchor.x < arenaConfig.center.x ? -1 : 1
        const sign = job === 'strongSideLane' ? strongSign : -strongSign
        return {
          target: {
            x:
              arenaConfig.center.x +
              sign *
                arenaConfig.width *
                tacticsConfig.sideLaneWidthRatio,
            y: Phaser.Math.Linear(anchor.y, attackGoal.y, 0.28),
          },
        }
      }
      case 'verticalHigh':
        return {
          target: this.verticalTarget(side, tacticsConfig.verticalHighDepth),
        }
      case 'verticalMiddle':
        return {
          target: this.verticalTarget(side, tacticsConfig.verticalMiddleDepth),
        }
      case 'verticalLow':
        return {
          target: this.verticalTarget(side, tacticsConfig.verticalLowDepth),
        }
      case 'defensiveCover': {
        const threat = opponentCarrier?.position ?? core.position
        const depth =
          defenseScheme === 'lowBlock'
            ? tacticsConfig.lowBlockDepth
            : 0.48
        return {
          target: blendPoints(ownGoal, threat, depth),
        }
      }
      case 'manMark': {
        const mark = this.selectMark(player, teammates, opponents, opponentCarrier)
        if (!mark) {
          return { target: blendPoints(ownGoal, core.position, 0.46) }
        }
        const goalSide = normalized(subtract(ownGoal, mark.position), {
          x: 0,
          y: -direction.y,
        })
        return {
          target: {
            x:
              mark.position.x +
              goalSide.x * tacticsConfig.manMarkGoalSideOffset,
            y:
              mark.position.y +
              goalSide.y * tacticsConfig.manMarkGoalSideOffset,
          },
          markTargetId: mark.id,
        }
      }
      case 'zoneGuard':
        return {
          target: {
            x:
              ownGoal.x +
              Phaser.Math.Clamp(
                core.position.x - ownGoal.x,
                -tacticsConfig.zoneGuardWidth,
                tacticsConfig.zoneGuardWidth,
              ) *
                0.48,
            y:
              ownGoal.y +
              direction.y *
                (keeperAreaConfig.keeperZoneRadius +
                  playerRuntimeConfig.radius +
                  58),
          },
        }
      case 'reboundHunter':
        return {
          target: this.slotTarget(
            attackGoal,
            direction,
            right,
            laneSign,
            0.62,
          ),
        }
      case 'bankRebound': {
        const left = arenaConfig.center.x - arenaConfig.width / 2
        const rightWall = arenaConfig.center.x + arenaConfig.width / 2
        return {
          target: {
            x:
              laneSign < 0
                ? left + tacticsConfig.bankReboundWallInset
                : rightWall - tacticsConfig.bankReboundWallInset,
            y:
              attackGoal.y -
              direction.y * keeperAreaConfig.keeperZoneRadius * 1.18,
          },
        }
      }
      case 'defensiveCleanup':
        return { target: { ...core.position } }
      case 'creaseSupport': {
        const lateralSign =
          player.position.x < ownGoal.x ? -1 : 1
        return {
          target: {
            x:
              ownGoal.x +
              lateralSign *
                keeperAreaConfig.keeperZoneRadius *
                0.58,
            y:
              ownGoal.y +
              direction.y *
                keeperAreaConfig.keeperZoneRadius *
                0.34,
          },
        }
      }
      case 'outletAfterClear': {
        const lateralSign =
          core.position.x < ownGoal.x ? 1 : -1
        return {
          target: {
            x:
              ownGoal.x +
              lateralSign *
                keeperZoneRulesConfig.creaseOutletSpacing *
                0.72,
            y:
              ownGoal.y +
              direction.y *
                (keeperAreaConfig.keeperZoneRadius +
                  keeperZoneRulesConfig.creaseOutletSpacing),
          },
        }
      }
      default:
        return { target: { ...core.position } }
    }
  }

  private selectMark(
    player: Player,
    teammates: Player[],
    opponents: Player[],
    opponentCarrier: Player | null,
  ): Player | null {
    const alreadyMarked = new Set(
      teammates
        .filter((teammate) => teammate.id !== player.id)
        .map((teammate) => this.assignments.get(teammate.id)?.markTargetId)
        .filter((id): id is string => Boolean(id)),
    )
    const candidates = opponents.filter(
      (opponent) =>
        opponent.role !== 'keeper' &&
        opponent.id !== opponentCarrier?.id &&
        !alreadyMarked.has(opponent.id),
    )

    return (
      candidates.sort(
        (a, b) =>
          distance(a.position, player.position) -
          distance(b.position, player.position),
      )[0] ??
      opponentCarrier ??
      null
    )
  }

  private slotTarget(
    goal: Point,
    direction: Point,
    right: Point,
    laneSign: number,
    lateralRatio: number,
  ): Point {
    const slotDistance =
      keeperAreaConfig.keeperZoneRadius +
      spacingConfig.frontSlotSpacing * 0.35

    return {
      x:
        goal.x +
        right.x *
          spacingConfig.frontSlotSpacing *
          lateralRatio *
          laneSign,
      y: goal.y - direction.y * slotDistance,
    }
  }

  private behindGoalTarget(
    goal: Point,
    direction: Point,
    right: Point,
    laneSign: number,
  ): Point {
    const radialDistance =
      keeperAreaConfig.keeperZoneRadius +
      playerRuntimeConfig.radius +
      keeperAreaConfig.keeperZoneBoundaryBuffer +
      12
    const depth = Math.min(
      spacingConfig.behindGoalSpacing,
      radialDistance * 0.55,
    )
    const lateral = Math.sqrt(
      Math.max(0, radialDistance * radialDistance - depth * depth),
    )

    return {
      x: goal.x + right.x * lateral * laneSign + direction.x * depth,
      y: goal.y + right.y * lateral * laneSign + direction.y * depth,
    }
  }

  private verticalTarget(side: TeamSide, depth: number): Point {
    const ownGoal = this.ownGoal(side)
    const attackGoal = this.attackGoal(side)

    return {
      x: arenaConfig.center.x,
      y: Phaser.Math.Linear(ownGoal.y, attackGoal.y, depth),
    }
  }

  private applySpacing(
    target: Point,
    player: Player,
    teammates: Player[],
    job: TacticalJob,
    carrier: Player | null = null,
  ): Point {
    const safeTarget = sanitizeVector(
      target,
      player.position,
      {
        label: '[Invalid Tactical Target]',
        playerId: player.id,
        system: `TeamShapeSystem.${job}`,
      },
    )
    let adjusted = { ...safeTarget }
    const offenseSpacing = this.phases[player.teamSide] === 'OFFENSE'
    const avoidClusterRadius = offenseSpacing
      ? spacingConfig.offenseAvoidClusterRadius
      : spacingConfig.avoidClusterRadius
    const teammateRepulsionStrength = offenseSpacing
      ? spacingConfig.offenseTeammateRepulsionStrength
      : spacingConfig.teammateRepulsionStrength

    for (const teammate of teammates) {
      if (teammate.id === player.id) {
        continue
      }

      const separation = distance(adjusted, teammate.position)

      if (separation >= avoidClusterRadius) {
        continue
      }

      const away = normalized(
        subtract(adjusted, teammate.position),
        player.teamSide === 'A' ? { x: 1, y: 0 } : { x: -1, y: 0 },
      )
      const strength =
        (1 - separation / avoidClusterRadius) *
        avoidClusterRadius *
        teammateRepulsionStrength
      adjusted = {
        x: adjusted.x + away.x * strength,
        y: adjusted.y + away.y * strength,
      }
    }

    const avoidanceOffset = clampVectorMagnitude(
      subtract(adjusted, safeTarget),
      avoidClusterRadius *
        spacingConfig.avoidanceMaxInfluence,
    )
    adjusted = {
      x: safeTarget.x + avoidanceOffset.x,
      y: safeTarget.y + avoidanceOffset.y,
    }

    if (offenseSpacing && carrier && carrier.id !== player.id) {
      adjusted = enforceMinimumSeparation(
        adjusted,
        carrier.position,
        spacingConfig.offenseCarrierExclusionRadius,
        {
          x: resolveWeakSideLaneSign(
            carrier.position.x,
            arenaConfig.center.x,
          ),
          y: 0,
        },
      )
    }

    const allowOwnOuterZone =
      job === 'defensiveCleanup' || job === 'creaseSupport'

    return this.clampToArena(
      clampFieldPlayerTargetToLegalZones(
        player,
        this.clampToArena(adjusted),
        allowOwnOuterZone,
      ),
    )
  }

  private clampToArena(point: Point): Point {
    const padding =
      arenaConfig.wallThickness / 2 + playerRuntimeConfig.radius + 8
    const left = arenaConfig.center.x - arenaConfig.width / 2 + padding
    const right = arenaConfig.center.x + arenaConfig.width / 2 - padding
    const top = arenaConfig.center.y - arenaConfig.height / 2 + padding
    const bottom = arenaConfig.center.y + arenaConfig.height / 2 - padding

    return {
      x: Phaser.Math.Clamp(point.x, left, right),
      y: Phaser.Math.Clamp(point.y, top, bottom),
    }
  }

  private drawDebug(players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    this.graphics.clear()
    const visibleIds = new Set<string>()

    for (const player of players) {
      const assignment = this.assignments.get(player.id)

      if (!assignment || assignment.job === 'keeper') {
        continue
      }

      visibleIds.add(player.id)
      const color = jobColor(assignment.job)
      this.graphics.lineStyle(2, color, 0.55)
      this.graphics.lineBetween(
        player.position.x,
        player.position.y,
        assignment.target.x,
        assignment.target.y,
      )
      this.graphics.lineStyle(3, color, 0.9)
      this.graphics.strokeCircle(
        assignment.target.x,
        assignment.target.y,
        spacingConfig.debug.targetRadius,
      )

      if (assignment.markTargetId) {
        const mark = players.find(
          (candidate) => candidate.id === assignment.markTargetId,
        )
        if (mark) {
          this.graphics.lineStyle(2, color, 0.35)
          this.graphics.lineBetween(
            player.position.x,
            player.position.y,
            mark.position.x,
            mark.position.y,
          )
        }
      }

      this.getLabel(player.id)
        .setPosition(player.position.x + 18, player.position.y - 28)
        .setText(assignment.job)
        .setVisible(true)
    }

    for (const [playerId, label] of this.labels) {
      if (!visibleIds.has(playerId)) {
        label.setVisible(false)
      }
    }

    this.drawSchemeDebug('A')
    this.drawSchemeDebug('B')
  }

  private drawSchemeDebug(side: TeamSide): void {
    const strategy = this.strategies[side]
    const ownGoal = this.ownGoal(side)
    const direction = this.attackDirection(side)
    const presser = this.pressers[side].playerId ?? '-'
    const cleanup = this.cleanupAssignments[side].join(', ') || '-'
    const labelY =
      ownGoal.y + direction.y * (keeperAreaConfig.keeperZoneRadius + 92)

    this.strategyLabels[side]
      .setPosition(arenaConfig.center.x, labelY)
      .setText(
        `${side} ${this.phases[side]} | ${strategy.offenseScheme} / ` +
          `${strategy.defenseScheme} / ${strategy.transitionScheme}\n` +
          `PRESSER ${presser} | CLEANUP ${cleanup}`,
      )
      .setVisible(true)

    if (strategy.defenseScheme === 'zoneTriangle') {
      const zoneCenter = {
        x: ownGoal.x,
        y:
          ownGoal.y +
          direction.y * (keeperAreaConfig.keeperZoneRadius + 86),
      }
      this.graphics.lineStyle(
        2,
        spacingConfig.debug.coverColor,
        tacticsConfig.debug.zoneAlpha,
      )
      this.graphics.strokeTriangle(
        ownGoal.x,
        ownGoal.y + direction.y * keeperAreaConfig.keeperZoneRadius,
        zoneCenter.x - tacticsConfig.zoneGuardWidth,
        zoneCenter.y + direction.y * 80,
        zoneCenter.x + tacticsConfig.zoneGuardWidth,
        zoneCenter.y + direction.y * 80,
      )
    } else if (strategy.defenseScheme === 'lowBlock') {
      this.graphics.lineStyle(
        2,
        spacingConfig.debug.coverColor,
        tacticsConfig.debug.zoneAlpha,
      )
      this.graphics.strokeCircle(
        ownGoal.x,
        ownGoal.y,
        keeperAreaConfig.keeperZoneRadius * 1.72,
      )
    }
  }

  private getLabel(playerId: string): Phaser.GameObjects.Text {
    const existing = this.labels.get(playerId)

    if (existing) {
      return existing
    }

    const label = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: tacticsConfig.debug.panelColor,
        padding: { x: 4, y: 2 },
      })
      .setDepth(20)
      .setVisible(this.debugEnabled)

    this.labels.set(playerId, label)
    return label
  }

  private createStrategyLabel(): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: '700',
        color: tacticsConfig.debug.phaseLabelColor,
        backgroundColor: tacticsConfig.debug.panelColor,
        align: 'center',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)
  }

  private ownGoal(side: TeamSide): Point {
    return keeperAreaConfig.areas[side]
  }

  private attackGoal(side: TeamSide): Point {
    return keeperAreaConfig.areas[oppositeSide(side)]
  }

  private attackDirection(side: TeamSide): Point {
    return { x: 0, y: side === 'A' ? -1 : 1 }
  }

  private isBehindGoal(
    point: Point,
    goal: Point,
    attackingSide: TeamSide,
  ): boolean {
    const direction = this.attackDirection(attackingSide)
    return (
      (point.x - goal.x) * direction.x +
        (point.y - goal.y) * direction.y >
      0
    )
  }

  private isWeakSide(player: Point, anchor: Point): boolean {
    const anchorSign = anchor.x < arenaConfig.center.x ? -1 : 1
    const playerSign = player.x < arenaConfig.center.x ? -1 : 1
    return anchorSign !== playerSign
  }
}

function jobColor(job: TacticalJob): number {
  switch (job) {
    case 'carrier':
      return 0xffd36a
    case 'playmaker':
    case 'supportOutlet':
    case 'weakSideLane':
    case 'strongSideLane':
      return spacingConfig.debug.outletColor
    case 'primaryPresser':
      return spacingConfig.debug.presserColor
    case 'defensiveCover':
    case 'zoneGuard':
    case 'manMark':
    case 'defensiveCleanup':
    case 'creaseSupport':
      return spacingConfig.debug.coverColor
    case 'behindNet':
    case 'bankRebound':
      return spacingConfig.debug.behindGoalColor
    case 'frontSlot':
    case 'reboundHunter':
    case 'verticalHigh':
    case 'verticalMiddle':
    case 'verticalLow':
    case 'outletAfterClear':
      return spacingConfig.debug.frontSlotColor
    default:
      return 0xffffff
  }
}

function oppositeSide(side: TeamSide): TeamSide {
  return side === 'A' ? 'B' : 'A'
}

function stableChance(seed: string, point: Point): number {
  let hash = 2166136261
  const value = `${seed}:${Math.round(point.x / 90)}:${Math.round(point.y / 90)}`

  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967295
}

function blendPoints(start: Point, end: Point, amount: number): Point {
  const clamped = Phaser.Math.Clamp(amount, 0, 1)

  return {
    x: Phaser.Math.Linear(start.x, end.x, clamped),
    y: Phaser.Math.Linear(start.y, end.y, clamped),
  }
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function normalized(vector: Point, fallback: Point): Point {
  return normalizeSafe(vector, fallback)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
