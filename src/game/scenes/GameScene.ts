import Phaser from 'phaser'
import { aiConfig } from '../config/aiConfig'
import { arenaConfig } from '../config/arenaConfig'
import { coreConfig } from '../config/entityConfig'
import { goalConfigs } from '../config/goalConfig'
import { viewConfig } from '../config/viewConfig'
import type { Point } from '../data/geometry'
import type { MatchState, PlayerControlIntent, TeamSide } from '../data/matchTypes'
import { initialMatchState, scoreLabels } from '../data/scoreData'
import { Core } from '../entities/Core'
import { GoalGate } from '../entities/GoalGate'
import type { Player } from '../entities/Player'
import { GoalRule, type GoalCrossing } from '../rules/GoalRule'
import { AISystem } from '../systems/AISystem'
import { ArenaSystem } from '../systems/ArenaSystem'
import { InputController } from '../systems/InputController'
import { PlayerControlSystem } from '../systems/PlayerControlSystem'
import {
  StickInteractionSystem,
  type StickIntent,
} from '../systems/StickInteractionSystem'
import { TeamSystem } from '../systems/TeamSystem'

export class GameScene extends Phaser.Scene {
  private core!: Core
  private goals: GoalGate[] = []
  private goalRules = new Map<string, GoalRule>()
  private inputController!: InputController
  private teamSystem!: TeamSystem
  private playerControlSystem!: PlayerControlSystem
  private aiSystem!: AISystem
  private stickInteractionSystem!: StickInteractionSystem
  private scoreElement!: HTMLDivElement
  private matchState: MatchState = structuredClone(initialMatchState)
  private debugEnabled = false

  constructor() {
    super('GameScene')
  }

  create(): void {
    this.matter.world.setGravity(0, 0)
    this.cameras.main.setBackgroundColor('#071016')

    new ArenaSystem(this)
    this.goals = goalConfigs.map((config) => new GoalGate(this, config))
    this.core = new Core(this)
    this.teamSystem = new TeamSystem(this)
    this.playerControlSystem = new PlayerControlSystem()
    this.aiSystem = new AISystem(this)
    this.inputController = new InputController(this)
    this.stickInteractionSystem = new StickInteractionSystem(this)

    for (const goal of this.goals) {
      this.goalRules.set(goal.id, new GoalRule(this.core.position))
    }

    this.createHud()
    this.layoutViewport()
    this.scale.on('resize', this.layoutViewport, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutViewport, this)
      this.scoreElement.remove()
    })
  }

  update(_time: number, delta: number): void {
    const players = this.teamSystem.players
    const controlledPlayer = this.playerControlSystem.update(
      this.teamSystem.getPlayersForSide('A'),
      this.stickInteractionSystem.getCarrierId(),
      this.core.position,
      delta,
    )
    const aiIntents = this.aiSystem.update(
      players,
      this.core,
      this.stickInteractionSystem.getCarrierId(),
      controlledPlayer.id,
      delta,
    )
    const stickIntents = new Map<string, StickIntent>()

    this.updateHumanPlayer(controlledPlayer, stickIntents)
    this.updateAIPlayers(players, controlledPlayer.id, aiIntents, stickIntents)

    if (this.inputController.consumeDebugToggle()) {
      this.debugEnabled = this.stickInteractionSystem.toggleDebug()
      this.aiSystem.setDebugEnabled(this.debugEnabled)
      this.teamSystem.setDebugVisible(this.debugEnabled)
    }

    this.stickInteractionSystem.update(
      this.core,
      players,
      stickIntents,
      controlledPlayer.id,
      delta,
    )

    for (const request of this.aiSystem.consumeCheckRequests()) {
      if (Math.random() <= aiConfig.bruteFumblePressure) {
        this.stickInteractionSystem.forceFumble(this.core, players, request.targetId)
      }
    }

    this.core.update()

    for (const goal of this.goals) {
      goal.update(delta)
      const crossing = this.goalRules.get(goal.id)?.check(this.core.position, goal)

      if (crossing) {
        this.scoreGoal(goal, crossing)
        break
      }
    }
  }

  private updateHumanPlayer(
    player: Player,
    stickIntents: Map<string, StickIntent>,
  ): void {
    player.update(
      this.inputController.getMovementVector(),
      this.inputController.getAimAngle(player.position),
    )
    stickIntents.set(player.id, {
      hold: this.inputController.isPointerHeld(),
    })
  }

  private updateAIPlayers(
    players: Player[],
    controlledPlayerId: string,
    intents: Map<string, PlayerControlIntent>,
    stickIntents: Map<string, StickIntent>,
  ): void {
    for (const player of players) {
      if (player.id === controlledPlayerId) {
        continue
      }

      const intent = intents.get(player.id)

      if (!intent) {
        player.update(new Phaser.Math.Vector2(), player.getAimAngle())
        stickIntents.set(player.id, { hold: false })
        continue
      }

      const move = movementToward(player.position, intent.moveTarget)
      let aimAngle = Phaser.Math.Angle.Between(
        player.position.x,
        player.position.y,
        intent.aimTarget.x,
        intent.aimTarget.y,
      )

      if (
        intent.hold &&
        this.stickInteractionSystem.getCarrierId() !== player.id &&
        distance(player.position, this.core.position) <= aiConfig.aiCradleRadius
      ) {
        aimAngle -= 0.42
      }

      player.update(move, aimAngle)
      stickIntents.set(player.id, {
        hold: intent.hold,
        releaseTarget: intent.releaseTarget,
      })
    }
  }

  private createHud(): void {
    const hudRoot = document.querySelector<HTMLDivElement>('#hud-root')

    if (!hudRoot) {
      throw new Error('Missing #hud-root element')
    }

    this.scoreElement = document.createElement('div')
    this.scoreElement.className = 'scoreboard'
    hudRoot.appendChild(this.scoreElement)
    this.layoutHud()
    this.updateHud()
  }

  private layoutViewport(): void {
    const width = Math.max(1, this.scale.width)
    const height = Math.max(1, this.scale.height)
    const cameraPadding = viewConfig.camera.arenaPadding
    const targetWidth = arenaConfig.width + cameraPadding * 2
    const targetHeight = arenaConfig.height + cameraPadding * 2
    const fitZoom = Math.min(width / targetWidth, height / targetHeight)
    const zoom = Math.min(fitZoom, viewConfig.camera.maxZoom)

    this.cameras.main.setViewport(0, 0, width, height)
    this.cameras.main.setZoom(zoom)
    this.cameras.main.centerOn(arenaConfig.center.x, arenaConfig.center.y)
    this.layoutHud()
  }

  private layoutHud(): void {
    if (!this.scoreElement) {
      return
    }

    this.scoreElement.style.left = `${viewConfig.hud.padding.x}px`
    this.scoreElement.style.top = `${viewConfig.hud.padding.y}px`
  }

  private scoreGoal(goal: GoalGate, crossing: GoalCrossing): void {
    const scoringSide: TeamSide = goal.id === 'top-goal' ? 'A' : 'B'
    const newScore = this.matchState.score[scoringSide] + 1

    this.matchState.score[scoringSide] = newScore
    this.matchState.lastScorer = scoringSide

    if (newScore >= this.matchState.firstTo) {
      this.matchState.winner = scoringSide
    }

    goal.flash()
    this.burstAt(crossing.impactPoint)
    this.resetAfterGoal()
    this.updateHud()
  }

  private resetAfterGoal(): void {
    this.stickInteractionSystem.clearForReset(this.core)
    this.teamSystem.resetFormation()
    this.core.reset()

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn)
    }
  }

  private updateHud(): void {
    const winner = this.matchState.winner
      ? `\n${scoreLabels.winner} TEAM ${this.matchState.winner}`
      : ''

    this.scoreElement.textContent =
      `${scoreLabels.title}\n` +
      `${scoreLabels.teamA} ${this.matchState.score.A}  -  ` +
      `${scoreLabels.teamB} ${this.matchState.score.B}\n` +
      `${scoreLabels.firstTo} ${this.matchState.firstTo}${winner}`
  }

  private burstAt(point: Point): void {
    const burst = this.add.graphics()

    burst.lineStyle(4, 0xf8fbff, 0.9)
    burst.strokeCircle(point.x, point.y, 32)
    burst.lineStyle(2, 0x67f4ff, 0.8)
    burst.strokeCircle(point.x, point.y, 52)
    burst.setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.8,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        burst.destroy()
      },
    })
  }
}

function movementToward(position: Point, target: Point): Phaser.Math.Vector2 {
  const vector = new Phaser.Math.Vector2(target.x - position.x, target.y - position.y)

  if (vector.lengthSq() < 24 * 24) {
    return vector.set(0, 0)
  }

  return vector.normalize()
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
