import Phaser from 'phaser'
import { createAIDecisionContext } from '../ai/AIDecisionContext'
import { decideDefenseActions } from '../ai/DefenseBehavior'
import { getPlayStyleModifiers } from '../ai/PlayStyleModifiers'
import { decideRoleIntent } from '../ai/RoleBehaviors'
import { aiConfig } from '../config/aiConfig'
import { defenseConfig } from '../config/defenseConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
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
import type { TacticalAssignment, TacticalJob } from '../tactics/TacticalJobs'
import type { TeamStrategy } from '../tactics/TeamStrategy'
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
}

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly debugLabels = new Map<string, Phaser.GameObjects.Text>()
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private readonly keeperAI: KeeperAISystem
  private readonly teamShape: TeamShapeSystem
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()
  private decisions = new Map<string, AIDecisionDebugState>()
  private overrideActive = new Set<string>()
  private overrideCooldowns = new Map<string, number>()

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
      const bankTarget = this.teamShape.getBankAimTarget(
        player.teamSide,
        player.position,
      )
      const schemeIntent =
        context.isCarrier && bankTarget && baseIntent.releaseTarget
          ? {
              ...baseIntent,
              aimTarget: bankTarget,
              releaseTarget: bankTarget,
            }
          : baseIntent
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

      this.intents.set(player.id, {
        ...shapedIntent,
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

    if (isInsideKeeperZone(context.core.position)) {
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
      decision: catchable ? 'RECEIVE_CORE' : 'EMERGENCY_GATHER',
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
  } {
    if (!tacticsConfig.possessionOverridesJob) {
      return {
        intent,
        decision: intent.aiState,
        passTargetId: null,
        passLaneScore: 0,
        passDeniedReason: 'possessionOverrideDisabled',
      }
    }

    const passOption = findBestPassOption(
      context.player,
      context.players,
      this.teamShape,
    )

    if (!tacticsConfig.passDecisionEnabled || !passOption) {
      return {
        intent,
        decision: intent.aiState,
        passTargetId: null,
        passLaneScore: passOption?.score ?? 0,
        passDeniedReason: passOption ? 'passDecisionDisabled' : 'noTarget',
      }
    }

    const pressure = opponentPressure(context.player, context.players)
    const shotLaneScore = laneScore(
      context.player.position,
      context.attackGoal,
      context.players.filter(
        (candidate) => candidate.teamSide !== context.player.teamSide,
      ),
    )
    const behindGoal =
      isBehindAttackGoal(
        context.player.position,
        context.attackGoal,
        context.player.teamSide,
      )
    const targetJob =
      this.teamShape.getAssignment(passOption.player.id)?.job ?? null
    let threshold = tacticsConfig.passLaneMinScore

    if (context.player.role === 'support') {
      threshold -= tacticsConfig.supportPassBias
    } else if (context.player.role === 'brute') {
      threshold += 0.1
    }

    if (behindGoal && targetJob === 'frontSlot') {
      threshold -= tacticsConfig.behindNetPassBackBias
    }

    const wideOpenShot =
      pressure < 0.35 &&
      shotLaneScore >= 0.62 &&
      distance(context.player.position, context.attackGoal) <= 320
    const shouldPass =
      passOption.score >= threshold &&
      (intent.aiState === 'PASS' ||
        pressure >= tacticsConfig.passUnderPressureThreshold ||
        behindGoal ||
        context.player.role === 'support' ||
        (context.player.role === 'striker' &&
          shotLaneScore <
            0.58 + tacticsConfig.frontSlotShotBias * 0.18) ||
        (context.player.role === 'brute' && !wideOpenShot))

    if (!shouldPass || wideOpenShot) {
      return {
        intent,
        decision: intent.aiState,
        passTargetId: passOption.player.id,
        passLaneScore: passOption.score,
        passDeniedReason: wideOpenShot ? 'wideOpenShot' : 'laneScoreLow',
      }
    }

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
        aiState: 'PASS',
      },
      decision: 'PASS',
      passTargetId: passOption.player.id,
      passLaneScore: passOption.score,
      passDeniedReason: '-',
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
              `PASS ${decision.passTargetId ?? '-'} ${decision.passLaneScore.toFixed(2)} ${decision.passDeniedReason}`,
          )
          .setVisible(true)
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
    job === 'manMark'
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

function findBestPassOption(
  player: Player,
  players: Player[],
  teamShape: TeamShapeSystem,
): { player: Player; score: number } | null {
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
          ? 0.24
          : assignment?.job === 'behindNet'
            ? 0.18
            : assignment?.job === 'supportOutlet'
              ? 0.14
              : 0.06
      const score = Phaser.Math.Clamp(
        laneScore(player.position, candidate.position, opponents) * 0.62 +
          progress * 0.2 +
          jobBonus,
        0,
        1,
      )

      return { player: candidate, score }
    })
    .sort((a, b) => b.score - a.score)[0]
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

function isInsideKeeperZone(point: Point): boolean {
  return (['A', 'B'] as const).some(
    (side) =>
      distance(point, keeperAreaConfig.areas[side]) <
      keeperAreaConfig.keeperZoneRadius,
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
