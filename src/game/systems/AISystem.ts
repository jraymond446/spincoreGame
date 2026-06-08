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

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private readonly keeperAI: KeeperAISystem
  private readonly teamShape: TeamShapeSystem
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()

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

  reset(): void {
    this.decisionTimerMs = 0
    this.intents.clear()
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
      const intent =
        context.isCarrier && bankTarget && baseIntent.releaseTarget
          ? {
              ...baseIntent,
              aimTarget: bankTarget,
              releaseTarget: bankTarget,
            }
          : baseIntent
      const assignment = this.teamShape.getAssignment(player.id)
      const followsShape =
        !context.isCarrier &&
        assignment !== null &&
        assignment.job !== 'primaryPresser' &&
        assignment.job !== 'keeper'
      const highPressing =
        assignment?.job === 'primaryPresser' &&
        this.teamShape.getStrategy(player.teamSide).defenseScheme ===
          'highPress'
      const shapedIntent = followsShape
        ? {
            ...intent,
            moveTarget: assignment.target,
            aimTarget: core.position,
            hold: false,
            swing: false,
            releaseTarget: undefined,
            aiReleaseDelayMs: undefined,
            aiState:
              isDefensiveJob(assignment.job)
                ? ('MARK_CARRIER' as const)
                : ('SUPPORT_ATTACK' as const),
          }
        : highPressing
          ? {
              ...intent,
              moveSpeedMultiplier: Math.max(
                intent.moveSpeedMultiplier ?? 1,
                1 + tacticsConfig.highPressAggression * 0.12,
              ),
            }
          : intent
      const baseDefense = followsShape
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
    }
  }

  private drawDebug(players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    this.debugGraphics.clear()

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
