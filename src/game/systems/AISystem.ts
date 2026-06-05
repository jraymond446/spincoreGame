import Phaser from 'phaser'
import { createAIDecisionContext } from '../ai/AIDecisionContext'
import { decideDefenseActions } from '../ai/DefenseBehavior'
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

export class AISystem {
  private readonly debugGraphics: Phaser.GameObjects.Graphics
  private readonly formationBiases: Record<TeamSide, FormationAIBias>
  private debugEnabled = false
  private decisionTimerMs = 0
  private intents = new Map<string, PlayerControlIntent>()

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
    if (this.decisionTimerMs <= 0) {
      this.rethink(players, core, carrierId, controlledPlayerId)
      this.decisionTimerMs = stickConfig.aiDecisionIntervalMs
    }

    this.drawDebug(players)
    return this.intents
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    if (!enabled) {
      this.debugGraphics.clear()
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
      const defense = decideDefenseActions(context)

      this.intents.set(player.id, {
        ...intent,
        ...defense,
      })
      player.setAIState(intent.aiState)
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
