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
import { keeperConfig } from '../config/keeperConfig'
import { matchFlowConfig } from '../config/matchFlowConfig'
import { stickConfig } from '../config/stickConfig'
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
import { preloadVisualAssetOverrides } from '../rendering/VisualAssetOverrides'
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
import type { PlayerInputState } from '../systems/PlayerInputController'
import { PlayerControlSystem } from '../systems/PlayerControlSystem'
import { KeeperControlAssistSystem } from '../systems/KeeperControlAssistSystem'
import { KeeperSaveSystem } from '../systems/KeeperSaveSystem'
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
  private keeperControlAssistSystem!: KeeperControlAssistSystem
  private keeperSaveSystem!: KeeperSaveSystem
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

  preload(): void {
    preloadVisualAssetOverrides(this)
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
    this.keeperControlAssistSystem = new KeeperControlAssistSystem()
    this.keeperSaveSystem = new KeeperSaveSystem()
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
      this.core.velocity,
      delta,
      getLabState().controlledPlayer,
      this.gameMode === 'stickLab',
    )
    const controlledIsCarrier =
      this.stickInteractionSystem.getCarrierId() === controlledPlayer.id
    this.inputController.setGameplayContext(
      controlledIsCarrier,
      this.matchFlowSystem.isPlaying(),
      defenseConfig.truckEnabled,
    )

    if (this.inputController.consumeDebugToggle()) {
      this.toggleDebug()
    }

    this.matchFlowSystem.update(delta)
    this.inputController.setGameplayContext(
      this.stickInteractionSystem.getCarrierId() === controlledPlayer.id,
      this.matchFlowSystem.isPlaying(),
      defenseConfig.truckEnabled,
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

    const humanInput = this.inputController.update(
      controlledPlayer.position,
      controlledPlayer.getAimAngle(),
      delta,
    )
    const keeperHumanBias = this.keeperControlAssistSystem.update(
      controlledPlayer,
      humanInput.movement,
      delta,
    )
    const aiIntents = this.aiSystem.update(
      players,
      this.core,
      this.stickInteractionSystem.getCarrierId(),
      controlledPlayer.id,
      delta,
      keeperHumanBias,
    )
    const stickIntents = new Map<string, StickIntent>()
    const defenseIntents = new Map<string, DefenseIntent>()

    this.updateHumanPlayer(
      controlledPlayer,
      stickIntents,
      defenseIntents,
      humanInput,
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
    const savedSide = this.keeperSaveSystem.update(
      this.core,
      players,
      this.stickInteractionSystem.consumeInteractionEvent(),
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

    if (savedSide) {
      this.matchStatsTracker.recordSave(savedSide)
      statsChanged = true
    }

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
    this.keeperAreaSystem.update(players, delta)

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
    input: PlayerInputState,
  ): void {
    const isCarrier =
      this.stickInteractionSystem.getCarrierId() === player.id
    const movement =
      player.role === 'keeper'
        ? this.keeperControlAssistSystem.getManualMovement(
            player,
            input.movement,
          )
        : input.movement

    player.update(movement, input.aimAngle)
    stickIntents.set(player.id, {
      hold: input.primaryStickAction,
      suppressEmptyReleaseSwing: !isCarrier,
      chargeIntensity: input.primaryIntensity,
    })
    defenseIntents.set(player.id, {
      truck: !isCarrier && input.truckAction,
      slash:
        !isCarrier &&
        (input.primaryStickActionStarted ||
          input.explicitSlashAction),
      aimDirection: {
        x: Math.cos(input.aimAngle),
        y: Math.sin(input.aimAngle),
      },
    })
    this.currentInputIntent = isCarrier
      ? input.releasePrimaryStickAction
        ? 'RELEASE'
        : input.primaryStickAction
          ? 'AIM / CHARGE'
          : 'CARRYING'
      : input.truckAction
        ? 'TRUCK'
        : input.primaryStickActionStarted ||
            input.explicitSlashAction
          ? 'SLASH'
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
          truck: false,
          slash: false,
        })
        continue
      }

      const baseMove = intent.moveVector
        ? new Phaser.Math.Vector2(
            intent.moveVector.x,
            intent.moveVector.y,
          )
        : movementToward(player.position, intent.moveTarget)
      const move = baseMove.scale(intent.moveSpeedMultiplier ?? 1)
      const aimAngle = Phaser.Math.Angle.Between(
        player.position.x,
        player.position.y,
        intent.aimTarget.x,
        intent.aimTarget.y,
      )

      player.update(move, aimAngle)
      stickIntents.set(player.id, {
        hold: intent.hold,
        swing: false,
        suppressEmptyReleaseSwing: true,
        releaseTarget: intent.releaseTarget,
        aiReleaseDelayMs: intent.aiReleaseDelayMs,
      })
      defenseIntents.set(player.id, {
        truck: intent.truck ?? false,
        slash: (intent.slash ?? false) || (intent.swing ?? false),
        aimDirection: normalizedDirection(
          player.position,
          intent.aimTarget,
          player.getReleaseAimForward(),
        ),
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
    this.keeperControlAssistSystem.reset()
    this.keeperSaveSystem.reset()
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
    this.keeperControlAssistSystem.reset()
    this.keeperSaveSystem.reset()
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
    this.keeperSaveSystem.reset()
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
    const keeper = this.teamSystem
      .getPlayersForSide('A')
      .find((player) => player.role === 'keeper')
    const keeperDebug = this.aiSystem.getKeeperDebugState('A')
    const defenseTarget = this.defenseSystem.getTargetDebug()

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
      controlledPlayerHandedness: controlledPlayer.handedness,
      handednessMountSign:
        controlledPlayer.getHandednessMountSign(),
      pocketFacingSign: controlledPlayer.getPocketFacingSign(),
      visualMirrorSign: controlledPlayer.getVisualMirrorSign(),
      cradleSocketSign: controlledPlayer.getCradleSocketSign(),
      chargeElapsedMs: this.stickInteractionSystem.getCradleElapsedMs(),
      chargeNormalized: this.stickInteractionSystem.getChargeNormalized(),
      hardChargeActive:
        this.stickInteractionSystem.isHardChargeActive(),
      releaseForcePreview:
        this.stickInteractionSystem.getReleaseForcePreview(),
      cradlePhase: this.stickInteractionSystem.getCradlePhase(),
      stickVisualRotation: controlledPlayer.getStickVisualRotation(),
      rawInputAimAngle: this.inputController.getRawAimAngle(),
      releaseAimAngle: controlledPlayer.getReleaseAimAngle(),
      rawInputAimDirection: {
        x: Math.cos(this.inputController.getRawAimAngle()),
        y: Math.sin(this.inputController.getRawAimAngle()),
      },
      releaseAimDirection:
        this.stickInteractionSystem.getPendingReleaseAimDirection() ??
        controlledPlayer.getReleaseAimForward(),
      visualStickDirection: controlledPlayer.getStickForward(),
      releaseImpulseDirection:
        this.stickInteractionSystem.getReleaseImpulseDirection(),
      carryPoseAngle:
        this.stickInteractionSystem.getCarryPoseAngle(
          controlledPlayer.id,
        ),
      loadbackAngle:
        this.stickInteractionSystem.getLoadbackAngle(
          controlledPlayer.id,
        ),
      carrySocket:
        this.stickInteractionSystem.getCurrentCarrySocket(),
      desiredCarrySocket:
        this.stickInteractionSystem.getDesiredCarrySocket(),
      readyStanceOffset:
        stickConfig.readyStanceOffsetRadians *
        controlledPlayer.getPocketFacingSign(),
      cradleFacingOffset:
        stickConfig.cradleFacingOffsetRadians *
        controlledPlayer.getPocketFacingSign(),
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
      defenseAction:
        this.defenseSystem.getActionLabel(controlledPlayer.id),
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
      controlledToughness: controlledPlayer.attributes.toughness,
      defenseTargetId: defenseTarget?.playerId ?? null,
      defenseTargetAction: defenseTarget?.action ?? null,
      defenseTargetToughness: defenseTarget?.toughness ?? null,
      defenseTargetBallHandling:
        defenseTarget?.ballHandling ?? null,
      truckAvailable:
        this.matchFlowSystem.isPlaying() &&
        defenseConfig.truckEnabled &&
        this.stickInteractionSystem.getCarrierId() !== controlledPlayer.id,
      slashAvailable:
        this.matchFlowSystem.isPlaying() &&
        defenseConfig.slashEnabled &&
        this.stickInteractionSystem.getCarrierId() !== controlledPlayer.id,
      inputIntent: this.currentInputIntent,
      keeperControlMode: keeperConfig.controlMode,
      keeperStyle: keeper?.playStyle ?? 'balanced',
      keeperTarget: keeperDebug?.target ?? { x: 0, y: 0 },
      keeperTargetRatio: keeperDebug?.targetRatio ?? 0,
      keeperHumanBias:
        keeperDebug?.humanBias ??
        this.keeperControlAssistSystem.getBias(),
      keeperThreatActive:
        keeperDebug?.threatActive ??
        this.playerControlSystem.isKeeperThreatActive(),
      keeperAutoSwitchThreat:
        this.playerControlSystem.isKeeperThreatActive(),
      keeperLegalState: keeper
        ? this.keeperAreaSystem.getKeeperLegalState(keeper.id)
        : 'legal',
      keeperLastViolation: keeper
        ? this.keeperAreaSystem.getKeeperLastViolation(keeper.id)
        : 'legal',
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

function normalizedDirection(
  from: Point,
  to: Point,
  fallback: Point,
): Point {
  const x = to.x - from.x
  const y = to.y - from.y
  const length = Math.hypot(x, y)

  return length === 0
    ? { ...fallback }
    : { x: x / length, y: y / length }
}

function getCssPixelValue(propertyName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim()
  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}
