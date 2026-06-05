import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { coreSafetyConfig } from '../config/coreSafetyConfig'
import { defenseConfig } from '../config/defenseConfig'
import { coreConfig } from '../config/entityConfig'
import {
  gameplayConfig,
  type GameMode,
} from '../config/gameplayConfig'
import { goalConfigs } from '../config/goalConfig'
import { inputConfig } from '../config/inputConfig'
import { matchFlowConfig } from '../config/matchFlowConfig'
import { viewConfig } from '../config/viewConfig'
import type { Point } from '../data/geometry'
import type { MatchState, PlayerControlIntent, TeamSide } from '../data/matchTypes'
import { initialMatchState } from '../data/scoreData'
import { Core } from '../entities/Core'
import { GoalGate } from '../entities/GoalGate'
import type { Player } from '../entities/Player'
import { labEvents } from '../lab/LabEvents'
import { getLabState, setLabMode } from '../lab/LabState'
import { ArenaDressing } from '../rendering/ArenaDressing'
import { ScoreboardOverlay } from '../rendering/ScoreboardOverlay'
import { GoalRule, type GoalCrossing } from '../rules/GoalRule'
import { AISystem } from '../systems/AISystem'
import { ArenaSystem } from '../systems/ArenaSystem'
import { CoreRecoverySystem } from '../systems/CoreRecoverySystem'
import {
  DefenseSystem,
  type DefenseIntent,
} from '../systems/DefenseSystem'
import { DebugHudSystem } from '../systems/DebugHudSystem'
import { FumbleSystem } from '../systems/FumbleSystem'
import { GoalCelebrationSystem } from '../systems/GoalCelebrationSystem'
import { KeeperAreaSystem } from '../systems/KeeperAreaSystem'
import { MatchFlowSystem } from '../systems/MatchFlowSystem'
import { MatchStatsTracker } from '../systems/MatchStatsTracker'
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
  private arenaDressing!: ArenaDressing
  private arenaSystem!: ArenaSystem
  private keeperAreaSystem!: KeeperAreaSystem
  private coreRecoverySystem!: CoreRecoverySystem
  private inputController!: PlayerInputController
  private teamSystem!: TeamSystem
  private playerControlSystem!: PlayerControlSystem
  private aiSystem!: AISystem
  private stickInteractionSystem!: StickInteractionSystem
  private defenseSystem!: DefenseSystem
  private fumbleSystem!: FumbleSystem
  private matchFlowSystem!: MatchFlowSystem
  private matchStatsTracker!: MatchStatsTracker
  private debugHudSystem!: DebugHudSystem
  private scoreboardOverlay!: ScoreboardOverlay
  private matchState: MatchState = structuredClone(initialMatchState)
  private debugEnabled = false
  private gameMode: GameMode = gameplayConfig.defaultMode
  private currentInputIntent = 'IDLE'

  constructor() {
    super('GameScene')
  }

  init(data?: { gameMode?: GameMode }): void {
    this.gameMode = data?.gameMode ?? getLabState().mode
    this.matchState = structuredClone(initialMatchState)
    this.debugEnabled = false
  }

  create(): void {
    this.matter.world.setGravity(0, 0)
    this.cameras.main.setBackgroundColor(
      arenaPresentationConfig.venue.floorColor,
    )

    const hudRoot = this.getHudRoot()

    this.arenaDressing = new ArenaDressing(this)
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
    this.defenseSystem = new DefenseSystem(this)
    this.fumbleSystem = new FumbleSystem()
    this.coreRecoverySystem = new CoreRecoverySystem()
    this.matchFlowSystem = new MatchFlowSystem(
      new GoalCelebrationSystem(this, hudRoot),
      {
        onResetFormation: this.preparePostGoalReset,
        onResumePlay: this.resumeAfterCountdown,
      },
    )
    this.matchStatsTracker = new MatchStatsTracker()
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
    window.addEventListener(labEvents.apply, this.applyLabChanges)
    window.addEventListener(labEvents.resetMatch, this.resetMatch)
    window.addEventListener(labEvents.resetCore, this.resetCore)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutViewport, this)
      window.removeEventListener(labEvents.apply, this.applyLabChanges)
      window.removeEventListener(labEvents.resetMatch, this.resetMatch)
      window.removeEventListener(labEvents.resetCore, this.resetCore)
      this.inputController.destroy()
      this.debugHudSystem.destroy()
      this.matchFlowSystem.destroy()
      this.scoreboardOverlay.destroy()
      this.arenaDressing.destroy()
    })
  }

  update(time: number, delta: number): void {
    this.arenaDressing.update(time)

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
      getLabState().controlledPlayer,
    )
    const controlledIsCarrier =
      this.stickInteractionSystem.getCarrierId() === controlledPlayer.id
    this.inputController.setGameplayContext(
      controlledIsCarrier,
      this.matchFlowSystem.isPlaying(),
      defenseConfig.bodyCheckEnabled,
    )

    if (this.inputController.consumeDebugToggle()) {
      this.toggleDebug()
    }

    this.matchFlowSystem.update(delta)
    this.inputController.setGameplayContext(
      this.stickInteractionSystem.getCarrierId() === controlledPlayer.id,
      this.matchFlowSystem.isPlaying(),
      defenseConfig.bodyCheckEnabled,
    )

    for (const goal of this.goals) {
      goal.update(delta)
    }

    if (!this.matchFlowSystem.isPlaying()) {
      this.currentInputIntent = 'WAIT'
      this.freezeEntities(players)
      this.core.update()
      this.updateDebugHud(controlledPlayer)
      return
    }

    const aiIntents = this.aiSystem.update(
      players,
      this.core,
      this.stickInteractionSystem.getCarrierId(),
      controlledPlayer.id,
      delta,
    )
    const stickIntents = new Map<string, StickIntent>()
    const defenseIntents = new Map<string, DefenseIntent>()

    this.updateHumanPlayer(
      controlledPlayer,
      stickIntents,
      defenseIntents,
      delta,
    )
    this.updateAIPlayers(
      players,
      controlledPlayer.id,
      aiIntents,
      stickIntents,
      defenseIntents,
    )

    this.stickInteractionSystem.update(
      this.core,
      players,
      stickIntents,
      controlledPlayer.id,
      delta,
    )
    this.defenseSystem.update(
      this.core,
      players,
      defenseIntents,
      this.stickInteractionSystem,
      this.fumbleSystem,
      controlledPlayer.id,
      delta,
    )
    const defenseEvents = this.defenseSystem.consumeEvents()
    let statsChanged = false

    for (const event of defenseEvents) {
      this.matchStatsTracker.recordCheck(event.teamSide)
      statsChanged = true
    }

    statsChanged =
      this.matchStatsTracker.observeCarrier(
        this.stickInteractionSystem.getCarrierId(),
        players,
      ) || statsChanged

    if (statsChanged) {
      this.updateHud()
    }

    this.arenaSystem.containPlayers(players)
    this.keeperAreaSystem.update(players)

    this.core.update()

    let goalScored = false

    for (const goal of this.goals) {
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
    defenseIntents: Map<string, DefenseIntent>,
    deltaMs: number,
  ): void {
    const input = this.inputController.update(
      player.position,
      player.getAimAngle(),
      deltaMs,
    )
    const isCarrier =
      this.stickInteractionSystem.getCarrierId() === player.id

    player.update(input.movement, input.aimAngle)
    stickIntents.set(player.id, {
      hold: input.primaryStickAction,
      suppressEmptyReleaseSwing: !isCarrier,
    })
    defenseIntents.set(player.id, {
      bodyCheck: !isCarrier && input.bodyCheckAction,
      stickSwipe:
        !isCarrier &&
        (input.primaryStickActionStarted ||
          input.explicitStickSwipeAction),
    })
    this.currentInputIntent = isCarrier
      ? input.releasePrimaryStickAction
        ? 'RELEASE'
        : input.primaryStickAction
          ? 'AIM / CHARGE'
          : 'CARRYING'
      : input.bodyCheckAction
        ? 'TRUCK'
        : input.primaryStickActionStarted ||
            input.explicitStickSwipeAction
          ? 'SWIPE / POKE'
          : input.primaryStickAction
            ? 'CATCH READY'
            : 'IDLE'
  }

  private updateAIPlayers(
    players: Player[],
    controlledPlayerId: string,
    intents: Map<string, PlayerControlIntent>,
    stickIntents: Map<string, StickIntent>,
    defenseIntents: Map<string, DefenseIntent>,
  ): void {
    for (const player of players) {
      if (player.id === controlledPlayerId) {
        continue
      }

      const intent = intents.get(player.id)

      if (!intent) {
        player.update(new Phaser.Math.Vector2(), player.getAimAngle())
        stickIntents.set(player.id, { hold: false })
        defenseIntents.set(player.id, {
          bodyCheck: false,
          stickSwipe: false,
        })
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
      defenseIntents.set(player.id, {
        bodyCheck: intent.bodyCheck ?? false,
        stickSwipe: intent.stickSwipe ?? false,
      })
    }
  }

  private createHud(hudRoot: HTMLDivElement): void {
    this.scoreboardOverlay = new ScoreboardOverlay(hudRoot, {
      A:
        this.teamSystem.teams.find((team) => team.side === 'A')?.name ??
        'Team A',
      B:
        this.teamSystem.teams.find((team) => team.side === 'B')?.name ??
        'Team B',
    })
    this.updateHud()
  }

  private layoutViewport(): void {
    const safeLeft = getCssPixelValue('--safe-area-inset-left')
    const safeRight = getCssPixelValue('--safe-area-inset-right')
    const safeTop = getCssPixelValue('--safe-area-inset-top')
    const safeBottom = getCssPixelValue('--safe-area-inset-bottom')
    const width = Math.max(1, this.scale.width - safeLeft - safeRight)
    const scoreboardHeight =
      this.scoreboardOverlay?.getReservedHeight(width) ?? 0
    const viewportTop = safeTop + scoreboardHeight
    const height = Math.max(
      1,
      this.scale.height - viewportTop - safeBottom,
    )
    const cameraPadding = viewConfig.camera.arenaPadding
    const targetWidth = arenaConfig.width + cameraPadding * 2
    const targetHeight = arenaConfig.height + cameraPadding * 2
    const fitZoom = Math.min(width / targetWidth, height / targetHeight)
    const zoom = Math.min(fitZoom, viewConfig.camera.maxZoom)

    this.cameras.main.setViewport(safeLeft, viewportTop, width, height)
    this.cameras.main.setZoom(zoom)
    this.cameras.main.centerOn(arenaConfig.center.x, arenaConfig.center.y)
    this.arenaDressing.layout(this.scale.width)
    this.inputController.layout()
  }

  private scoreGoal(goal: GoalGate, crossing: GoalCrossing): void {
    const scoringSide: TeamSide = goal.id === 'top-goal' ? 'A' : 'B'
    const newScore = this.matchState.score[scoringSide] + 1

    this.matchStatsTracker.recordGoal(scoringSide)
    this.matchState.score[scoringSide] = newScore
    this.matchState.lastScorer = scoringSide

    if (newScore >= this.matchState.firstTo) {
      this.matchState.winner = scoringSide
    }

    goal.flash(matchFlowConfig.goalFlashDurationMs)
    this.beginGoalSequence()
    this.matchFlowSystem.scoreGoal(scoringSide, crossing.impactPoint)
    this.updateHud()
  }

  private resetPositions = (clearGoalCooldown = true): void => {
    this.matchFlowSystem.reset()
    this.resetEntities(clearGoalCooldown)
  }

  private resetEntities(clearGoalCooldown = true): void {
    this.inputController.reset()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.coreRecoverySystem.reset()
    this.matchStatsTracker.clearPossession()
    this.teamSystem.resetFormation()
    this.core.reset()

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn, clearGoalCooldown)
    }
  }

  private toggleGameMode = (): void => {
    const mode = this.gameMode === 'stickLab' ? 'match3v3' : 'stickLab'

    setLabMode(mode)
    this.scene.restart({ gameMode: mode })
  }

  private applyLabChanges = (): void => {
    this.scene.restart({ gameMode: getLabState().mode })
  }

  private resetMatch = (): void => {
    this.matchState = structuredClone(initialMatchState)
    this.matchStatsTracker.reset()
    this.resetPositions()
    this.updateHud()
  }

  private resetCore = (): void => {
    this.matchFlowSystem.reset()
    this.inputController.reset()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.coreRecoverySystem.reset()
    this.matchStatsTracker.clearPossession()
    this.core.reset()

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn)
    }
  }

  private toggleDebug = (): void => {
    const enabled = !this.debugHudSystem.isExpanded()

    this.debugHudSystem.setExpanded(enabled)
    this.setDebugEnabled(enabled)
  }

  private setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.stickInteractionSystem.setDebugEnabled(enabled)
    this.defenseSystem.setDebugEnabled(enabled)
    this.aiSystem.setDebugEnabled(enabled)
    this.teamSystem.setDebugVisible(enabled)
    this.keeperAreaSystem.setDebugEnabled(enabled)
  }

  private recoverCoreToFaceoff(): void {
    this.stickInteractionSystem.clearForReset(this.core)
    this.fumbleSystem.clear()
    this.matchStatsTracker.clearPossession()
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

  private beginGoalSequence(): void {
    this.inputController.reset()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.coreRecoverySystem.reset()
    this.freezeEntities(this.teamSystem.players)
  }

  private preparePostGoalReset = (): void => {
    this.resetEntities(true)
    this.freezeEntities(this.teamSystem.players)
  }

  private resumeAfterCountdown = (): void => {
    this.inputController.reset()
    this.currentInputIntent = 'IDLE'
  }

  private freezeEntities(players: Player[]): void {
    for (const player of players) {
      this.matter.body.setVelocity(player.body, { x: 0, y: 0 })
      this.matter.body.setAngularVelocity(player.body, 0)
      player.updateVisuals()
    }

    this.core.setVelocity({ x: 0, y: 0 })
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
      defenseState: this.defenseSystem.getState(controlledPlayer.id),
      defenseCooldowns:
        this.defenseSystem.getCooldowns(controlledPlayer.id),
      fumblePressure: this.fumbleSystem.getPressure(),
      fumblePressureNormalized:
        this.fumbleSystem.getNormalizedPressure(),
      matchFlowState: this.matchFlowSystem.getState(),
      matchFlowTimerMs: this.matchFlowSystem.getTimerMs(),
      countdownLabel: this.matchFlowSystem.getCountdownLabel(),
      lastScorer: this.matchFlowSystem.getLastScorer(),
      carrierBallHandling:
        this.teamSystem.getPlayer(
          this.stickInteractionSystem.getCarrierId(),
        )?.attributes.ballHandling ?? null,
      truckAvailable:
        this.matchFlowSystem.isPlaying() &&
        defenseConfig.bodyCheckEnabled &&
        this.stickInteractionSystem.getCarrierId() !== controlledPlayer.id,
      swipeAvailable:
        this.matchFlowSystem.isPlaying() &&
        defenseConfig.stickSwipeEnabled &&
        this.stickInteractionSystem.getCarrierId() !== controlledPlayer.id,
      inputIntent: this.currentInputIntent,
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
    this.scoreboardOverlay.update({
      gameMode: this.gameMode,
      score: this.matchState.score,
      firstTo: this.matchState.firstTo,
      winner: this.matchState.winner,
      stats: this.matchStatsTracker.getSnapshot(),
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
