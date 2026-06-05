import Phaser from 'phaser'
import { createAIDecisionContext } from '../ai/AIDecisionContext'
import { getPlayStyleModifiers } from '../ai/PlayStyleModifiers'
import { decideRoleIntent } from '../ai/RoleBehaviors'
import { aiConfig } from '../config/aiConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'
import type {
  FormationAIBias,
  PlayerControlIntent,
  TeamSide,
} from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'

export type BruteCheckRequest = {
  bruteId: string
  targetId: string
  fumbleChance: number
}

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()
  private bruteCooldowns = new Map<string, number>()
  private checkRequests: BruteCheckRequest[] = []

  constructor(
    scene: Phaser.Scene,
    formationBiases: Record<TeamSide, FormationAIBias>,
  ) {
    this.formationBiases = formationBiases
    this.debugGraphics = scene.add.graphics().setDepth(18)
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
      this.decisionTimerMs = stickConfig.aiDecisionIntervalMs
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
    const carrier =
      players.find((player) => player.id === carrierId) ?? null

    for (const player of players) {
      if (player.id === controlledPlayerId) {
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
      const intent = decideRoleIntent(context)

      this.intents.set(player.id, intent)
      player.setAIState(intent.aiState)
    }
  }

  private collectBruteChecks(
    players: Player[],
    carrierId: string | null,
  ): void {
    const carrier = players.find((player) => player.id === carrierId)

    if (!carrier) {
      return
    }

    for (const brute of players.filter(
      (player) => player.role === 'brute',
    )) {
      const style = getPlayStyleModifiers(
        brute.role,
        brute.playStyle,
      )
      const formationBias = this.formationBiases[brute.teamSide]
      const pressureRange =
        aiConfig.bruteCheckRadius *
        style.bruteCheckMultiplier *
        formationBias.brutePressureMultiplier *
        Phaser.Math.Linear(0.82, 1.1, brute.attributes.defense)

      if (
        brute.teamSide === carrier.teamSide ||
        distance(brute.position, carrier.position) > pressureRange ||
        (this.bruteCooldowns.get(brute.id) ?? 0) > 0
      ) {
        continue
      }

      const execution =
        brute.attributes.defense * 0.48 +
        brute.attributes.power * 0.52
      const fumbleChance = Phaser.Math.Clamp(
        aiConfig.bruteFumblePressure *
          execution *
          style.bruteCheckMultiplier *
          formationBias.brutePressureMultiplier,
        0,
        0.92,
      )

      this.checkRequests.push({
        bruteId: brute.id,
        targetId: carrier.id,
        fumbleChance,
      })
      this.bruteCooldowns.set(
        brute.id,
        aiConfig.bruteCheckCooldownMs,
      )
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

function goalPoint(defendingSide: TeamSide): Point {
  return keeperAreaConfig.areas[defendingSide]
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
