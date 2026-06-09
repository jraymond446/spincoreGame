import Phaser from 'phaser'
import { createAIDecisionContext } from '../ai/AIDecisionContext'
import { decideDefenseActions } from '../ai/DefenseBehavior'
import { getPlayStyleModifiers } from '../ai/PlayStyleModifiers'
import { decideRoleIntent } from '../ai/RoleBehaviors'
import { aiConfig } from '../config/aiConfig'
import { aiOffenseConfig } from '../config/aiOffenseConfig'
import { arenaConfig } from '../config/arenaConfig'
import { defenseConfig } from '../config/defenseConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { stickConfig } from '../config/stickConfig'
import { tacticsConfig } from '../config/tacticsConfig'
import type { Point } from '../data/geometry'
import type {
  FormationAIBias,
  PlayerControlIntent,
  TeamSide,
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
  AIBankShotSystem,
  type AIBankShotCandidate,
  type AIShotEvaluation,
} from './AIBankShotSystem'
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
  directShotTarget: Point | null
  bankShotSelected: boolean
  selectedBankReflection: Point | null
  bankCandidates: AIBankShotCandidate[]
}

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly debugLabels = new Map<string, Phaser.GameObjects.Text>()
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private readonly keeperAI: KeeperAISystem
  private readonly teamShape: TeamShapeSystem
  private readonly bankShots = new AIBankShotSystem()
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()
  private decisions = new Map<string, AIDecisionDebugState>()
  private overrideActive = new Set<string>()
  private overrideCooldowns = new Map<string, number>()
  private carrierPossessionId: string | null = null
  private carrierPossessionMs = 0

  constructor(
    scene: Phaser.Scene,
    formationBiases: Record<TeamSide, FormationAIBias>,
    strategies: Record<TeamSide, TeamStrategy>,
  ) {
    this.formationBiases = formationBiases
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
    this.updateCarrierPossessionClock(carrierId, deltaMs)
    this.updateOverrideCooldowns(deltaMs)
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
      this.decisionTimerMs = stickConfig.aiDecisionIntervalMs
    }

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

  reset(): void {
    this.decisionTimerMs = 0
    this.intents.clear()
    this.decisions.clear()
    this.overrideActive.clear()
    this.overrideCooldowns.clear()
    this.carrierPossessionId = null
    this.carrierPossessionMs = 0
    this.teamShape.reset()
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
      )
      const baseIntent = decideRoleIntent(context)
      const schemeIntent = baseIntent
      const assignment = this.teamShape.getAssignment(player.id)
      const possessionDecision = context.isCarrier
          ? this.applyPossessionDecision(
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
      const baseDefense = followsShape && !activelyGathering
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
        job: assignment?.job ?? null,
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
        passDeniedReason:
          possessionDecision?.passDeniedReason ?? '-',
        shotReason: possessionDecision?.shotReason ?? '-',
        directShotScore:
          possessionDecision?.shotEvaluation.directScore ?? 0,
        directShotTarget:
          possessionDecision?.shotEvaluation.directTarget ?? null,
        bankShotSelected:
          possessionDecision?.bankShotSelected ?? false,
        selectedBankReflection:
          possessionDecision?.selectedBankReflection ?? null,
        bankCandidates:
          possessionDecision?.shotEvaluation.bankCandidates ?? [],
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
      aimTarget: context.core.position,
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
    const catchable =
      loose &&
      distanceToCore <= tacticsConfig.receiverCatchRadius &&
      (distanceToCore <= tacticsConfig.emergencyGatherRadius ||
        isCoreMovingTowardPlayer(context.core, player))
    const emergency =
      loose &&
      tacticsConfig.looseCoreOverridesJobNearby &&
      distanceToCore <= tacticsConfig.emergencyGatherRadius
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
      distanceToCore <= tacticsConfig.receiverCatchRadius
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

  private applyPossessionDecision(
    context: ReturnType<typeof createAIDecisionContext>,
    intent: PlayerControlIntent,
  ): {
    intent: PlayerControlIntent
    decision: string
    passTargetId: string | null
    passLaneScore: number
    passDeniedReason: string
    shotReason: string
    bankShotSelected: boolean
    selectedBankReflection: Point | null
    shotEvaluation: AIShotEvaluation
  } {
    const strategy = this.teamShape.getStrategy(context.player.teamSide)
    const shotEvaluation = this.bankShots.evaluate(
      context.player,
      context.players,
      strategy,
    )

    if (!tacticsConfig.possessionOverridesJob) {
      return {
        intent,
        decision: intent.aiState,
        passTargetId: null,
        passLaneScore: 0,
        passDeniedReason: 'possessionOverrideDisabled',
        shotReason: 'possessionOverrideDisabled',
        bankShotSelected: false,
        selectedBankReflection: null,
        shotEvaluation,
      }
    }

    const passOption = findBestPassOption(
      context.player,
      context.players,
      this.teamShape,
    )

    const pressure = opponentPressure(context.player, context.players)
    const behindGoal =
      isBehindAttackGoal(
        context.player.position,
        context.attackGoal,
        context.player.teamSide,
      )
    const targetJob = passOption?.job ?? null
    let threshold = tacticsConfig.passLaneMinScore

    if (context.player.role === 'support') {
      threshold -= tacticsConfig.supportPassBias
    } else if (context.player.role === 'brute') {
      threshold += 0.1
    }

    if (
      behindGoal &&
      targetJob === 'frontSlot' &&
      aiOffenseConfig.passBackToFrontEnabled
    ) {
      threshold -= tacticsConfig.behindNetPassBackBias
    }

    const distanceToGoal = distance(
      context.player.position,
      context.attackGoal,
    )
    const inAttackingHalf =
      context.player.teamSide === 'A'
        ? context.player.position.y <= arenaConfig.center.y
        : context.player.position.y >= arenaConfig.center.y
    const directOpen =
      inAttackingHalf &&
      distanceToGoal <= 560 &&
      shotEvaluation.directScore >=
        aiOffenseConfig.aiShotBlockedThreshold
    const bestBank = shotEvaluation.bestBank
    const bankGood =
      inAttackingHalf &&
      bestBank !== null &&
      bestBank.score >= aiOffenseConfig.aiBankShotMinScore &&
      (shotEvaluation.directScore <
        aiOffenseConfig.aiShotBlockedThreshold ||
        bestBank.score >
          shotEvaluation.directScore +
            0.08 -
            aiOffenseConfig.aiBankShotPreference * 0.1)
    const forcedShot =
      this.carrierPossessionMs >=
      aiOffenseConfig.aiForceShotAfterMs
    const wideOpenShot =
      pressure < 0.35 &&
      directOpen &&
      shotEvaluation.directScore >= 0.68

    if (wideOpenShot) {
      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        'openDirect',
        shotEvaluation,
      )
    }

    if (bankGood && bestBank) {
      return this.createShotDecision(
        context,
        intent,
        bestBank.reflectionPoint,
        'selectedBank',
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
      aiOffenseConfig.aiFrontSlotPassEnabled
    const behindGoalPass =
      passEnabled &&
      targetJob === 'behindNet' &&
      aiOffenseConfig.aiBehindGoalPassEnabled
    const shouldPass =
      passEnabled &&
      passOption.score >= threshold &&
      (intent.aiState === 'PASS' ||
        pressure >= tacticsConfig.passUnderPressureThreshold ||
        passBack ||
        frontSlotPass ||
        behindGoalPass ||
        context.player.role === 'support' ||
        (context.player.role === 'striker' &&
          shotEvaluation.directScore <
            aiOffenseConfig.aiShotBlockedThreshold +
              tacticsConfig.frontSlotShotBias * 0.18) ||
        (context.player.role === 'brute' && !wideOpenShot))

    if (shouldPass && passOption) {
      return this.createPassDecision(
        context,
        intent,
        passOption,
        passBack
          ? 'passFrontSlot'
          : behindGoalPass
            ? 'passBehindGoal'
            : targetJob === 'weakSideLane'
              ? 'passWeakSide'
              : pressure >= tacticsConfig.passUnderPressureThreshold
                ? 'underPressureOutlet'
                : frontSlotPass
                  ? 'passFrontSlot'
                  : 'passWeakSide',
        shotEvaluation,
      )
    }

    if (forcedShot) {
      if (bestBank && bestBank.score > shotEvaluation.directScore) {
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
      this.carrierPossessionMs >= aiOffenseConfig.aiShotPatienceMs

    if (patienceExpired && inAttackingHalf) {
      if (
        bestBank &&
        bestBank.score >= aiOffenseConfig.aiBankShotMinScore * 0.8 &&
        bestBank.score > shotEvaluation.directScore
      ) {
        return this.createShotDecision(
          context,
          intent,
          bestBank.reflectionPoint,
          'selectedBank',
          shotEvaluation,
          bestBank,
        )
      }

      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        directOpen ? 'openDirect' : 'bestAvailable',
        shotEvaluation,
      )
    }

    if (
      aiOffenseConfig.aiSeekBetterShotAngleEnabled &&
      inAttackingHalf &&
      shotEvaluation.directScore <
        aiOffenseConfig.aiShotBlockedThreshold
    ) {
      const moveTarget = getLateralAttackTarget(
        context.player,
        context.attackGoal,
        context.players,
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
        passDeniedReason:
          this.carrierPossessionMs < aiOffenseConfig.aiShotPatienceMs
            ? 'buildingAngle'
            : 'bestLaneUnavailable',
        shotReason: 'seekBetterAngle',
        bankShotSelected: false,
        selectedBankReflection: null,
        shotEvaluation,
      }
    }

    if (directOpen) {
      return this.createShotDecision(
        context,
        intent,
        shotEvaluation.directTarget,
        'openDirect',
        shotEvaluation,
      )
    }

    return {
      intent,
      decision: intent.aiState,
      passTargetId: passOption?.player.id ?? null,
      passLaneScore: passOption?.score ?? 0,
      passDeniedReason: passOption ? 'laneScoreLow' : 'noTarget',
      shotReason: 'baseRoleDecision',
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
    return {
      intent: {
        ...intent,
        moveTarget: context.player.position,
        aimTarget: target,
        hold: true,
        swing: false,
        releaseTarget: target,
        aiState: 'SHOOT' as const,
      },
      decision: bank ? 'BANK_SHOT' : 'SHOOT',
      passTargetId: null,
      passLaneScore: 0,
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

    return {
      intent: {
        ...intent,
        moveTarget: context.player.position,
        aimTarget: passTarget,
        hold: true,
        swing: false,
        releaseTarget: passTarget,
        aiReleaseDelayMs:
          aiConfig.aiReleaseDelayMs *
          Phaser.Math.Linear(
            1.05,
            0.82,
            Phaser.Math.Clamp(context.player.attributes.passing, 0, 1),
          ),
        aiState: 'PASS' as const,
      },
      decision: 'PASS',
      passTargetId: passOption.player.id,
      passLaneScore: passOption.score,
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
  ): void {
    if (!carrierId) {
      this.carrierPossessionId = null
      this.carrierPossessionMs = 0
      return
    }

    if (this.carrierPossessionId !== carrierId) {
      this.carrierPossessionId = carrierId
      this.carrierPossessionMs = 0
      return
    }

    this.carrierPossessionMs += deltaMs
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
              `SHOT ${decision.shotReason} D ${decision.directShotScore.toFixed(2)} B ${decision.bankShotSelected ? 'YES' : 'NO'}`,
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
  job: TacticalJob | null
}

function findBestPassOption(
  player: Player,
  players: Player[],
  teamShape: TeamShapeSystem,
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
  const attackGoal = goalPoint(
    player.teamSide === 'A' ? 'B' : 'A',
  )
  const keeperPulledBonus =
    opponentKeeper &&
    distance(opponentKeeper.position, attackGoal) > 95
      ? aiOffenseConfig.keeperPulledOutOfPositionBonus
      : 0

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
      const score = Phaser.Math.Clamp(
        laneScore(player.position, candidate.position, opponents) * 0.62 +
          progress * 0.2 +
          jobBonus +
          (assignment?.job === 'frontSlot'
            ? keeperPulledBonus
            : 0),
        0,
        1,
      )

      return {
        player: candidate,
        score,
        job: assignment?.job ?? null,
      }
    })
    .sort((a, b) => b.score - a.score)[0]
}

function getLateralAttackTarget(
  player: Player,
  attackGoal: Point,
  players: Player[],
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
  const desiredX =
    attackGoal.x +
    sideSign * aiOffenseConfig.aiLateralShotAngleTargetDistance
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

function opponentPressure(player: Player, players: Player[]): number {
  const opponents = players.filter(
    (candidate) => candidate.teamSide !== player.teamSide,
  )
  const nearest =
    opponents.length === 0
      ? Infinity
      : Math.min(
          ...opponents.map((opponent) =>
            distance(opponent.position, player.position),
          ),
        )

  return 1 - Phaser.Math.Clamp(nearest / 220, 0, 1)
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

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
