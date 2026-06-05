import Phaser from 'phaser'
import { aiConfig } from '../config/aiConfig'
import { arenaConfig } from '../config/arenaConfig'
import type { Point } from '../data/geometry'
import type {
  AIState,
  PlayerControlIntent,
  TeamSide,
} from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'

export type BruteCheckRequest = {
  bruteId: string
  targetId: string
}

export class AISystem {
  private debugGraphics: Phaser.GameObjects.Graphics
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()
  private bruteCooldowns = new Map<string, number>()
  private checkRequests: BruteCheckRequest[] = []

  constructor(scene: Phaser.Scene) {
    this.debugGraphics = scene.add.graphics()
    this.debugGraphics.setDepth(18)
  }

  update(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
    deltaMs: number,
  ): Map<string, PlayerControlIntent> {
    this.decisionTimerMs -= deltaMs
    this.checkRequests = []

    for (const [id, cooldown] of this.bruteCooldowns) {
      this.bruteCooldowns.set(id, Math.max(0, cooldown - deltaMs))
    }

    if (this.decisionTimerMs <= 0) {
      this.rethink(players, core, carrierId, controlledPlayerId)
      this.decisionTimerMs = aiConfig.decisionIntervalMs
    }

    this.collectBruteChecks(players, carrierId)
    this.drawDebug(players)
    return this.intents
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    if (!enabled) {
      this.debugGraphics.clear()
    }
  }

  consumeCheckRequests(): BruteCheckRequest[] {
    const requests = this.checkRequests
    this.checkRequests = []
    return requests
  }

  private rethink(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
  ): void {
    const carrier = players.find((player) => player.id === carrierId) ?? null

    for (const player of players) {
      if (player.id === controlledPlayerId) {
        continue
      }

      const intent = this.decide(player, players, core, carrier)
      this.intents.set(player.id, intent)
      player.setAIState(intent.aiState)
    }
  }

  private decide(
    player: Player,
    players: Player[],
    core: Core,
    carrier: Player | null,
  ): PlayerControlIntent {
    const ownGoal = goalPoint(player.teamSide)
    const attackGoal = goalPoint(player.teamSide === 'A' ? 'B' : 'A')
    const distanceToCore = distance(player.position, core.position)
    const isCarrier = carrier?.id === player.id
    const teammateHasCore = carrier?.teamSide === player.teamSide
    const opponentHasCore = carrier && carrier.teamSide !== player.teamSide

    if (isCarrier && player.role === 'keeper') {
      const clearTarget = addAccuracySpread(
        attackGoal,
        player.attributes.accuracy,
        aiConfig.shotSpread,
        player.id,
      )

      return intent(player.position, clearTarget, true, 'CLEAR', clearTarget)
    }

    if (player.role === 'keeper') {
      const toCore = normalized({
        x: core.position.x - ownGoal.x,
        y: core.position.y - ownGoal.y,
      })
      const homeDistance = Math.min(
        aiConfig.keeperHomeRadius,
        distance(ownGoal, core.position) * aiConfig.keeperAggression,
      )
      const homeTarget = {
        x: ownGoal.x + toCore.x * homeDistance,
        y: ownGoal.y + toCore.y * homeDistance,
      }

      return intent(
        homeTarget,
        core.position,
        distanceToCore <= aiConfig.aiCradleRadius,
        'DEFEND_GOAL',
      )
    }

    if (isCarrier) {
      if (player.role === 'support') {
        const target = bestForwardTeammate(player, players)
        const passTarget = addAccuracySpread(
          leadPoint(target, attackGoal, aiConfig.passLeadDistance),
          player.attributes.accuracy,
          aiConfig.passSpread,
          player.id,
        )

        return intent(player.position, passTarget, true, 'PASS', passTarget)
      }

      const state: AIState = player.role === 'brute' ? 'CLEAR' : 'SHOOT'
      const spread = player.role === 'brute' ? aiConfig.shotSpread * 1.5 : aiConfig.shotSpread
      const shotTarget = addAccuracySpread(
        attackGoal,
        player.attributes.accuracy,
        spread,
        player.id,
      )

      return intent(player.position, shotTarget, true, state, shotTarget)
    }

    if (player.role === 'brute' && opponentHasCore) {
      return intent(carrier.position, carrier.position, false, 'PRESS_CARRIER')
    }

    if (opponentHasCore) {
      return intent(carrier.position, carrier.position, false, 'MARK_CARRIER')
    }

    if (teammateHasCore) {
      const lateral = player.teamSide === 'A' ? -1 : 1
      const supportTarget = {
        x: Phaser.Math.Clamp(
          carrier.position.x + lateral * aiConfig.supportSpacing,
          arenaConfig.center.x - arenaConfig.width * 0.38,
          arenaConfig.center.x + arenaConfig.width * 0.38,
        ),
        y:
          carrier.position.y +
          (player.teamSide === 'A' ? -aiConfig.supportSpacing : aiConfig.supportSpacing),
      }

      return intent(supportTarget, core.position, false, 'SUPPORT_ATTACK')
    }

    return intent(
      core.position,
      core.position,
      distanceToCore <= aiConfig.aiCradleRadius,
      'SEEK_CORE',
    )
  }

  private collectBruteChecks(players: Player[], carrierId: string | null): void {
    const carrier = players.find((player) => player.id === carrierId)

    if (!carrier) {
      return
    }

    for (const brute of players.filter((player) => player.role === 'brute')) {
      if (
        brute.teamSide === carrier.teamSide ||
        distance(brute.position, carrier.position) > aiConfig.bruteCheckRadius ||
        (this.bruteCooldowns.get(brute.id) ?? 0) > 0
      ) {
        continue
      }

      this.checkRequests.push({
        bruteId: brute.id,
        targetId: carrier.id,
      })
      this.bruteCooldowns.set(brute.id, aiConfig.bruteCheckCooldownMs)
    }
  }

  private drawDebug(players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    this.debugGraphics.clear()

    for (const player of players) {
      if (player.role === 'keeper') {
        this.debugGraphics.lineStyle(2, 0x76e5ff, 0.55)
        this.debugGraphics.strokeCircle(
          goalPoint(player.teamSide).x,
          goalPoint(player.teamSide).y,
          aiConfig.keeperHomeRadius,
        )
      }

      if (player.role === 'brute') {
        this.debugGraphics.lineStyle(2, 0xff6b7a, 0.55)
        this.debugGraphics.strokeCircle(
          player.position.x,
          player.position.y,
          aiConfig.brutePressureRadius,
        )
      }
    }
  }
}

function intent(
  moveTarget: Point,
  aimTarget: Point,
  hold: boolean,
  aiState: AIState,
  releaseTarget?: Point,
): PlayerControlIntent {
  return {
    moveTarget,
    aimTarget,
    hold,
    releaseTarget,
    aiState,
  }
}

function goalPoint(defendingSide: TeamSide): Point {
  return {
    x: arenaConfig.center.x,
    y:
      defendingSide === 'A'
        ? arenaConfig.center.y + arenaConfig.height / 2 - 190
        : arenaConfig.center.y - arenaConfig.height / 2 + 190,
  }
}

function bestForwardTeammate(player: Player, players: Player[]): Player {
  const teammates = players.filter(
    (candidate) =>
      candidate.teamSide === player.teamSide &&
      candidate.id !== player.id &&
      candidate.role !== 'keeper',
  )

  if (teammates.length === 0) {
    return player
  }

  return teammates.reduce((best, candidate) => {
    const candidateProgress =
      player.teamSide === 'A' ? -candidate.position.y : candidate.position.y
    const bestProgress = player.teamSide === 'A' ? -best.position.y : best.position.y

    return candidateProgress > bestProgress ? candidate : best
  })
}

function leadPoint(player: Player, attackGoal: Point, leadDistance: number): Point {
  const direction = normalized({
    x: attackGoal.x - player.position.x,
    y: attackGoal.y - player.position.y,
  })

  return {
    x: player.position.x + direction.x * leadDistance,
    y: player.position.y + direction.y * leadDistance,
  }
}

function addAccuracySpread(
  target: Point,
  accuracy: number,
  maxSpread: number,
  seed: string,
): Point {
  const roughness = 1 - accuracy
  const hash = [...seed].reduce((value, char) => value + char.charCodeAt(0), 0)
  const xNoise = Math.sin(hash * 12.9898) * maxSpread * roughness
  const yNoise = Math.cos(hash * 78.233) * maxSpread * roughness

  return {
    x: target.x + xNoise,
    y: target.y + yNoise,
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function normalized(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y)

  if (length === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}
