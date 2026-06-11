import Phaser from 'phaser'
import {
  getAiBankShotError,
  getAiCarryPatienceMultiplier,
  getAiDecisionSpeed,
  getAiPassError,
  getAiShotError,
  getAiShotSelectionBonus,
  type AIAssistContext,
} from '../ai/AIAssist'
import { createAIDecisionContext } from '../ai/AIDecisionContext'
import { decideDefenseActions } from '../ai/DefenseBehavior'
import { getPlayStyleModifiers } from '../ai/PlayStyleModifiers'
import { decideRoleIntent } from '../ai/RoleBehaviors'
import { aiCarrierConfig } from '../config/aiCarrierConfig'
import { aiConfig } from '../config/aiConfig'
import { aiOffenseConfig } from '../config/aiOffenseConfig'
import { arenaConfig } from '../config/arenaConfig'
import { defenseConfig } from '../config/defenseConfig'
import { coreConfig } from '../config/entityConfig'
import { goalConfig, goalConfigs } from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { stickConfig } from '../config/stickConfig'
import { tacticsConfig } from '../config/tacticsConfig'
import type { Point } from '../data/geometry'
import type {
  FormationAIBias,
  PlayerControlIntent,
  TeamSide,
  TeamTacticalQuality,
} from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import {
  clampFieldPlayerTargetToLegalZones,
  isPointInOpponentKeeperZone,
} from '../rules/KeeperZoneAccess'
import type { TacticalAssignment, TacticalJob } from '../tactics/TacticalJobs'
import type { TeamStrategy } from '../tactics/TeamStrategy'
import {
  type AIBankShotCandidate,
  type AIShotEvaluation,
} from './AIBankShotSystem'
import { AIScoringSystem } from './AIScoringSystem'
import {
  AICarrierIntentSystem,
  type AICarrierIntentDebugState,
  type CarrierIntent,
  type CarrierIntentType,
} from './AICarrierIntentSystem'
import {
  KeeperAISystem,
  type KeeperAIDebugState,
} from './KeeperAISystem'
import { TeamShapeSystem } from './TeamShapeSystem'

export type AIDecisionDebugState = {
  job: TacticalJob | null
  decision: string
  gatherAllowed: boolean
  gatherDeniedReason: string
  passTargetId: string | null
  passLaneScore: number
  passDeniedReason: string
  shotReason: string
  directShotScore: number
  bankShotScore: number
  passShotScore: number
  chosenAction: string
  directShotTarget: Point | null
  bankShotSelected: boolean
  selectedBankReflection: Point | null
  bankCandidates: AIBankShotCandidate[]
  carrierIntent: AICarrierIntentDebugState | null
}

export type AIOffenseMetricLine = {
  shotsAttempted: number
  directShots: number
  bankShots: number
  passesToShot: number
  goals: number
  ownGoals: number
  shotsSaved: number
  shotsBlocked: number
  shotsHitPost: number
  shotsWide: number
}

export type AIOffenseMetrics = Record<TeamSide, AIOffenseMetricLine>

type PlannedOffenseAction = {
  teamSide: TeamSide
  kind: 'directShot' | 'bankShot' | 'pass'
  passToShot: boolean
}

type ActiveAIShot = {
  side: TeamSide
  previousPosition: Point
  hitPost: boolean
}

type PossessionDecision = {
  intent: PlayerControlIntent
  decision: string
  passTargetId: string | null
  passLaneScore: number
  passShotScore: number
  passDeniedReason: string
  shotReason: string
  bankShotSelected: boolean
  selectedBankReflection: Point | null
  shotEvaluation: AIShotEvaluation
}

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly debugLabels = new Map<string, Phaser.GameObjects.Text>()
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private readonly tacticalQualities: Record<
    TeamSide,
    TeamTacticalQuality
  >
  private readonly keeperAI: KeeperAISystem
  private readonly teamShape: TeamShapeSystem
  private readonly scoring = new AIScoringSystem()
  private readonly carrierIntent = new AICarrierIntentSystem()
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()
  private decisions = new Map<string, AIDecisionDebugState>()
  private overrideActive = new Set<string>()
  private overrideCooldowns = new Map<string, number>()
  private carrierPossessionId: string | null = null
  private carrierPossessionMs = 0
  private committedCarrierDecision: PossessionDecision | null = null
  private shotCooldowns = new Map<string, number>()
  private plannedOffenseActions = new Map<string, PlannedOffenseAction>()
  private offenseMetrics = createEmptyOffenseMetrics()
  private lastAIShotSide: TeamSide | null = null
  private lastAIShotWindowMs = 0
  private activeAIShot: ActiveAIShot | null = null

  constructor(
    scene: Phaser.Scene,
    formationBiases: Record<TeamSide, FormationAIBias>,
    strategies: Record<TeamSide, TeamStrategy>,
    tacticalQualities: Record<TeamSide, TeamTacticalQuality>,
  ) {
    this.formationBiases = formationBiases
    this.tacticalQualities = tacticalQualities
    this.debugGraphics = scene.add.graphics().setDepth(18)
    this.keeperAI = new KeeperAISystem(scene)
    this.teamShape = new TeamShapeSystem(scene, strategies)
  }

  update(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
    deltaMs: number,
    humanKeeperBias: Point,
  ): Map<string, PlayerControlIntent> {
    const carrierChanged = this.updateCarrierPossessionClock(
      carrierId,
      deltaMs,
    )
    if (carrierChanged) {
      this.decisionTimerMs = 0
    }
    this.updateOverrideCooldowns(deltaMs)
    this.updateShotCooldowns(deltaMs)
    const previousShotWindowMs = this.lastAIShotWindowMs
    this.lastAIShotWindowMs = Math.max(
      0,
      this.lastAIShotWindowMs - deltaMs,
    )
    if (
      previousShotWindowMs > 0 &&
      this.lastAIShotWindowMs === 0 &&
      this.activeAIShot
    ) {
      if (!this.activeAIShot.hitPost) {
        this.offenseMetrics[this.activeAIShot.side].shotsWide += 1
      }
      this.clearActiveShot()
    }
    this.teamShape.update(
      players,
      core,
      carrierId,
      controlledPlayerId,
      deltaMs,
    )
    this.updateKeepers(
      players,
      core,
      carrierId,
      controlledPlayerId,
      humanKeeperBias,
    )
    this.decisionTimerMs -= deltaMs
    if (this.decisionTimerMs <= 0) {
      this.rethink(players, core, carrierId, controlledPlayerId)
      this.decisionTimerMs = this.getDecisionInterval(
        players,
        controlledPlayerId,
      )
    }

    this.updateCarrierRuntime(players, carrierId, deltaMs)
    this.drawDebug(players)
    this.keeperAI.drawDebug()
    return this.intents
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.keeperAI.setDebugEnabled(enabled)
    this.teamShape.setDebugEnabled(enabled)

    for (const label of this.debugLabels.values()) {
      label.setVisible(enabled)
    }

    if (!enabled) {
      this.debugGraphics.clear()
    }
  }

  getKeeperDebugState(side: TeamSide): KeeperAIDebugState | null {
    return this.keeperAI.getDebugState(side)
  }

  getTeamStrategy(side: TeamSide): TeamStrategy {
    return this.teamShape.getStrategy(side)
  }

  getTeamPhase(side: TeamSide) {
    return this.teamShape.getPhase(side)
  }

  getTacticalAssignment(playerId: string): TacticalAssignment | null {
    return this.teamShape.getAssignment(playerId)
  }

  getTacticalAssignments(): Map<string, TacticalAssignment> {
    return this.teamShape.getAssignments()
  }

  getCleanupPlayerIds(side: TeamSide): string[] {
    return this.teamShape.getCleanupPlayerIds(side)
  }

  getDecisionDebug(playerId: string): AIDecisionDebugState | null {
    const state = this.decisions.get(playerId)
    return state ? { ...state } : null
  }

  forceCarrierRelease(playerId: string, reason: string): void {
    this.carrierIntent.forceRelease(playerId, reason)
    this.decisionTimerMs = 0
  }

  getOffenseMetrics(): AIOffenseMetrics {
    return {
      A: { ...this.offenseMetrics.A },
      B: { ...this.offenseMetrics.B },
    }
  }

  recordRelease(player: Player, corePosition: Point): void {
    const action = this.plannedOffenseActions.get(player.id)
    this.carrierIntent.clearPlayer(player.id)
    if (this.carrierPossessionId === player.id) {
      this.committedCarrierDecision = null
    }

    if (!action) {
      return
    }

    const metrics = this.offenseMetrics[action.teamSide]

    if (action.kind === 'pass') {
      if (action.passToShot) {
        metrics.passesToShot += 1
      }
    } else {
      metrics.shotsAttempted += 1
      if (action.kind === 'bankShot') {
        metrics.bankShots += 1
      } else {
        metrics.directShots += 1
      }
      this.lastAIShotSide = action.teamSide
      this.lastAIShotWindowMs = 4000
      this.activeAIShot = {
        side: action.teamSide,
        previousPosition: { ...corePosition },
        hitPost: false,
      }
      this.shotCooldowns.set(
        player.id,
        aiOffenseConfig.aiShotCooldownMs,
      )
    }

    this.plannedOffenseActions.delete(player.id)
  }

  recordSave(defendingSide: TeamSide): void {
    if (
      this.lastAIShotWindowMs <= 0 ||
      this.lastAIShotSide === null ||
      this.lastAIShotSide === defendingSide
    ) {
      return
    }

    this.offenseMetrics[this.lastAIShotSide].shotsSaved += 1
    this.clearActiveShot()
  }

  recordShotBlock(blockingPlayer: Player): void {
    if (
      !this.activeAIShot ||
      blockingPlayer.teamSide === this.activeAIShot.side
    ) {
      return
    }

    this.offenseMetrics[this.activeAIShot.side].shotsBlocked += 1
    this.clearActiveShot()
  }

  recordGoal(scoringSide: TeamSide): void {
    if (
      this.lastAIShotWindowMs <= 0 ||
      this.lastAIShotSide === null
    ) {
      return
    }

    if (this.lastAIShotSide === scoringSide) {
      this.offenseMetrics[scoringSide].goals += 1
    } else {
      this.offenseMetrics[this.lastAIShotSide].ownGoals += 1
    }

    this.clearActiveShot()
  }

  observeShotFlight(position: Point): void {
    const shot = this.activeAIShot

    if (!shot) {
      return
    }

    const goal = goalConfigs.find((candidate) =>
      shot.side === 'A'
        ? candidate.id === 'top-goal'
        : candidate.id === 'bottom-goal',
    )

    if (!goal) {
      return
    }

    const postContactRadius =
      goalConfig.goalPostRadius + coreConfig.radius + 2
    const postX = [
      goal.x - goal.length / 2,
      goal.x + goal.length / 2,
    ]
    const hitPost = postX.some(
      (x) =>
        distanceToSegment(
          { x, y: goal.y },
          shot.previousPosition,
          position,
        ) <= postContactRadius,
    )

    if (hitPost && !shot.hitPost) {
      shot.hitPost = true
      this.offenseMetrics[shot.side].shotsHitPost += 1
    }

    const crossedGoalPlane =
      shot.side === 'A'
        ? shot.previousPosition.y > goal.y && position.y <= goal.y
        : shot.previousPosition.y < goal.y && position.y >= goal.y

    if (crossedGoalPlane) {
      const deltaY = position.y - shot.previousPosition.y
      const progress =
        Math.abs(deltaY) < 0.0001
          ? 0
          : Phaser.Math.Clamp(
              (goal.y - shot.previousPosition.y) / deltaY,
              0,
              1,
            )
      const crossingX =
        shot.previousPosition.x +
        (position.x - shot.previousPosition.x) * progress
      const scoringHalfWidth =
        goal.length / 2 -
        Math.max(
          0,
          goalConfig.goalPostRadius +
            coreConfig.radius -
            goalConfig.scoringPlaneTolerance,
        )

      if (
        Math.abs(crossingX - goal.x) > scoringHalfWidth &&
        !shot.hitPost
      ) {
        this.offenseMetrics[shot.side].shotsWide += 1
        this.clearActiveShot()
        return
      }
    }

    shot.previousPosition = { ...position }
  }

  resetMetrics(): void {
    this.offenseMetrics = createEmptyOffenseMetrics()
    this.lastAIShotSide = null
    this.lastAIShotWindowMs = 0
    this.activeAIShot = null
  }

  reset(): void {
    this.decisionTimerMs = 0
    this.intents.clear()
    this.decisions.clear()
    this.overrideActive.clear()
    this.overrideCooldowns.clear()
    this.carrierPossessionId = null
    this.carrierPossessionMs = 0
    this.committedCarrierDecision = null
    this.carrierIntent.reset()
    this.shotCooldowns.clear()
    this.plannedOffenseActions.clear()
    this.lastAIShotSide = null
    this.lastAIShotWindowMs = 0
    this.activeAIShot = null
    this.teamShape.reset()
  }

  private clearActiveShot(): void {
    this.lastAIShotSide = null
    this.lastAIShotWindowMs = 0
    this.activeAIShot = null
  }

  private updateKeepers(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
    humanKeeperBias: Point,
  ): void {
    const carrier =
      players.find((player) => player.id === carrierId) ?? null

    for (const player of players.filter(
      (candidate) => candidate.role === 'keeper',
    )) {
      if (player.id === controlledPlayerId) {
        this.intents.delete(player.id)
        continue
      }

      const context = createAIDecisionContext(
        player,
        players,
        core,
        carrier,
        goalPoint(player.teamSide),
        goalPoint(player.teamSide === 'A' ? 'B' : 'A'),
        this.formationBiases[player.teamSide],
        this.tacticalQualities[player.teamSide],
      )
      const bias =
        player.teamSide === 'A'
          ? humanKeeperBias
          : { x: 0, y: 0 }
      const intent = this.keeperAI.decide(context, bias)

      this.intents.set(player.id, intent)
      player.setAIState(intent.aiState)
    }
  }

  private rethink(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
  ): void {
    const carrier =
      players.find((player) => player.id === carrierId) ?? null

    for (const player of players) {
      if (player.id === controlledPlayerId || player.role === 'keeper') {
        continue
      }

      const context = createAIDecisionContext(
        player,
        players,
        core,
        carrier,
        goalPoint(player.teamSide),
        goalPoint(player.teamSide === 'A' ? 'B' : 'A'),
        this.formationBiases[player.teamSide],
        this.tacticalQualities[player.teamSide],
      )
      const baseIntent = decideRoleIntent(context)
      const schemeIntent = baseIntent
      const assignment = this.teamShape.getAssignment(player.id)
      const possessionDecision = context.isCarrier
        ? this.resolveCommittedPossessionDecision(
            context,
            schemeIntent,
          )
        : null
      const gatherDecision = context.isCarrier
        ? null
        : this.evaluateGatherOverride(
            context,
            assignment,
            carrier,
            players,
          )
      const followsShape =
        !context.isCarrier &&
        assignment !== null &&
        assignment.job !== 'primaryPresser' &&
        assignment.job !== 'keeper'
      const highPressing =
        assignment?.job === 'primaryPresser' &&
        this.teamShape.getStrategy(player.teamSide).defenseScheme ===
          'highPress'
      const shapedIntent = possessionDecision
        ? possessionDecision.intent
        : gatherDecision?.allowed
          ? createGatherIntent(core.position)
          : followsShape
            ? this.applyAdvisoryShape(
                context,
                schemeIntent,
                assignment,
              )
        : highPressing
          ? {
              ...schemeIntent,
              moveSpeedMultiplier: Math.max(
                schemeIntent.moveSpeedMultiplier ?? 1,
                1 + tacticsConfig.highPressAggression * 0.12,
              ),
            }
          : schemeIntent
      const activelyGathering = gatherDecision?.allowed ?? false
      const baseDefense = context.isCarrier
        ? { truck: false, slash: false }
        : followsShape && !activelyGathering
          ? { truck: false, slash: false }
          : decideDefenseActions(context)
      const defense = highPressing
        ? boostHighPressDefense(context, baseDefense)
        : baseDefense
      const allowOwnOuterZone =
        context.isCarrier ||
        activelyGathering ||
        assignment?.job === 'defensiveCleanup' ||
        assignment?.job === 'creaseSupport'
      const legalMoveTarget = clampFieldPlayerTargetToLegalZones(
        player,
        shapedIntent.moveTarget,
        allowOwnOuterZone,
      )

      this.intents.set(player.id, {
        ...shapedIntent,
        moveTarget: legalMoveTarget,
        ...defense,
      })
      player.setAIState(shapedIntent.aiState)
      this.decisions.set(player.id, {
        job:
          context.isCarrier &&
          aiCarrierConfig.freezeCarrierTacticalJob
            ? 'carrier'
            : assignment?.job ?? null,
        decision:
          possessionDecision?.decision ??
          (activelyGathering
            ? gatherDecision?.decision ?? 'GATHER'
            : followsShape
              ? `POSITION_${assignment.job.toUpperCase()}`
              : highPressing
                ? 'HIGH_PRESS'
                : shapedIntent.aiState),
        gatherAllowed: activelyGathering,
        gatherDeniedReason:
          gatherDecision?.reason ?? (context.isCarrier ? 'hasPossession' : '-'),
        passTargetId: possessionDecision?.passTargetId ?? null,
        passLaneScore: possessionDecision?.passLaneScore ?? 0,
        passShotScore: possessionDecision?.passShotScore ?? 0,
        passDeniedReason:
          possessionDecision?.passDeniedReason ?? '-',
        shotReason: possessionDecision?.shotReason ?? '-',
        directShotScore:
          possessionDecision?.shotEvaluation.directScore ?? 0,
        bankShotScore:
          possessionDecision?.shotEvaluation.bestBank?.score ?? 0,
        chosenAction:
          possessionDecision?.decision ?? shapedIntent.aiState,
        directShotTarget:
          possessionDecision?.shotEvaluation.directTarget ?? null,
        bankShotSelected:
          possessionDecision?.bankShotSelected ?? false,
        selectedBankReflection:
          possessionDecision?.selectedBankReflection ?? null,
        bankCandidates:
          possessionDecision?.shotEvaluation.bankCandidates ?? [],
        carrierIntent: context.isCarrier
          ? this.carrierIntent.getDebugState(
              this.carrierPossessionMs,
            )
          : null,
      })
    }
  }

  private applyAdvisoryShape(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
    assignment: TacticalAssignment,
  ): PlayerControlIntent {
    const baseTarget =
      context.carrier === null ? assignment.target : intent.moveTarget
    const moveTarget = blendPoints(
      baseTarget,
      assignment.target,
      tacticsConfig.jobTargetStrictness,
    )

    return {
      ...intent,
      moveTarget,
      aiState: isDefensiveJob(assignment.job)
        ? 'MARK_CARRIER'
        : 'SUPPORT_ATTACK',
    }
  }

  private evaluateGatherOverride(
    context: ReturnType<typeof createAIDecisionContext>,
    assignment: TacticalAssignment | null,
    carrier: Player | null,
    players: Player[],
  ): { allowed: boolean; reason: string; decision: string } {
    const player = context.player
    const distanceToCore = context.distanceToCore
    const loose = carrier === null
    const readMultiplier = Phaser.Math.Clamp(
      getAiDecisionSpeed(player, context),
      0.78,
      1.28,
    )
    const catchable =
      loose &&
      distanceToCore <=
        tacticsConfig.receiverCatchRadius * readMultiplier &&
      (distanceToCore <=
        tacticsConfig.emergencyGatherRadius * readMultiplier ||
        isCoreMovingTowardPlayer(context.core, player))
    const emergency =
      loose &&
      tacticsConfig.looseCoreOverridesJobNearby &&
      distanceToCore <=
        tacticsConfig.emergencyGatherRadius * readMultiplier
    const presser = this.teamShape.getActivePresser(player.teamSide)
    const presserPlayer =
      players.find((candidate) => candidate.id === presser) ?? null
    const presserUnavailable =
      loose &&
      presserPlayer !== null &&
      distance(presserPlayer.position, context.core.position) >
        distanceToCore +
          tacticsConfig.emergencyGatherRadius
    const transitionCollect =
      loose &&
      this.teamShape.getPhase(player.teamSide) === 'TRANSITION' &&
      distanceToCore <=
        tacticsConfig.receiverCatchRadius * readMultiplier
    const candidate =
      catchable || emergency || presserUnavailable || transitionCollect

    if (!candidate) {
      this.finishOverride(player.id)
      return {
        allowed: false,
        reason: carrier ? 'alreadyReceiver' : 'tooFar',
        decision: 'TACTICAL_POSITION',
      }
    }

    if (!tacticsConfig.tacticalOverrideEnabled) {
      this.finishOverride(player.id)
      return {
        allowed: false,
        reason: 'jobStrictness',
        decision: 'TACTICAL_POSITION',
      }
    }

    if (
      isPointInOpponentKeeperZone(
        context.core.position,
        player.teamSide,
      ) &&
      keeperZoneRulesConfig.attackersBlockedFromOpponentKeeperZone
    ) {
      this.finishOverride(player.id)
      return {
        allowed: false,
        reason: 'unsafeKeeperZone',
        decision: 'TACTICAL_POSITION',
      }
    }

    if (
      !this.overrideActive.has(player.id) &&
      (this.overrideCooldowns.get(player.id) ?? 0) > 0
    ) {
      return {
        allowed: false,
        reason: 'cooldown',
        decision: 'TACTICAL_POSITION',
      }
    }

    if (
      assignment?.job !== 'primaryPresser' &&
      presser &&
      presser !== player.id &&
      !catchable &&
      !emergency &&
      !presserUnavailable
    ) {
      this.finishOverride(player.id)
      return {
        allowed: false,
        reason: 'teammatePresserAssigned',
        decision: 'TACTICAL_POSITION',
      }
    }

    this.overrideActive.add(player.id)
    return {
      allowed: true,
      reason: 'ready',
      decision:
        assignment?.job === 'defensiveCleanup'
          ? 'DEFENSIVE_CLEANUP'
          : assignment?.job === 'creaseSupport'
            ? 'CREASE_SUPPORT'
            : catchable
              ? 'RECEIVE_CORE'
              : 'EMERGENCY_GATHER',
    }
  }

  private resolveCommittedPossessionDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
  ): PossessionDecision {
    const latestReleaseStartMs =
      this.carrierIntent.getLatestReleaseStartMs(context.player)
    if (this.carrierPossessionMs >= latestReleaseStartMs) {
      this.carrierIntent.forceRelease(context.player.id, 'maxCarry')
    }
    const forceReleaseReason =
      this.carrierIntent.getForceReleaseReason(context.player.id)
    const candidate = this.applyPossessionDecision(
      context,
      intent,
      forceReleaseReason,
    )
    const candidateIntent = this.describeCarrierIntent(
      context.player,
      candidate,
      forceReleaseReason,
      context.pressure,
    )
    const currentIntent = this.carrierIntent.getIntent(
      context.player.id,
    )
    const targetValid = this.isCarrierTargetValid(
      currentIntent,
      context.players,
      context.player.teamSide,
    )
    const selection = this.carrierIntent.select(
      context.player,
      candidateIntent,
      this.carrierPossessionMs,
      context.pressure,
      targetValid,
    )

    if (selection.changed || !this.committedCarrierDecision) {
      this.committedCarrierDecision = candidate
      if (candidate.intent.releaseTarget) {
        candidate.intent.aiReleaseDelayMs = Math.min(
          latestReleaseStartMs,
          this.carrierPossessionMs +
            selection.intent.releaseAfterChargeMs,
        )
      }
    }

    const committed = this.committedCarrierDecision
    if (committed.intent.releaseTarget) {
      committed.intent.aiReleaseDelayMs = Math.min(
        committed.intent.aiReleaseDelayMs ??
          latestReleaseStartMs,
        latestReleaseStartMs,
      )
    }
    this.syncPlannedOffenseAction(context.player, committed)
    return committed
  }

  private describeCarrierIntent(
    player: Player,
    decision: PossessionDecision,
    forceReleaseReason: string | null,
    pressure: number,
  ): CarrierIntent {
    const intentType = carrierIntentType(decision)
    const targetPoint = {
      ...(decision.intent.releaseTarget ??
        (intentType === 'carryToAngle'
          ? decision.intent.aimTarget
          : decision.intent.aimTarget)),
    }
    const carrySide =
      intentType === 'carryToAngle'
        ? decision.intent.moveTarget.x < player.position.x
          ? 'left'
          : 'right'
        : null
    const releaseAfterChargeMs = decision.intent.releaseTarget
      ? getCarrierChargeTargetMs(
          intentType,
          player,
          pressure,
          forceReleaseReason,
        )
      : 0
    const minCommitMs =
      intentType === 'carryToAngle'
        ? Math.max(
            aiCarrierConfig.aiCarrierMinCommitMs,
            aiCarrierConfig.aiCarrySideCommitMs,
          )
        : aiCarrierConfig.aiCarrierMinCommitMs

    return {
      intentType,
      targetPoint,
      targetPlayerId: decision.passTargetId,
      chosenAtTime: this.carrierPossessionMs,
      minCommitMs,
      maxCommitMs: aiCarrierConfig.aiCarrierMaxCommitMs,
      releaseAfterChargeMs,
      reason: forceReleaseReason ?? decision.shotReason,
      qualityScore: carrierDecisionQuality(decision),
      carrySide,
    }
  }

  private isCarrierTargetValid(
    intent: CarrierIntent | null,
    players: Player[],
    teamSide: TeamSide,
  ): boolean {
    if (!intent) {
      return false
    }

    if (
      intent.intentType !== 'passToTeammate' ||
      !intent.targetPlayerId
    ) {
      return true
    }

    return players.some(
      (player) =>
        player.id === intent.targetPlayerId &&
        player.teamSide === teamSide,
    )
  }

  private syncPlannedOffenseAction(
    player: Player,
    decision: PossessionDecision,
  ): void {
    if (decision.decision === 'PASS') {
      this.plannedOffenseActions.set(player.id, {
        teamSide: player.teamSide,
        kind: 'pass',
        passToShot:
          decision.passShotScore >=
          aiOffenseConfig.aiGoodDirectShotThreshold - 0.08,
      })
      return
    }

    if (decision.decision === 'SHOOT') {
      this.plannedOffenseActions.set(player.id, {
        teamSide: player.teamSide,
        kind: 'directShot',
        passToShot: false,
      })
      return
    }

    if (decision.decision === 'BANK_SHOT') {
      this.plannedOffenseActions.set(player.id, {
        teamSide: player.teamSide,
        kind: 'bankShot',
        passToShot: false,
      })
      return
    }

    this.plannedOffenseActions.delete(player.id)
  }

  private applyPossessionDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
    forceReleaseReason: string | null = null,
  ): PossessionDecision {
    const strategy = this.teamShape.getStrategy(context.player.teamSide)
    const passOption = findBestPassOption(
      context.player,
      context.players,
      this.teamShape,
      context,
    )
    const scoringChance = this.scoring.evaluate(
      context.player,
      context.players,
      strategy,
      passOption?.shotScore ?? 0,
      passOption?.player.position ?? null,
      context,
    )
    const shotEvaluation = scoringChance.shotEvaluation

    if (!tacticsConfig.possessionOverridesJob) {
      return {
        intent,
        decision: intent.aiState,
        passTargetId: null,
        passLaneScore: 0,
        passShotScore: 0,
        passDeniedReason: 'possessionOverrideDisabled',
        shotReason: 'possessionOverrideDisabled',
        bankShotSelected: false,
        selectedBankReflection: null,
        shotEvaluation,
      }
    }

    const pressure = context.pressure
    const behindGoal = isBehindAttackGoal(
      context.player.position,
      context.attackGoal,
      context.player.teamSide,
    )
    const targetJob = passOption?.job ?? null
    const isOpponent = context.player.teamSide === 'B'
    const aggression = context.scoringAggression
    const selectionBonus = getAiShotSelectionBonus(
      context.player,
      context,
    )
    const decisionSpeed = getAiDecisionSpeed(context.player, context)
    let passThreshold = tacticsConfig.passLaneMinScore

    if (context.player.role === 'support') {
      passThreshold -= tacticsConfig.supportPassBias * 0.55
    } else if (context.player.role === 'brute') {
      passThreshold += 0.1
    }

    if (
      behindGoal &&
      targetJob === 'frontSlot' &&
      aiOffenseConfig.passBackToFrontEnabled
    ) {
      passThreshold -= tacticsConfig.behindNetPassBackBias
    }

    const distanceToGoal = distance(
      context.player.position,
      context.attackGoal,
    )
    const inAttackingHalf =
      context.player.teamSide === 'A'
        ? context.player.position.y <= arenaConfig.center.y
        : context.player.position.y >= arenaConfig.center.y
    const roleShotPenalty = context.player.role === 'brute' ? 0.12 : 0
    const directThreshold = Phaser.Math.Clamp(
      aiOffenseConfig.aiGoodDirectShotThreshold -
        aggression * 0.12 +
        roleShotPenalty -
        selectionBonus * 0.45,
      0.25,
      0.9,
    )
    const bankThreshold = Phaser.Math.Clamp(
      aiOffenseConfig.aiGoodBankShotThreshold -
        aggression * 0.1 +
        roleShotPenalty * 0.6 -
        selectionBonus * 0.35,
      0.2,
      0.85,
    )
    const shotFrequency = isOpponent
      ? aiOffenseConfig.opponentAiShotFrequency
      : 0.62
    const bankFrequency = isOpponent
      ? aiOffenseConfig.opponentAiBankShotFrequency
      : 0.32
    const decisionBucket = Math.floor(
      this.carrierPossessionMs /
        Math.max(
          70,
          aiOffenseConfig.opponentAiDecisionIntervalMs /
            decisionSpeed,
        ),
    )
    const shotRoll =
      stableDecisionRoll(context.player.id, decisionBucket, 11) <=
      Phaser.Math.Clamp(
        shotFrequency + selectionBonus * 0.7,
        0.05,
        1,
      )
    const bestBank = shotEvaluation.bestBank
    const bankChance =
      shotEvaluation.directScore < directThreshold
        ? aiOffenseConfig.aiBankShotAttemptChanceWhenBlocked
        : aiOffenseConfig.aiBankShotAttemptChanceWhenOpen
    const bankRoll =
      stableDecisionRoll(context.player.id, decisionBucket, 29) <=
      Phaser.Math.Clamp(bankChance * (0.65 + bankFrequency * 0.7), 0, 1)
    const shotReady =
      (this.shotCooldowns.get(context.player.id) ?? 0) <= 0
    const directGood =
      shotReady &&
      inAttackingHalf &&
      distanceToGoal <= 650 &&
      shotEvaluation.directScore >= directThreshold
    const bankGood =
      shotReady &&
      inAttackingHalf &&
      bestBank !== null &&
      bestBank.score >= bankThreshold
    const passShotScore = scoringChance.passShotScore
    const currentBestShot = Math.max(
      shotEvaluation.directScore,
      bestBank?.score ?? 0,
    )
    const passMargin =
      aiOffenseConfig.aiPassBetterShotMargin *
      (1 - aiOffenseConfig.opponentAiPassToShotBias * 0.45)
    const teammateBetter =
      passOption !== null &&
      passShotScore >= currentBestShot + passMargin
    const carryPatience = getAiCarryPatienceMultiplier(
      context.player,
      context,
    )
    const forcedAfterMs =
      (isOpponent
        ? aiOffenseConfig.opponentAiForceShotAfterMs
        : aiOffenseConfig.aiMaxCarryBeforeShotMs) *
      carryPatience
    const forcedShot =
      shotReady &&
      inAttackingHalf &&
      this.carrierPossessionMs >= forcedAfterMs

    if (forceReleaseReason) {
      if (
        passOption &&
        passOption.score >= 0.35 &&
        (!inAttackingHalf || pressure >= 0.72)
      ) {
        return this.createPassDecision(
          context,
          intent,
          passOption,
          forceReleaseReason,
          shotEvaluation,
        )
      }

      if (
        inAttackingHalf &&
        bestBank &&
        bestBank.score > shotEvaluation.directScore
      ) {
        return this.createShotDecision(
          context,
          intent,
          bestBank.reflectionPoint,
          forceReleaseReason,
          shotEvaluation,
          bestBank,
        )
      }

      if (!inAttackingHalf) {
        return this.createClearDecision(
          context,
          intent,
          forceReleaseReason,
          shotEvaluation,
        )
      }

      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        forceReleaseReason,
        shotEvaluation,
      )
    }

    if (
      directGood &&
      shotRoll &&
      (!teammateBetter || shotEvaluation.directScore >= 0.78)
    ) {
      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        'directOpen',
        shotEvaluation,
      )
    }

    if (
      bankGood &&
      bestBank &&
      bankRoll &&
      (!teammateBetter || bestBank.score > passShotScore)
    ) {
      return this.createShotDecision(
        context,
        intent,
        bestBank.reflectionPoint,
        'bankBetter',
        shotEvaluation,
        bestBank,
      )
    }

    const passEnabled =
      tacticsConfig.passDecisionEnabled && passOption !== null
    const passBack =
      passEnabled &&
      behindGoal &&
      targetJob === 'frontSlot' &&
      aiOffenseConfig.passBackToFrontEnabled &&
      passOption.score >= aiOffenseConfig.passBackMinLaneScore
    const frontSlotPass =
      passEnabled &&
      targetJob === 'frontSlot' &&
      aiOffenseConfig.aiFrontSlotPassEnabled &&
      passShotScore >= directThreshold - 0.08
    const behindGoalPass =
      passEnabled &&
      targetJob === 'behindNet' &&
      aiOffenseConfig.aiBehindGoalPassEnabled &&
      stableDecisionRoll(context.player.id, decisionBucket, 43) <=
        aiOffenseConfig.aiBehindGoalPlayPreference
    const pressurePass =
      pressure >= tacticsConfig.passUnderPressureThreshold &&
      passShotScore >= currentBestShot - 0.08
    const shouldPass =
      passEnabled &&
      passOption.score >= passThreshold &&
      (teammateBetter ||
        pressurePass ||
        passBack ||
        frontSlotPass ||
        behindGoalPass ||
        (context.player.role === 'brute' && !directGood && !bankGood))

    if (shouldPass && passOption && !forcedShot) {
      return this.createPassDecision(
        context,
        intent,
        passOption,
        teammateBetter
          ? 'teammateBetter'
          : passBack
            ? 'behindGoalPass'
            : pressurePass
              ? 'pressurePass'
              : behindGoalPass
                ? 'behindGoalPass'
                : 'frontSlotPass',
        shotEvaluation,
      )
    }

    if (forcedShot) {
      if (
        scoringChance.bestAction === 'bankShot' &&
        bestBank &&
        bestBank.score >= bankThreshold * 0.72
      ) {
        return this.createShotDecision(
          context,
          intent,
          bestBank.reflectionPoint,
          'forcedShot',
          shotEvaluation,
          bestBank,
        )
      }

      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        'forcedShot',
        shotEvaluation,
      )
    }

    const patienceExpired =
      this.carrierPossessionMs >=
      aiOffenseConfig.aiShotPatienceMs * carryPatience

    if (patienceExpired && inAttackingHalf && shotReady && shotRoll) {
      if (
        bestBank &&
        bankRoll &&
        bestBank.score >= bankThreshold * 0.78 &&
        bestBank.score > shotEvaluation.directScore
      ) {
        return this.createShotDecision(
          context,
          intent,
          bestBank.reflectionPoint,
          'bankBetter',
          shotEvaluation,
          bestBank,
        )
      }

      if (directGood) {
        return this.createShotDecision(
          context,
          intent,
          shotEvaluation.directTarget,
          'directOpen',
          shotEvaluation,
        )
      }
    }

    if (
      aiOffenseConfig.aiSeekBetterShotAngleEnabled &&
      aiOffenseConfig.aiLateralRepositionEnabled &&
      inAttackingHalf &&
      shotEvaluation.directScore < directThreshold
    ) {
      const moveTarget = getLateralAttackTarget(
        context.player,
        context.attackGoal,
        context.players,
        context,
      )

      return {
        intent: {
          ...intent,
          moveTarget,
          aimTarget: shotEvaluation.directTarget,
          hold: true,
          swing: false,
          releaseTarget: undefined,
          aiState: 'SUPPORT_ATTACK',
        },
        decision: 'SEEK_SHOT_ANGLE',
        passTargetId: passOption?.player.id ?? null,
        passLaneScore: passOption?.score ?? 0,
        passShotScore: scoringChance.passShotScore,
        passDeniedReason:
          this.carrierPossessionMs <
          aiOffenseConfig.aiLateralRepositionTimeMs *
            carryPatience
            ? 'buildingAngle'
            : 'bestLaneUnavailable',
        shotReason: 'seekBetterAngle',
        bankShotSelected: false,
        selectedBankReflection: null,
        shotEvaluation,
      }
    }

    return {
      intent,
      decision: intent.aiState,
      passTargetId: passOption?.player.id ?? null,
      passLaneScore: passOption?.score ?? 0,
      passShotScore: scoringChance.passShotScore,
      passDeniedReason: passOption ? 'laneScoreLow' : 'noTarget',
      shotReason: 'noShotFound',
      bankShotSelected: false,
      selectedBankReflection: null,
      shotEvaluation,
    }
  }

  private createShotDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
    target: Point,
    reason: string,
    shotEvaluation: AIShotEvaluation,
    bank?: AIBankShotCandidate,
  ) {
    const targetWithError = applyAIExecutionError(
      context.player,
      target,
      this.carrierPossessionMs,
      bank
        ? getAiBankShotError(context.player, context)
        : getAiShotError(context.player, context),
      Boolean(bank),
    )
    const decisionSpeed = getAiDecisionSpeed(context.player, context)

    return {
      intent: {
        ...intent,
        moveTarget: context.player.position,
        aimTarget: targetWithError,
        hold: true,
        swing: false,
        releaseTarget: targetWithError,
        aiReleaseDelayMs:
          aiConfig.aiReleaseDelayMs *
          Phaser.Math.Linear(
            1.02,
            0.76,
            Phaser.Math.Clamp(context.player.attributes.shooting, 0, 1),
          ) /
          decisionSpeed,
        aiState: 'SHOOT' as const,
      },
      decision: bank ? 'BANK_SHOT' : 'SHOOT',
      passTargetId: null,
      passLaneScore: 0,
      passShotScore: 0,
      passDeniedReason: '-',
      shotReason: reason,
      bankShotSelected: Boolean(bank),
      selectedBankReflection: bank
        ? { ...bank.reflectionPoint }
        : null,
      shotEvaluation,
    }
  }

  private createPassDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
    passOption: PassOption,
    reason: string,
    shotEvaluation: AIShotEvaluation,
  ) {
    const passTarget = {
      x: passOption.player.position.x + passOption.player.velocity.x * 8,
      y: passOption.player.position.y + passOption.player.velocity.y * 8,
    }
    const assistedPassTarget = applyAIExecutionError(
      context.player,
      passTarget,
      this.carrierPossessionMs,
      getAiPassError(context.player, context),
      false,
      97,
    )
    const decisionSpeed = getAiDecisionSpeed(context.player, context)

    return {
      intent: {
        ...intent,
        moveTarget: context.player.position,
        aimTarget: assistedPassTarget,
        hold: true,
        swing: false,
        releaseTarget: assistedPassTarget,
        aiReleaseDelayMs:
          aiConfig.aiReleaseDelayMs *
          Phaser.Math.Linear(
            1.05,
            0.82,
            Phaser.Math.Clamp(context.player.attributes.passing, 0, 1),
          ) /
          decisionSpeed,
        aiState: 'PASS' as const,
      },
      decision: 'PASS',
      passTargetId: passOption.player.id,
      passLaneScore: passOption.score,
      passShotScore: passOption.shotScore,
      passDeniedReason: '-',
      shotReason: reason,
      bankShotSelected: false,
      selectedBankReflection: null,
      shotEvaluation,
    }
  }

  private createClearDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
    reason: string,
    shotEvaluation: AIShotEvaluation,
  ): PossessionDecision {
    const target = applyAIExecutionError(
      context.player,
      context.attackGoal,
      this.carrierPossessionMs,
      getAiShotError(context.player, context) * 0.65,
      false,
      131,
    )

    return {
      intent: {
        ...intent,
        moveTarget: context.player.position,
        aimTarget: target,
        hold: true,
        swing: false,
        releaseTarget: target,
        aiReleaseDelayMs: 80,
        aiState: 'CLEAR',
      },
      decision: 'CLEAR',
      passTargetId: null,
      passLaneScore: 0,
      passShotScore: 0,
      passDeniedReason: '-',
      shotReason: reason,
      bankShotSelected: false,
      selectedBankReflection: null,
      shotEvaluation,
    }
  }

  private updateCarrierPossessionClock(
    carrierId: string | null,
    deltaMs: number,
  ): boolean {
    if (!carrierId) {
      const changed = this.carrierPossessionId !== null
      this.carrierPossessionId = null
      this.carrierPossessionMs = 0
      this.committedCarrierDecision = null
      this.carrierIntent.reset()
      return changed
    }

    if (this.carrierPossessionId !== carrierId) {
      this.carrierPossessionId = carrierId
      this.carrierPossessionMs = 0
      this.committedCarrierDecision = null
      this.carrierIntent.reset()
      return true
    }

    this.carrierPossessionMs += deltaMs
    return false
  }

  private updateCarrierRuntime(
    players: Player[],
    carrierId: string | null,
    deltaMs: number,
  ): void {
    if (!carrierId) {
      return
    }

    const carrier = players.find(
      (player) => player.id === carrierId,
    )
    const intent = this.intents.get(carrierId)

    if (
      !carrier ||
      carrier.controllerType !== 'ai' ||
      carrier.role === 'keeper' ||
      !intent
    ) {
      return
    }

    const previousForceReason =
      this.carrierIntent.getForceReleaseReason(carrier.id)
    const debug = this.carrierIntent.update(
      carrier,
      this.carrierPossessionMs,
      deltaMs,
      intent.moveTarget,
    )
    const aimAngle = this.carrierIntent.getAimAngle(carrier.id)

    if (aimAngle !== null) {
      this.intents.set(carrier.id, {
        ...intent,
        aimAngle,
        truck: false,
        slash: false,
        swing: false,
      })
    }

    const forceReason =
      this.carrierIntent.getForceReleaseReason(carrier.id)
    if (forceReason && forceReason !== previousForceReason) {
      this.decisionTimerMs = 0
    }

    const decision = this.decisions.get(carrier.id)
    if (decision && debug) {
      this.decisions.set(carrier.id, {
        ...decision,
        carrierIntent: debug,
      })
    }
  }

  private finishOverride(playerId: string): void {
    if (!this.overrideActive.delete(playerId)) {
      return
    }

    this.overrideCooldowns.set(
      playerId,
      tacticsConfig.tacticalOverrideCooldownMs,
    )
  }

  private updateOverrideCooldowns(deltaMs: number): void {
    for (const [playerId, remaining] of this.overrideCooldowns) {
      const next = Math.max(0, remaining - deltaMs)
      if (next === 0) {
        this.overrideCooldowns.delete(playerId)
      } else {
        this.overrideCooldowns.set(playerId, next)
      }
    }
  }

  private updateShotCooldowns(deltaMs: number): void {
    for (const [playerId, remaining] of this.shotCooldowns) {
      const next = Math.max(0, remaining - deltaMs)
      if (next === 0) {
        this.shotCooldowns.delete(playerId)
      } else {
        this.shotCooldowns.set(playerId, next)
      }
    }
  }

  private getDecisionInterval(
    players: Player[],
    controlledPlayerId: string,
  ): number {
    const decisionPlayers = players.filter(
      (player) =>
        player.id !== controlledPlayerId &&
        player.role !== 'keeper',
    )
    const baseInterval = Math.min(
      stickConfig.aiDecisionIntervalMs,
      aiOffenseConfig.opponentAiDecisionIntervalMs,
    )

    if (decisionPlayers.length === 0) {
      return baseInterval
    }

    const averageSpeed =
      decisionPlayers.reduce((total, player) => {
        const assistContext: AIAssistContext = {
          tacticalQuality: this.tacticalQualities[player.teamSide],
          scoringAggression:
            player.teamSide === 'B'
              ? aiOffenseConfig.opponentAiScoringAggression
              : 0.55,
          pressure: 0,
        }
        return total + getAiDecisionSpeed(player, assistContext)
      }, 0) / decisionPlayers.length

    return Phaser.Math.Clamp(
      baseInterval / Math.max(0.65, averageSpeed),
      70,
      800,
    )
  }

  private drawDebug(players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    this.debugGraphics.clear()
    for (const label of this.debugLabels.values()) {
      label.setVisible(false)
    }

    for (const player of players) {
      const playerIntent = this.intents.get(player.id)

      if (playerIntent) {
        this.debugGraphics.lineStyle(
          2,
          0xf4fdff,
          aiConfig.debug.pathAlpha,
        )
        this.debugGraphics.lineBetween(
          player.position.x,
          player.position.y,
          playerIntent.moveTarget.x,
          playerIntent.moveTarget.y,
        )
        this.debugGraphics.lineStyle(
          2,
          0xffd36a,
          aiConfig.debug.targetAlpha,
        )
        this.debugGraphics.strokeCircle(
          playerIntent.moveTarget.x,
          playerIntent.moveTarget.y,
          aiConfig.debug.targetRadius,
        )
      }

      const decision = this.decisions.get(player.id)
      if (decision && player.role !== 'keeper') {
        this.getDebugLabel(player.id)
          .setPosition(player.position.x + 18, player.position.y - 54)
          .setText(
            `${decision.job ?? '-'} | ${decision.decision}\n` +
              `GATHER ${decision.gatherAllowed ? 'YES' : 'NO'}: ${decision.gatherDeniedReason}\n` +
              `PASS ${decision.passTargetId ?? '-'} ${decision.passLaneScore.toFixed(2)} ${decision.passDeniedReason}\n` +
              `SHOT ${decision.chosenAction}/${decision.shotReason} D ${decision.directShotScore.toFixed(2)} B ${decision.bankShotScore.toFixed(2)} P ${decision.passShotScore.toFixed(2)}\n` +
              formatCarrierIntentDebug(decision.carrierIntent),
          )
          .setVisible(true)
      }

      if (decision?.directShotTarget) {
        this.debugGraphics.lineStyle(2, 0x8df0cf, 0.55)
        this.debugGraphics.lineBetween(
          player.position.x,
          player.position.y,
          decision.directShotTarget.x,
          decision.directShotTarget.y,
        )
      }

      for (const candidate of decision?.bankCandidates ?? []) {
        const selected =
          decision?.selectedBankReflection?.x ===
            candidate.reflectionPoint.x &&
          decision?.selectedBankReflection?.y ===
            candidate.reflectionPoint.y
        this.debugGraphics.lineStyle(
          selected ? 4 : 2,
          selected ? 0xffd24f : 0x69ecff,
          candidate.valid ? 0.72 : 0.18,
        )
        this.debugGraphics.lineBetween(
          player.position.x,
          player.position.y,
          candidate.reflectionPoint.x,
          candidate.reflectionPoint.y,
        )
        this.debugGraphics.lineBetween(
          candidate.reflectionPoint.x,
          candidate.reflectionPoint.y,
          candidate.goalTarget.x,
          candidate.goalTarget.y,
        )
        this.debugGraphics.strokeCircle(
          candidate.reflectionPoint.x,
          candidate.reflectionPoint.y,
          selected ? 10 : 6,
        )
      }

      if (player.role === 'brute') {
        const style = getPlayStyleModifiers(
          player.role,
          player.playStyle,
        )
        this.debugGraphics.lineStyle(2, 0xff6b7a, 0.55)
        this.debugGraphics.strokeCircle(
          player.position.x,
          player.position.y,
          aiConfig.brutePressureRadius * style.bruteCheckMultiplier,
        )
      }
    }
  }

  private getDebugLabel(playerId: string): Phaser.GameObjects.Text {
    const existing = this.debugLabels.get(playerId)
    if (existing) {
      return existing
    }

    const label = this.debugGraphics.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: '#10243ddd',
        padding: { x: 4, y: 3 },
      })
      .setDepth(21)
      .setVisible(this.debugEnabled)

    this.debugLabels.set(playerId, label)
    return label
  }
}

function carrierIntentType(
  decision: PossessionDecision,
): CarrierIntentType {
  if (decision.decision === 'BANK_SHOT') {
    return 'shootBank'
  }
  if (decision.decision === 'SHOOT') {
    return 'shootDirect'
  }
  if (decision.decision === 'PASS') {
    return 'passToTeammate'
  }
  if (decision.decision === 'SEEK_SHOT_ANGLE') {
    return 'carryToAngle'
  }
  if (decision.decision === 'CLEAR') {
    return 'clearSafe'
  }
  return 'holdBriefly'
}

function getCarrierChargeTargetMs(
  intentType: CarrierIntentType,
  player: Player,
  pressure: number,
  forceReleaseReason: string | null,
): number {
  if (forceReleaseReason) {
    if (forceReleaseReason === 'maxCarry') {
      return 80
    }
    if (
      forceReleaseReason === 'spinDetected' ||
      forceReleaseReason.startsWith('spinGuard:')
    ) {
      return 120
    }
    if (forceReleaseReason === 'stuck') {
      return 220
    }
    return 160
  }

  let minimum = 0
  let maximum = 0
  let execution = player.attributes.ballHandling

  switch (intentType) {
    case 'clearSafe':
      minimum = aiCarrierConfig.aiClearChargeMinMs
      maximum = aiCarrierConfig.aiClearChargeMaxMs
      execution = player.attributes.power
      break
    case 'passToTeammate':
      minimum = aiCarrierConfig.aiPassChargeMinMs
      maximum = aiCarrierConfig.aiPassChargeMaxMs
      execution = player.attributes.passing
      break
    case 'shootDirect':
      minimum = aiCarrierConfig.aiDirectShotChargeMinMs
      maximum = aiCarrierConfig.aiDirectShotChargeMaxMs
      execution = player.attributes.shooting
      break
    case 'shootBank':
      minimum = Math.max(
        1000,
        aiCarrierConfig.aiBankShotChargeMinMs,
      )
      maximum = aiCarrierConfig.aiBankShotChargeMaxMs
      execution = player.attributes.shooting
      break
    default:
      return 0
  }

  const low = Math.min(minimum, maximum)
  const high = Math.max(minimum, maximum)
  const patience = Phaser.Math.Clamp(
    (1 - Phaser.Math.Clamp(pressure, 0, 1)) * 0.75 +
      Phaser.Math.Clamp(execution, 0, 1.2) * 0.25,
    0,
    1,
  )

  return Math.round(Phaser.Math.Linear(low, high, patience))
}

function carrierDecisionQuality(
  decision: PossessionDecision,
): number {
  switch (carrierIntentType(decision)) {
    case 'shootBank':
      return decision.shotEvaluation.bestBank?.score ?? 0
    case 'shootDirect':
      return decision.shotEvaluation.directScore
    case 'passToTeammate':
      return Math.max(
        decision.passLaneScore,
        decision.passShotScore,
      )
    case 'carryToAngle':
      return (
        Math.max(
          decision.shotEvaluation.directScore,
          decision.shotEvaluation.bestBank?.score ?? 0,
          decision.passShotScore,
        ) * 0.82
      )
    case 'clearSafe':
      return 0.58
    default:
      return 0.2
  }
}

function formatCarrierIntentDebug(
  state: AICarrierIntentDebugState | null,
): string {
  if (!state) {
    return 'CARRIER -'
  }

  return (
    `CARRIER ${state.intentType} ${Math.round(state.intentAgeMs)}ms ` +
    `TARGET ${Math.round(state.targetPoint.x)},${Math.round(state.targetPoint.y)} ` +
    `${state.targetPlayerId ?? '-'}\n` +
    `AIM ${state.aimAngle.toFixed(2)}>${state.desiredAimAngle.toFixed(2)} ` +
    `D ${state.angleDelta.toFixed(2)} CHARGE ${Math.round(state.releaseAfterChargeMs)}ms ` +
    `SAFE ${Math.round(state.forcedReleaseInMs)}ms ` +
    `SPIN ${state.spinDetected ? 'YES' : 'NO'} ${state.reason}`
  )
}

function isDefensiveJob(job: TacticalJob): boolean {
  return (
    job === 'defensiveCover' ||
    job === 'zoneGuard' ||
    job === 'manMark' ||
    job === 'defensiveCleanup' ||
    job === 'creaseSupport'
  )
}

function boostHighPressDefense(
  context: ReturnType<typeof createAIDecisionContext>,
  decision: { truck: boolean; slash: boolean },
): { truck: boolean; slash: boolean } {
  if (
    decision.truck ||
    decision.slash ||
    !context.opponentCarrier
  ) {
    return decision
  }

  const carrierDistance = Math.hypot(
    context.player.position.x - context.opponentCarrier.position.x,
    context.player.position.y - context.opponentCarrier.position.y,
  )
  const aggression = tacticsConfig.highPressAggression
  const canTruck =
    context.player.role === 'brute' &&
    context.player.defenseTendencies.truckAggression >= 0.25 &&
    carrierDistance <= defenseConfig.truckRange * (1 + aggression * 0.25)
  const canSlash =
    context.player.defenseTendencies.slashAggression >= 0.2 &&
    carrierDistance <= defenseConfig.slashRange * (1 + aggression * 0.3)

  return {
    truck: canTruck,
    slash: !canTruck && canSlash,
  }
}

function goalPoint(defendingSide: TeamSide): Point {
  return keeperAreaConfig.areas[defendingSide]
}

function createGatherIntent(corePosition: Point): PlayerControlIntent {
  return {
    moveTarget: { ...corePosition },
    aimTarget: { ...corePosition },
    hold: true,
    swing: false,
    truck: false,
    slash: false,
    aiState: 'SEEK_CORE',
  }
}

type PassOption = {
  player: Player
  score: number
  shotScore: number
  job: TacticalJob | null
}

function findBestPassOption(
  player: Player,
  players: Player[],
  teamShape: TeamShapeSystem,
  assistContext: AIAssistContext,
): PassOption | null {
  const opponents = players.filter(
    (candidate) => candidate.teamSide !== player.teamSide,
  )
  const candidates = players.filter(
    (candidate) =>
      candidate.teamSide === player.teamSide &&
      candidate.id !== player.id &&
      candidate.role !== 'keeper',
  )

  if (candidates.length === 0) {
    return null
  }

  const opponentKeeper = opponents.find(
    (candidate) => candidate.role === 'keeper',
  )
  const fieldDefenders = opponents.filter(
    (candidate) => candidate.role !== 'keeper',
  )
  const attackGoal = goalPoint(
    player.teamSide === 'A' ? 'B' : 'A',
  )
  const keeperPulledBonus =
    opponentKeeper &&
    distance(opponentKeeper.position, attackGoal) > 95
      ? aiOffenseConfig.keeperPulledOutOfPositionBonus
      : 0
  const passExecutionBonus =
    (0.2 - getAiPassError(player, assistContext)) * 0.32

  return candidates
    .map((candidate) => {
      const assignment = teamShape.getAssignment(candidate.id)
      const progress =
        player.teamSide === 'A'
          ? Phaser.Math.Clamp(
              (player.position.y - candidate.position.y) / 420,
              -0.2,
              1,
            )
          : Phaser.Math.Clamp(
              (candidate.position.y - player.position.y) / 420,
              -0.2,
              1,
            )
      const jobBonus =
        assignment?.job === 'frontSlot'
          ? aiOffenseConfig.frontSlotReceiverScoreBonus
          : assignment?.job === 'behindNet'
            ? aiOffenseConfig.behindGoalPassScoreBonus
            : assignment?.job === 'weakSideLane'
              ? 0.16
            : assignment?.job === 'supportOutlet'
              ? 0.14
              : 0.06
      const shotLane = laneScore(
        candidate.position,
        attackGoal,
        fieldDefenders,
      )
      const keeperPenalty = opponentKeeper
        ? (1 -
            Phaser.Math.Clamp(
              distanceToSegment(
                opponentKeeper.position,
                candidate.position,
                attackGoal,
              ) / 120,
              0,
              1,
            )) *
          0.32
        : 0
      const shotDistance = distance(candidate.position, attackGoal)
      const closeBonus =
        shotDistance <= aiOffenseConfig.aiMinShotDistance
          ? aiOffenseConfig.aiCloseRangeShotBonus
          : 0
      const shotScore = Phaser.Math.Clamp(
        shotLane -
          keeperPenalty +
          closeBonus +
          jobBonus * 0.3 +
          getAiShotSelectionBonus(candidate, assistContext) * 0.45,
        0,
        1,
      )
      const score = Phaser.Math.Clamp(
        laneScore(player.position, candidate.position, opponents) * 0.62 +
          progress * 0.2 +
          jobBonus +
          passExecutionBonus +
          shotScore *
            aiOffenseConfig.opponentAiPassToShotBias *
            0.24 +
          (assignment?.job === 'frontSlot'
            ? keeperPulledBonus
            : 0),
        0,
        1,
      )

      return {
        player: candidate,
        score,
        shotScore,
        job: assignment?.job ?? null,
      }
    })
    .sort((a, b) => b.score - a.score)[0]
}

function getLateralAttackTarget(
  player: Player,
  attackGoal: Point,
  players: Player[],
  assistContext: AIAssistContext,
): Point {
  const defendingKeeper = players.find(
    (candidate) =>
      candidate.teamSide !== player.teamSide &&
      candidate.role === 'keeper',
  )
  const sideSign = defendingKeeper
    ? defendingKeeper.position.x <= attackGoal.x
      ? 1
      : -1
    : player.position.x <= attackGoal.x
      ? -1
      : 1
  const repositionDistance =
    (player.teamSide === 'B'
      ? aiOffenseConfig.opponentAiAttackSpacing
      : aiOffenseConfig.aiLateralRepositionDistance) *
    (aiCarrierConfig.aiCarryToAngleDistance / 110)
  const angleCreationSkill = Phaser.Math.Clamp(
    player.attributes.control * 0.48 +
      player.attributes.ballHandling * 0.4 +
      assistContext.tacticalQuality.offenseSchemeQuality * 0.12,
    0.45,
    1.2,
  )
  const desiredX =
    attackGoal.x +
    sideSign *
      repositionDistance *
      angleCreationSkill *
      Phaser.Math.Linear(
        0.8,
        1.15,
        aiOffenseConfig.aiWeakSideLanePreference,
      )
  const approachY = Phaser.Math.Linear(
    player.position.y,
    attackGoal.y,
    aiOffenseConfig.aiLateralAttackMoveStrength * 0.22,
  )

  return {
    x: Phaser.Math.Clamp(
      desiredX,
      arenaConfig.center.x - arenaConfig.width / 2 + 90,
      arenaConfig.center.x + arenaConfig.width / 2 - 90,
    ),
    y: approachY,
  }
}

function laneScore(
  start: Point,
  end: Point,
  opponents: Player[],
): number {
  if (opponents.length === 0) {
    return 1
  }

  const clearance = Math.min(
    ...opponents.map((opponent) =>
      distanceToSegment(opponent.position, start, end),
    ),
  )

  return Phaser.Math.Clamp(clearance / 170, 0, 1)
}

function isCoreMovingTowardPlayer(core: Core, player: Player): boolean {
  const speed = Math.hypot(core.velocity.x, core.velocity.y)
  if (speed < 0.3) {
    return false
  }

  const toPlayer = {
    x: player.position.x - core.position.x,
    y: player.position.y - core.position.y,
  }
  const direction = {
    x: core.velocity.x / speed,
    y: core.velocity.y / speed,
  }
  const forwardDistance = toPlayer.x * direction.x + toPlayer.y * direction.y

  if (forwardDistance <= 0) {
    return false
  }

  const closest = {
    x: core.position.x + direction.x * forwardDistance,
    y: core.position.y + direction.y * forwardDistance,
  }

  return (
    distance(closest, player.position) <=
    tacticsConfig.receiverCatchRadius * 0.72
  )
}

function isBehindAttackGoal(
  point: Point,
  goal: Point,
  side: TeamSide,
): boolean {
  return side === 'A' ? point.y < goal.y : point.y > goal.y
}

function blendPoints(start: Point, end: Point, amount: number): Point {
  const clamped = Phaser.Math.Clamp(amount, 0, 1)
  return {
    x: Phaser.Math.Linear(start.x, end.x, clamped),
    y: Phaser.Math.Linear(start.y, end.y, clamped),
  }
}

function distanceToSegment(
  point: Point,
  start: Point,
  end: Point,
): number {
  const segment = { x: end.x - start.x, y: end.y - start.y }
  const lengthSquared = segment.x * segment.x + segment.y * segment.y
  const progress =
    lengthSquared === 0
      ? 0
      : Phaser.Math.Clamp(
          ((point.x - start.x) * segment.x +
            (point.y - start.y) * segment.y) /
            lengthSquared,
          0,
          1,
        )
  return distance(point, {
    x: start.x + segment.x * progress,
    y: start.y + segment.y * progress,
  })
}

function applyAIExecutionError(
  player: Player,
  target: Point,
  possessionMs: number,
  error: number,
  bankShot: boolean,
  salt = 59,
): Point {
  const bucket = Math.floor(possessionMs / 450)
  const horizontalNoise =
    stableDecisionRoll(player.id, bucket, bankShot ? 71 : salt) * 2 - 1
  const verticalNoise =
    stableDecisionRoll(player.id, bucket, bankShot ? 83 : salt + 8) * 2 - 1

  if (bankShot) {
    const halfHeight = arenaConfig.height / 2
    return {
      x: target.x,
      y: Phaser.Math.Clamp(
        target.y + verticalNoise * 150 * error,
        arenaConfig.center.y -
          halfHeight +
          aiOffenseConfig.aiBankShotWallTargetPadding,
        arenaConfig.center.y +
          halfHeight -
          aiOffenseConfig.aiBankShotWallTargetPadding,
      ),
    }
  }

  return {
    x: target.x + horizontalNoise * 95 * error,
    y: target.y + verticalNoise * 24 * error,
  }
}

function stableDecisionRoll(
  playerId: string,
  bucket: number,
  salt: number,
): number {
  let hash = salt + bucket * 101

  for (let index = 0; index < playerId.length; index += 1) {
    hash = (hash * 31 + playerId.charCodeAt(index)) | 0
  }

  const value = Math.sin(hash * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function createEmptyOffenseMetrics(): AIOffenseMetrics {
  const createLine = (): AIOffenseMetricLine => ({
    shotsAttempted: 0,
    directShots: 0,
    bankShots: 0,
    passesToShot: 0,
    goals: 0,
    ownGoals: 0,
    shotsSaved: 0,
    shotsBlocked: 0,
    shotsHitPost: 0,
    shotsWide: 0,
  })

  return {
    A: createLine(),
    B: createLine(),
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
