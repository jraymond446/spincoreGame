import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { coreSafetyConfig } from '../config/coreSafetyConfig'
import { coreConfig } from '../config/entityConfig'
import {
  gameplayConfig,
  type GameMode,
} from '../config/gameplayConfig'
import { goalConfigs } from '../config/goalConfig'
import { inputConfig } from '../config/inputConfig'
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
import { CoreRecoverySystem } from '../systems/CoreRecoverySystem'
import { DebugHudSystem } from '../systems/DebugHudSystem'
import { KeeperAreaSystem } from '../systems/KeeperAreaSystem'
import { PlayerInputController } from '../systems/PlayerInputController'
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
  private arenaSystem!: ArenaSystem
  private keeperAreaSystem!: KeeperAreaSystem
  private coreRecoverySystem!: CoreRecoverySystem
  private inputController!: PlayerInputController
  private teamSystem!: TeamSystem
  private playerControlSystem!: PlayerControlSystem
  private aiSystem!: AISystem
  private stickInteractionSystem!: StickInteractionSystem
  private debugHudSystem!: DebugHudSystem
  private scoreElement!: HTMLDivElement
  private matchState: MatchState = structuredClone(initialMatchState)
  private debugEnabled = false
  private gameMode: GameMode = gameplayConfig.defaultMode

  constructor() {
    super('GameScene')
  }

  init(data?: { gameMode?: GameMode }): void {
    this.gameMode = data?.gameMode ?? gameplayConfig.defaultMode
    this.matchState = structuredClone(initialMatchState)
    this.debugEnabled = false
  }

  create(): void {
    this.matter.world.setGravity(0, 0)
    this.cameras.main.setBackgroundColor('#071016')

    const hudRoot = this.getHudRoot()

    this.arenaSystem = new ArenaSystem(this)
    this.keeperAreaSystem = new KeeperAreaSystem(this)
    this.keeperAreaSystem.setActive(this.gameMode === 'match3v3')
    this.goals = goalConfigs
      .filter(
        (config) =>
          this.gameMode === 'match3v3' ||
          config.id === gameplayConfig.stickLab.goalId,
      )
      .map((config) => new GoalGate(this, config))
    this.goalRules.clear()
    this.core = new Core(this)
    this.teamSystem = new TeamSystem(this, this.gameMode)
    this.playerControlSystem = new PlayerControlSystem()
    this.aiSystem = new AISystem(
      this,
      this.teamSystem.getFormationBiases(),
    )
    this.inputController = new PlayerInputController(this, hudRoot)
    this.stickInteractionSystem = new StickInteractionSystem(this)
    this.coreRecoverySystem = new CoreRecoverySystem()
    this.debugHudSystem = new DebugHudSystem(hudRoot, {
      onReset: this.resetPositions,
      onToggleMode: this.toggleGameMode,
      onToggleDebug: this.toggleDebug,
    })
    this.setDebugEnabled(this.debugHudSystem.isExpanded())

    for (const goal of this.goals) {
      this.goalRules.set(goal.id, new GoalRule(this.core.position))
    }

    this.createHud(hudRoot)
    this.layoutViewport()
    this.scale.on('resize', this.layoutViewport, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutViewport, this)
      this.inputController.destroy()
      this.debugHudSystem.destroy()
      this.scoreElement.remove()
    })
  }

  update(_time: number, delta: number): void {
    if (this.inputController.consumeModeToggle()) {
      this.toggleGameMode()
      return
    }

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

    this.updateHumanPlayer(controlledPlayer, stickIntents, delta)
    this.updateAIPlayers(players, controlledPlayer.id, aiIntents, stickIntents)
    this.arenaSystem.containPlayers(players)
    this.keeperAreaSystem.update(players)

    if (this.inputController.consumeDebugToggle()) {
      this.toggleDebug()
    }

    this.stickInteractionSystem.update(
      this.core,
      players,
      stickIntents,
      controlledPlayer.id,
      delta,
    )

    for (const request of this.aiSystem.consumeCheckRequests()) {
      if (
        this.stickInteractionSystem.getStickState(request.bruteId) ===
          'SWINGING' &&
        Math.random() <= request.fumbleChance
      ) {
        this.stickInteractionSystem.forceFumble(this.core, players, request.targetId)
      }
    }

    this.core.update()

    let goalScored = false

    for (const goal of this.goals) {
      goal.update(delta)
      const crossing = this.goalRules
        .get(goal.id)
        ?.check(this.core.position, goal, delta)

      if (crossing) {
        this.scoreGoal(goal, crossing)
        goalScored = true
        break
      }
    }

    if (!goalScored && this.coreRecoverySystem.update(this.core.position, delta)) {
      this.recoverCoreToFaceoff()
    }

    this.updateDebugHud(controlledPlayer)
  }

  private updateHumanPlayer(
    player: Player,
    stickIntents: Map<string, StickIntent>,
    deltaMs: number,
  ): void {
    const input = this.inputController.update(
      player.position,
      player.getAimAngle(),
      deltaMs,
    )

    player.update(input.movement, input.aimAngle)
    stickIntents.set(player.id, {
      hold: input.hold,
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
      const aimAngle = Phaser.Math.Angle.Between(
        player.position.x,
        player.position.y,
        intent.aimTarget.x,
        intent.aimTarget.y,
      )

      player.update(move, aimAngle)
      stickIntents.set(player.id, {
        hold: intent.hold,
        swing: intent.swing,
        releaseTarget: intent.releaseTarget,
        aiReleaseDelayMs: intent.aiReleaseDelayMs,
      })
    }
  }

  private createHud(hudRoot: HTMLDivElement): void {
    this.scoreElement = document.createElement('div')
    this.scoreElement.className = 'scoreboard'
    hudRoot.appendChild(this.scoreElement)
    this.layoutHud()
    this.updateHud()
  }

  private layoutViewport(): void {
    const safeLeft = getCssPixelValue('--safe-area-inset-left')
    const safeRight = getCssPixelValue('--safe-area-inset-right')
    const safeTop = getCssPixelValue('--safe-area-inset-top')
    const safeBottom = getCssPixelValue('--safe-area-inset-bottom')
    const width = Math.max(1, this.scale.width - safeLeft - safeRight)
    const height = Math.max(1, this.scale.height - safeTop - safeBottom)
    const cameraPadding = viewConfig.camera.arenaPadding
    const targetWidth = arenaConfig.width + cameraPadding * 2
    const targetHeight = arenaConfig.height + cameraPadding * 2
    const fitZoom = Math.min(width / targetWidth, height / targetHeight)
    const zoom = Math.min(fitZoom, viewConfig.camera.maxZoom)

    this.cameras.main.setViewport(safeLeft, safeTop, width, height)
    this.cameras.main.setZoom(zoom)
    this.cameras.main.centerOn(arenaConfig.center.x, arenaConfig.center.y)
    this.inputController.layout()
    this.layoutHud()
  }

  private layoutHud(): void {
    if (!this.scoreElement) {
      return
    }

    this.scoreElement.style.left =
      `calc(${viewConfig.hud.padding.x}px + env(safe-area-inset-left, 0px))`
    this.scoreElement.style.top =
      `calc(${viewConfig.hud.padding.y}px + env(safe-area-inset-top, 0px))`
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
    this.resetPositions(false)
  }

  private resetPositions = (clearGoalCooldown = true): void => {
    this.inputController.reset()
    this.stickInteractionSystem.clearForReset(this.core)
    this.coreRecoverySystem.reset()
    this.teamSystem.resetFormation()
    this.core.reset()

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn, clearGoalCooldown)
    }
  }

  private toggleGameMode = (): void => {
    this.scene.restart({
      gameMode: this.gameMode === 'stickLab' ? 'match3v3' : 'stickLab',
    })
  }

  private toggleDebug = (): void => {
    const enabled = !this.debugHudSystem.isExpanded()

    this.debugHudSystem.setExpanded(enabled)
    this.setDebugEnabled(enabled)
  }

  private setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.stickInteractionSystem.setDebugEnabled(enabled)
    this.aiSystem.setDebugEnabled(enabled)
    this.teamSystem.setDebugVisible(enabled)
    this.keeperAreaSystem.setDebugEnabled(enabled)
  }

  private recoverCoreToFaceoff(): void {
    this.stickInteractionSystem.clearForReset(this.core)
    this.core.reset()

    if (coreSafetyConfig.coreResetImpulseAfterRecovery > 0) {
      this.core.setVelocity({
        x: 0,
        y: -coreSafetyConfig.coreResetImpulseAfterRecovery,
      })
    }

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn)
    }
  }

  private updateDebugHud(controlledPlayer: Player): void {
    if (!this.debugEnabled && !inputConfig.debugTouchHud) {
      return
    }

    const inputVectors = this.inputController.getDebugVectors()

    this.debugHudSystem.update({
      gameMode: this.gameMode,
      score: this.matchState.score,
      coreState: this.stickInteractionSystem.getState(),
      stickState: this.stickInteractionSystem.getStickState(controlledPlayer.id),
      possessionOwner: this.stickInteractionSystem.getCarrierId(),
      inputMode: this.inputController.getMode(),
      leftJoystickVector: inputVectors.leftJoystick,
      rightAimVector: inputVectors.rightAim,
      controlledPlayerId: controlledPlayer.id,
      controlledPlayerRole: controlledPlayer.role,
      chargeElapsedMs: this.stickInteractionSystem.getCradleElapsedMs(),
      chargeNormalized: this.stickInteractionSystem.getChargeNormalized(),
      releaseForcePreview:
        this.stickInteractionSystem.getReleaseForcePreview(),
      cradlePhase: this.stickInteractionSystem.getCradlePhase(),
      stickVisualRotation: controlledPlayer.getStickVisualRotation(),
      catchAutoOrientActive:
        this.stickInteractionSystem.isCatchAutoOrientActive(
          controlledPlayer.id,
        ),
      coreInCatchAssistRadius:
        this.stickInteractionSystem.isCoreInCatchAssistRadius(
          this.core,
          controlledPlayer,
        ),
      cradleFailure: this.stickInteractionSystem.getCradleFailureReason(
        controlledPlayer.id,
      ),
      lastInteraction: this.stickInteractionSystem.getLastInteraction(),
      recoveryStatus: this.coreRecoverySystem.getDebugStatus(),
      formations: this.teamSystem.getFormationIds(),
    })
  }

  private getHudRoot(): HTMLDivElement {
    const hudRoot = document.querySelector<HTMLDivElement>('#hud-root')

    if (!hudRoot) {
      throw new Error('Missing #hud-root element')
    }

    return hudRoot
  }

  private updateHud(): void {
    if (this.gameMode === 'stickLab') {
      this.scoreElement.textContent =
        `STICK LAB\nGOALS ${this.matchState.score.A}\nCORE CONTROL`
      return
    }

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

function getCssPixelValue(propertyName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim()
  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}
