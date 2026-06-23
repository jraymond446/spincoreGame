import Phaser from 'phaser'
import { aiConfig } from '../config/aiConfig'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { controlConfig } from '../config/controlConfig'
import { defenseConfig } from '../config/defenseConfig'
import { coreConfig } from '../config/entityConfig'
import {
  gameplayConfig,
  type GameMode,
} from '../config/gameplayConfig'
import { goalConfigs } from '../config/goalConfig'
import { inputConfig } from '../config/inputConfig'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
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
import { getMatchLaunchConfig } from '../../match/MatchLaunchConfig'
import {
  matchEvents,
  type MatchCompletionDetail,
} from '../../match/MatchEvents'
import {
  createEmptyMatchPlayerStats,
  type MatchPlayerStats,
} from '../../match/MatchResult'
import { getArenaTheme } from '../arena/arenaThemes'
import {
  resolveArenaPresentation,
  type ArenaMatchPresentation,
} from '../arena/ArenaPresentation'
import { createArenaLayout } from '../arena/ArenaLayout'
import { ArenaRenderer } from '../rendering/ArenaRenderer'
import { ScoreboardOverlay } from '../rendering/ScoreboardOverlay'
import { preloadVisualAssetOverrides } from '../rendering/VisualAssetOverrides'
import { GoalRule, type GoalCrossing } from '../rules/GoalRule'
import { AISystem } from '../systems/AISystem'
import { AIOwnGoalSafetySystem } from '../systems/AIOwnGoalSafetySystem'
import { AIFacingSystem } from '../systems/AIFacingSystem'
import { ArenaSystem } from '../systems/ArenaSystem'
import { CoreRecoverySystem } from '../systems/CoreRecoverySystem'
import { CreaseBattleSystem } from '../systems/CreaseBattleSystem'
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
import {
  getPlayerActionLock,
  type PlayerActionLock,
} from '../systems/PlayerActionStateSystem'
import { KeeperControlAssistSystem } from '../systems/KeeperControlAssistSystem'
import { KeeperSaveSystem } from '../systems/KeeperSaveSystem'
import { SpinGuardSystem } from '../systems/SpinGuardSystem'
import {
  StickInteractionSystem,
  type StickIntent,
} from '../systems/StickInteractionSystem'
import { TeamSystem } from '../systems/TeamSystem'
import { TacticalGuideRenderer } from '../systems/TacticalGuideRenderer'
import { WallBounceSystem } from '../systems/WallBounceSystem'
import { WallCarryPressureSystem } from '../systems/WallCarryPressureSystem'
import {
  normalizeSafe,
  sanitizeVector,
} from '../utils/vectorSafety'

export class GameScene extends Phaser.Scene {
  private core!: Core
  private goals: GoalGate[] = []
  private goalRules = new Map<string, GoalRule>()
  private arenaRenderer!: ArenaRenderer
  private arenaPresentation!: ArenaMatchPresentation
  private arenaSystem!: ArenaSystem
  private keeperAreaSystem!: KeeperAreaSystem
  private coreRecoverySystem!: CoreRecoverySystem
  private creaseBattleSystem!: CreaseBattleSystem
  private inputController!: PlayerInputController
  private teamSystem!: TeamSystem
  private playerControlSystem!: PlayerControlSystem
  private keeperControlAssistSystem!: KeeperControlAssistSystem
  private keeperSaveSystem!: KeeperSaveSystem
  private aiOwnGoalSafetySystem!: AIOwnGoalSafetySystem
  private aiSystem!: AISystem
  private aiFacingSystem!: AIFacingSystem
  private tacticalGuideRenderer!: TacticalGuideRenderer
  private stickInteractionSystem!: StickInteractionSystem
  private defenseSystem!: DefenseSystem
  private fumbleSystem!: FumbleSystem
  private wallBounceSystem!: WallBounceSystem
  private wallCarryPressureSystem!: WallCarryPressureSystem
  private spinGuardSystem!: SpinGuardSystem
  private matchFlowSystem!: MatchFlowSystem
  private matchStatsTracker!: MatchStatsTracker
  private debugHudSystem!: DebugHudSystem
  private scoreboardOverlay!: ScoreboardOverlay
  private matchState: MatchState = structuredClone(initialMatchState)
  private debugEnabled = false
  private gameMode: GameMode = gameplayConfig.defaultMode
  private currentInputIntent = 'IDLE'
  private labEventsBound = false
  private playerStats: MatchPlayerStats = createEmptyMatchPlayerStats()
  private matchCompletionEmitted = false
  private matchCompletionFallbackTimer: number | null = null

  constructor() {
    super('GameScene')
  }

  init(data?: { gameMode?: GameMode }): void {
    this.clearMatchCompletionFallback()
    this.gameMode = data?.gameMode ?? getLabState().mode
    this.matchState = structuredClone(initialMatchState)
    this.debugEnabled = false
    this.playerStats = createEmptyMatchPlayerStats()
    this.matchCompletionEmitted = false
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

    const initialLayout = createArenaLayout()
    const initialTheme = getArenaTheme(
      getLabState().arenaVisual.themeId,
      initialLayout,
    )
    this.arenaPresentation = resolveArenaPresentation(initialTheme)
    this.arenaRenderer = new ArenaRenderer(
      this,
      this.arenaPresentation,
    )
    this.arenaSystem = new ArenaSystem(
      this,
      this.arenaRenderer.layoutDefinition,
    )
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
    this.wallBounceSystem = new WallBounceSystem(this, this.core)
    this.aiOwnGoalSafetySystem = new AIOwnGoalSafetySystem(
      this,
      this.core,
    )
    this.teamSystem = new TeamSystem(this, this.gameMode)
    this.teamSystem.applyArenaVisualPresentation(
      this.arenaPresentation,
    )
    this.playerControlSystem = new PlayerControlSystem()
    this.keeperControlAssistSystem = new KeeperControlAssistSystem()
    this.keeperSaveSystem = new KeeperSaveSystem()
    this.aiSystem = new AISystem(
      this,
      this.teamSystem.getFormationBiases(),
      this.teamSystem.getStrategies(),
      this.teamSystem.getTacticalQualities(),
    )
    this.aiFacingSystem = new AIFacingSystem()
    this.tacticalGuideRenderer = new TacticalGuideRenderer(this)
    this.inputController = new PlayerInputController(this, hudRoot)
    this.stickInteractionSystem = new StickInteractionSystem(this)
    this.defenseSystem = new DefenseSystem(this)
    this.fumbleSystem = new FumbleSystem()
    this.wallCarryPressureSystem = new WallCarryPressureSystem(this)
    this.spinGuardSystem = new SpinGuardSystem()
    this.coreRecoverySystem = new CoreRecoverySystem()
    this.creaseBattleSystem = new CreaseBattleSystem(this)
    this.matchFlowSystem = new MatchFlowSystem(
      new GoalCelebrationSystem(this, hudRoot),
      {
        onResetFormation: this.preparePostGoalReset,
        onResumePlay: this.resumeAfterCountdown,
        onMatchComplete: this.emitMatchCompletion,
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
    if (this.gameMode === 'match3v3') {
      this.matchFlowSystem.startMatch(
        `${this.teamSystem.getTeam('A').name} VS ${this.teamSystem.getTeam('B').name}`,
        `FIRST TO ${this.matchState.firstTo}`,
      )
    }
    this.layoutViewport()
    this.scale.on('resize', this.layoutViewport, this)
    if (!this.labEventsBound) {
      this.labEventsBound = true
      window.addEventListener(labEvents.apply, this.applyLabChanges)
      window.addEventListener(labEvents.resetMatch, this.resetMatch)
      window.addEventListener(labEvents.resetCore, this.resetCore)
      window.addEventListener(
        labEvents.simulateGoalTop,
        this.simulateTopGoal,
      )
      window.addEventListener(
        labEvents.simulateGoalBottom,
        this.simulateBottomGoal,
      )
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutViewport, this)
      this.inputController.destroy()
      this.debugHudSystem.destroy()
      this.matchFlowSystem.destroy()
      this.scoreboardOverlay.destroy()
      this.arenaRenderer.destroy()
      this.tacticalGuideRenderer.destroy()
      this.wallBounceSystem.destroy()
      this.aiOwnGoalSafetySystem.destroy()
      this.wallCarryPressureSystem.destroy()
      this.clearMatchCompletionFallback()
    })

  }

  update(time: number, delta: number): void {
    this.arenaRenderer.update(time)

    if (this.inputController.consumeModeToggle()) {
      this.toggleGameMode()
      return
    }

    const players = this.teamSystem.players
    this.spinGuardSystem.prepareFrame(delta)
    const controlledPlayer = this.playerControlSystem.update(
      this.teamSystem.getPlayersForSide('A'),
      this.stickInteractionSystem.getCarrierId(),
      this.core.position,
      this.core.velocity,
      delta,
      this.getControlledPlayerSelection(),
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
    this.tacticalGuideRenderer.update(
      players,
      this.aiSystem.getTacticalAssignments(),
      time,
      this.debugEnabled,
      this.gameMode,
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
      this.stickInteractionSystem.getCarrierId(),
      aiIntents,
      stickIntents,
      defenseIntents,
      delta,
    )

    this.stickInteractionSystem.update(
      this.core,
      players,
      stickIntents,
      controlledPlayer.id,
      delta,
    )
    const interactionEvent =
      this.stickInteractionSystem.consumeInteractionEvent()
    const createdPlayer =
      getMatchLaunchConfig().useCreatedPlayer
        ? players.find(
            (player) =>
              player.teamSide === 'A' &&
              player.controllerType === 'human',
          )
        : null

    if (
      interactionEvent &&
      interactionEvent.playerId === createdPlayer?.id
    ) {
      if (interactionEvent.result === 'release') {
        this.playerStats.shots += 1
      } else if (interactionEvent.result === 'cradle') {
        this.playerStats.successfulGathers += 1
      } else if (interactionEvent.result === 'fumble') {
        this.playerStats.fumbles += 1
        this.playerStats.turnovers += 1
      }
    }

    if (interactionEvent?.result === 'release') {
      const releasingPlayer = players.find(
        (player) => player.id === interactionEvent.playerId,
      )
      if (releasingPlayer) {
        this.aiSystem.recordRelease(
          releasingPlayer,
          this.core.position,
        )
      }
    }

    const savedSide = this.keeperSaveSystem.update(
      this.core,
      players,
      interactionEvent,
      delta,
    )
    this.creaseBattleSystem.update(
      this.core,
      players,
      this.stickInteractionSystem.getCarrierId(),
      interactionEvent,
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
      this.aiSystem.recordKeeperSave(savedSide)
      this.aiSystem.recordSave(savedSide)

      if (
        savedSide === 'A' &&
        interactionEvent?.playerId === createdPlayer?.id
      ) {
        this.playerStats.saves += 1
      }

      statsChanged = true
    } else if (
      interactionEvent &&
      interactionEvent.result !== 'release'
    ) {
      const blockingPlayer = players.find(
        (player) => player.id === interactionEvent.playerId,
      )
      if (blockingPlayer) {
        this.aiSystem.recordShotBlock(blockingPlayer)
      }
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

    this.wallCarryPressureSystem.update(
      this.core,
      players,
      this.stickInteractionSystem,
      this.fumbleSystem,
      delta,
    )
    this.arenaSystem.containPlayers(players)
    this.keeperAreaSystem.update(players, delta)
    this.applySpinGuard(players, delta, controlledPlayer.id)

    this.wallBounceSystem.update(
      this.stickInteractionSystem.getCarrierId() !== null,
      delta,
    )
    this.aiOwnGoalSafetySystem.update(
      players,
      controlledPlayer.id,
      this.stickInteractionSystem.getCarrierId() !== null,
    )
    this.core.update()

    let goalScored = false

    for (const goal of this.goals) {
      const crossing = this.goalRules
        .get(goal.id)
        ?.check(
          this.core.position,
          goal,
          delta,
          this.core.renderedPosition,
        )

      if (crossing) {
        this.scoreGoal(goal, crossing)
        goalScored = true
        break
      }
    }

    if (!goalScored) {
      this.aiSystem.observeShotFlight(this.core.position)
    }

    const recoveryReason = goalScored
      ? null
      : this.coreRecoverySystem.update(
          this.core.position,
          this.core.velocity,
          this.stickInteractionSystem.getCarrierId() !== null,
          delta,
        )

    if (recoveryReason) {
      this.matchFlowSystem.restartForFaceoff()
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
    const actionLock = this.getActionLock(player)
    const recovering = this.spinGuardSystem.isRecovering(player.id)
    const keeperPossessionLatch =
      this.playerControlSystem.shouldLatchKeeperPossession()
    this.playerControlSystem.acknowledgeKeeperPossessionInput(
      input.primaryStickAction,
    )
    const primaryStickAction =
      input.primaryStickAction || keeperPossessionLatch
    const usesKeeperShield =
      player.role === 'keeper' &&
      keeperShieldConfig.keeperUsesShieldDefault &&
      keeperShieldConfig.keeperEquipmentType === 'shield'
    const movement =
      player.role === 'keeper'
        ? this.keeperControlAssistSystem.getManualMovement(
            player,
            input.movement,
          )
        : input.movement
    const movementLocked =
      this.defenseSystem.isMovementLocked(player.id)

    player.update(
      recovering || movementLocked
        ? new Phaser.Math.Vector2()
        : movement,
      input.aimAngle,
    )
    const stickActionAllowed =
      !recovering &&
      (actionLock === 'none' ||
        actionLock === 'gather' ||
        actionLock === 'carrier')
    const defenseActionAllowed =
      !recovering && actionLock === 'none'
    stickIntents.set(player.id, {
      hold: isCarrier
        ? primaryStickAction
        : stickActionAllowed && primaryStickAction,
      swing:
        defenseActionAllowed &&
        usesKeeperShield &&
        (input.primaryStickActionStarted ||
          input.explicitSlashAction),
      suppressEmptyReleaseSwing: !isCarrier,
      chargeIntensity: input.primaryIntensity,
    })
    defenseIntents.set(player.id, {
      truck:
        defenseActionAllowed &&
        !isCarrier &&
        input.truckAction,
      slash:
        defenseActionAllowed &&
        !isCarrier &&
        !usesKeeperShield &&
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
        : primaryStickAction
          ? 'AIM / CHARGE'
          : 'CARRYING'
      : input.truckAction
        ? 'TRUCK'
        : input.primaryStickActionStarted ||
            input.explicitSlashAction
          ? 'SLASH'
          : primaryStickAction
            ? 'CATCH READY'
            : 'IDLE'
  }

  private updateAIPlayers(
    players: Player[],
    controlledPlayerId: string,
    carrierId: string | null,
    intents: Map<string, PlayerControlIntent>,
    stickIntents: Map<string, StickIntent>,
    defenseIntents: Map<string, DefenseIntent>,
    deltaMs: number,
  ): void {
    for (const player of players) {
      if (player.id === controlledPlayerId) {
        continue
      }

      const intent = intents.get(player.id)
      const recovering = this.spinGuardSystem.isRecovering(player.id)

      if (!intent) {
        player.update(new Phaser.Math.Vector2(), player.getAimAngle())
        stickIntents.set(player.id, {
          hold: player.id === carrierId,
        })
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
        : movementToward(
            player.position,
            intent.moveTarget,
            player.id,
          )
      const speedMultiplier = Number.isFinite(
        intent.moveSpeedMultiplier,
      )
        ? Phaser.Math.Clamp(intent.moveSpeedMultiplier ?? 1, 0, 2)
        : 1
      const isCarrier = player.id === carrierId
      const actionLock = this.getActionLock(player)
      const move =
        recovering || actionLock === 'downed'
          ? new Phaser.Math.Vector2()
          : baseMove.scale(speedMultiplier)
      const stickActionAllowed =
        !recovering &&
        (actionLock === 'none' ||
          actionLock === 'gather' ||
          actionLock === 'carrier')
      const defenseActionAllowed =
        !recovering && actionLock === 'none'
      const fallbackAim = {
        x:
          player.position.x +
          Math.cos(player.getReleaseAimAngle()) * 100,
        y:
          player.position.y +
          Math.sin(player.getReleaseAimAngle()) * 100,
      }
      const safeAimTarget = sanitizeVector(
        intent.aimTarget,
        fallbackAim,
        {
          label: '[Invalid Aim Vector]',
          playerId: player.id,
          system: 'GameScene.updateAIPlayers',
        },
      )
      const safeReleaseTarget = intent.releaseTarget
        ? sanitizeVector(
            intent.releaseTarget,
            safeAimTarget,
            {
              label: '[Invalid Aim Vector]',
              playerId: player.id,
              system: 'GameScene.releaseTarget',
            },
          )
        : undefined
      const requestedAimAngle =
        intent.aimAngle ??
        Phaser.Math.Angle.Between(
          player.position.x,
          player.position.y,
          safeAimTarget.x,
          safeAimTarget.y,
        )
      const aimAngle = stabilizeAIAim(
        player,
        requestedAimAngle,
        safeAimTarget,
        actionLock,
        isCarrier,
        Boolean(
          intent.swing ||
            intent.slash ||
            intent.truck ||
            intent.releaseTarget,
        ),
        deltaMs,
      )

      player.update(
        move,
        aimAngle,
        this.aiFacingSystem.resolve(
          player,
          move,
          isCarrier,
          deltaMs,
        ),
      )
      const usesKeeperShield =
        player.role === 'keeper' &&
        keeperShieldConfig.keeperUsesShieldDefault &&
        keeperShieldConfig.keeperEquipmentType === 'shield'
      stickIntents.set(player.id, {
        hold: isCarrier
          ? true
          : stickActionAllowed && intent.hold,
        swing:
          defenseActionAllowed &&
          !isCarrier && usesKeeperShield ? intent.swing : false,
        suppressEmptyReleaseSwing: true,
        releaseTarget: safeReleaseTarget,
        aiReleaseDelayMs: intent.aiReleaseDelayMs,
      })
      defenseIntents.set(player.id, {
        truck:
          defenseActionAllowed &&
          !isCarrier &&
          (intent.truck ?? false),
        slash:
          defenseActionAllowed &&
          !isCarrier &&
          !usesKeeperShield &&
          ((intent.slash ?? false) || (intent.swing ?? false)),
        aimDirection: normalizedDirection(
          player.position,
          safeAimTarget,
          player.getReleaseAimForward(),
        ),
      })
    }
  }

  private createHud(hudRoot: HTMLDivElement): void {
    const theme = getArenaTheme(
      this.arenaPresentation.themeId,
      this.arenaRenderer.layoutDefinition,
    )
    this.scoreboardOverlay = new ScoreboardOverlay(
      hudRoot,
      this.arenaPresentation,
      theme,
    )
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
    this.arenaRenderer.layout(this.scale.width)
    this.inputController.layout()
  }

  private scoreGoal(goal: GoalGate, crossing: GoalCrossing): void {
    const scoringSide: TeamSide = goal.scoringTeam
    const newScore = this.matchState.score[scoringSide] + 1

    const attribution = this.matchStatsTracker.recordGoal(scoringSide)
    this.aiSystem.recordGoal(scoringSide)
    this.matchState.score[scoringSide] = newScore
    this.matchState.lastScorer = scoringSide

    const scorer = attribution.scorerId
      ? this.teamSystem.players.find(
          (player) => player.id === attribution.scorerId,
        )
      : null
    const assister = attribution.assistId
      ? this.teamSystem.players.find(
          (player) => player.id === attribution.assistId,
        )
      : null
    const createdPlayerScored =
      scoringSide === 'A' &&
      scorer?.controllerType === 'human' &&
      getMatchLaunchConfig().useCreatedPlayer

    if (createdPlayerScored) {
      this.playerStats.goals += 1

      if (this.wallBounceSystem.getDebugState().recentBankShot) {
        this.playerStats.bankShotGoals += 1
      }
    }

    if (
      scoringSide === 'A' &&
      assister?.controllerType === 'human' &&
      getMatchLaunchConfig().useCreatedPlayer
    ) {
      this.playerStats.assists += 1
    }

    const completesMatch = newScore >= this.matchState.firstTo

    if (completesMatch) {
      this.matchState.winner = scoringSide
    }

    goal.flash(matchFlowConfig.goalFlashDurationMs)
    this.beginGoalSequence()
    this.matchFlowSystem.scoreGoal(
      scoringSide,
      crossing.impactPoint,
      completesMatch,
    )
    if (completesMatch) {
      this.queueMatchCompletionFallback()
    }
    this.updateHud()
  }

  private emitMatchCompletion = (): void => {
    if (
      this.matchCompletionEmitted ||
      !this.matchState.winner
    ) {
      return
    }

    this.matchCompletionEmitted = true
    const detail: MatchCompletionDetail = {
      winner: this.matchState.winner,
      score: { ...this.matchState.score },
      playerGoals: this.playerStats.goals,
      playerBankShotGoals: this.playerStats.bankShotGoals,
      playerStats: { ...this.playerStats },
      stats: this.matchStatsTracker.getSnapshot(),
      teamNames: {
        A: this.teamSystem.getTeam('A').name,
        B: this.teamSystem.getTeam('B').name,
      },
    }
    window.dispatchEvent(
      new CustomEvent<MatchCompletionDetail>(
        matchEvents.completed,
        { detail },
      ),
    )
  }

  private queueMatchCompletionFallback(): void {
    this.clearMatchCompletionFallback()

    const delayMs = matchFlowConfig.enableGoalCelebration
      ? Math.min(matchFlowConfig.goalCelebrationMs + 120, 1800)
      : 0

    this.matchCompletionFallbackTimer = window.setTimeout(() => {
      this.matchCompletionFallbackTimer = null
      this.emitMatchCompletion()
    }, delayMs)
  }

  private clearMatchCompletionFallback(): void {
    if (this.matchCompletionFallbackTimer === null) {
      return
    }

    window.clearTimeout(this.matchCompletionFallbackTimer)
    this.matchCompletionFallbackTimer = null
  }

  private resetPositions = (clearGoalCooldown = true): void => {
    this.clearMatchCompletionFallback()
    this.matchFlowSystem.reset()
    this.resetEntities(clearGoalCooldown)
  }

  private resetEntities(clearGoalCooldown = true): void {
    this.inputController.reset()
    this.keeperControlAssistSystem.reset()
    this.keeperSaveSystem.reset()
    this.aiSystem.reset()
    this.aiFacingSystem.reset()
    this.spinGuardSystem.reset()
    this.tacticalGuideRenderer.clear()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.wallBounceSystem.reset()
    this.aiOwnGoalSafetySystem.reset()
    this.wallCarryPressureSystem.reset()
    this.coreRecoverySystem.reset()
    this.creaseBattleSystem.reset()
    this.matchStatsTracker.clearPossession()
    this.teamSystem.resetFormation()
    this.playerControlSystem.reset(
      this.teamSystem.getPlayersForSide('A'),
    )
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

  private applyLabChanges = (event: Event): void => {
    const requiresSceneRestart =
      event instanceof CustomEvent &&
      event.detail?.requiresSceneRestart === true

    if (!requiresSceneRestart) {
      this.applyArenaVisualChanges()
      return
    }

    this.restartForLabState()
  }

  private applyArenaVisualChanges(): void {
    const theme = getArenaTheme(
      getLabState().arenaVisual.themeId,
      this.arenaRenderer.layoutDefinition,
    )
    this.arenaPresentation = resolveArenaPresentation(theme)
    this.arenaRenderer.applyPresentation(this.arenaPresentation)
    this.teamSystem.applyArenaVisualPresentation(this.arenaPresentation)
    this.scoreboardOverlay.setPresentation(
      this.arenaPresentation,
      theme,
    )
  }

  private resetMatch = (): void => {
    if (getLabState().mode !== this.gameMode) {
      this.restartForLabState()
      return
    }

    this.matchState = structuredClone(initialMatchState)
    this.matchStatsTracker.reset()
    this.aiSystem.resetMetrics()
    this.matchCompletionEmitted = false
    this.clearMatchCompletionFallback()
    this.resetPositions()
    this.updateHud()
  }

  private restartForLabState(): void {
    this.clearMatchCompletionFallback()
    const gameMode = getLabState().mode

    console.info('[Lab Apply] Structural match rebuild queued', {
      fromMode: this.gameMode,
      toMode: gameMode,
    })
    this.scene.restart({ gameMode })
  }

  private resetCore = (): void => {
    this.clearMatchCompletionFallback()
    this.matchFlowSystem.reset()
    this.inputController.reset()
    this.keeperControlAssistSystem.reset()
    this.keeperSaveSystem.reset()
    this.aiSystem.reset()
    this.aiFacingSystem.reset()
    this.spinGuardSystem.reset()
    this.tacticalGuideRenderer.clear()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.wallBounceSystem.reset()
    this.aiOwnGoalSafetySystem.reset()
    this.wallCarryPressureSystem.reset()
    this.coreRecoverySystem.reset()
    this.creaseBattleSystem.reset()
    this.matchStatsTracker.clearPossession()
    this.playerControlSystem.reset(
      this.teamSystem.getPlayersForSide('A'),
    )
    this.core.reset()

    for (const rule of this.goalRules.values()) {
      rule.reset(coreConfig.spawn)
    }
  }

  private simulateTopGoal = (): void => {
    this.simulateGoalCrossing('top-goal')
  }

  private simulateBottomGoal = (): void => {
    this.simulateGoalCrossing('bottom-goal')
  }

  private simulateGoalCrossing(goalId: string): void {
    const goal = this.goals.find((candidate) => candidate.id === goalId)

    if (!goal) {
      console.warn('[Goal Simulation] Goal not available.', { goalId })
      return
    }

    if (
      this.matchState.winner ||
      this.matchState.score[goal.scoringTeam] >=
        this.matchState.firstTo
    ) {
      this.matchState = structuredClone(initialMatchState)
      this.matchStatsTracker.reset()
      this.matchCompletionEmitted = false
    }

    this.matchFlowSystem.reset()
    const direction = goalId === 'top-goal' ? -1 : 1
    const start = {
      x: (goal.scoringPlaneStart.x + goal.scoringPlaneEnd.x) * 0.5,
      y: goal.scoringPlaneStart.y - direction * 18,
    }
    const end = {
      x: start.x,
      y: goal.scoringPlaneStart.y + direction * 18,
    }

    this.core.setPosition(start)
    this.core.setVelocity({ x: 0, y: 0 })
    for (const rule of this.goalRules.values()) {
      rule.reset(start, true)
    }

    const crossing = this.goalRules
      .get(goal.id)
      ?.check(end, goal, 16, end)

    this.core.setPosition(end)
    if (!crossing) {
      console.error('[Goal Simulation] Expected crossing was rejected.', {
        goalId,
        start,
        end,
      })
      return
    }

    this.scoreGoal(goal, crossing)
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
    this.creaseBattleSystem.setDebugEnabled(enabled)
  }

  private beginGoalSequence(): void {
    this.inputController.reset()
    this.tacticalGuideRenderer.clear()
    this.stickInteractionSystem.clearForReset(this.core)
    this.defenseSystem.clear()
    this.fumbleSystem.clear()
    this.wallBounceSystem.reset()
    this.aiOwnGoalSafetySystem.reset()
    this.wallCarryPressureSystem.reset()
    this.coreRecoverySystem.reset()
    this.creaseBattleSystem.reset()
    this.spinGuardSystem.reset()
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
      player.stopMovement()
    }

    this.core.setVelocity({ x: 0, y: 0 })
  }

  private getActionLock(player: Player): PlayerActionLock {
    return getPlayerActionLock(
      player.id,
      this.stickInteractionSystem.getCarrierId(),
      this.stickInteractionSystem.getState(),
      this.stickInteractionSystem.getStickState(player.id),
      this.defenseSystem.getState(player.id),
    )
  }

  private getControlledPlayerSelection():
    | 'auto'
    | 'keeper'
    | 'striker'
    | 'flex' {
    const launch = getMatchLaunchConfig()
    const role = launch.saveGameSnapshot?.player.primaryRole

    if (
      launch.mode === 'lab' ||
      !launch.useCreatedPlayer ||
      !role
    ) {
      return getLabState().controlledPlayer
    }

    if (role === 'keeper' || role === 'striker') {
      return role
    }

    return 'flex'
  }

  private applySpinGuard(
    players: Player[],
    deltaMs: number,
    controlledPlayerId: string,
  ): void {
    const carrierId = this.stickInteractionSystem.getCarrierId()
    const triggers = this.spinGuardSystem.update(
      players,
      deltaMs,
      (player) => {
        const decision = this.aiSystem.getDecisionDebug(player.id)
        return {
          hasCore: player.id === carrierId,
          isControlled: player.id === controlledPlayerId,
          currentAction: this.getActionLock(player),
          tacticalJob:
            this.aiSystem.getTacticalAssignment(player.id)?.job ?? null,
          carrierIntent:
            decision?.carrierIntent?.intentType ?? null,
        }
      },
    )

    for (const trigger of triggers) {
      this.aiFacingSystem.clearPlayer(trigger.playerId)
      this.defenseSystem.cancelAction(trigger.playerId)
      this.stickInteractionSystem.cancelPlayerAction(
        trigger.playerId,
      )

      if (trigger.hasCore) {
        const player = players.find(
          (candidate) => candidate.id === trigger.playerId,
        )
        if (player?.controllerType === 'ai') {
          this.aiSystem.forceCarrierRelease(
            trigger.playerId,
            `spinGuard:${trigger.reason}`,
          )
        }
        continue
      }
    }
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
    const ownershipDebug = this.playerControlSystem.getDebugState()
    const stickKeeperClear =
      this.stickInteractionSystem.getKeeperClearSafetyResult('A')

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
      gather: this.stickInteractionSystem.getGatherDebugState(
        controlledPlayer.id,
      ),
      cradleFailure: this.stickInteractionSystem.getCradleFailureReason(
        controlledPlayer.id,
      ),
      lastInteraction: this.stickInteractionSystem.getLastInteraction(),
      recoveryStatus: this.coreRecoverySystem.getDebugStatus(),
      formations: this.teamSystem.getFormationIds(),
      strategies: {
        A: this.aiSystem.getTeamStrategy('A'),
        B: this.aiSystem.getTeamStrategy('B'),
      },
      tacticalPhases: {
        A: this.aiSystem.getTeamPhase('A'),
        B: this.aiSystem.getTeamPhase('B'),
      },
      controlledTacticalJob:
        this.aiSystem.getTacticalAssignment(controlledPlayer.id)?.job ??
        null,
      aiDecision:
        this.aiSystem.getDecisionDebug(controlledPlayer.id),
      aiOffenseMetrics: this.aiSystem.getOffenseMetrics(),
      cleanupPlayers: {
        A: this.aiSystem.getCleanupPlayerIds('A'),
        B: this.aiSystem.getCleanupPlayerIds('B'),
      },
      creaseBattle: this.creaseBattleSystem.getDebugState(),
      defenseState: this.defenseSystem.getState(controlledPlayer.id),
      defenseAction:
        this.defenseSystem.getActionLabel(controlledPlayer.id),
      defenseCooldowns:
        this.defenseSystem.getCooldowns(controlledPlayer.id),
      fumblePressure: this.fumbleSystem.getPressure(),
      fumblePressureNormalized:
        this.fumbleSystem.getNormalizedPressure(),
      slashCharge: this.defenseSystem.getSlashChargeDebug(),
      wallBounce: this.wallBounceSystem.getDebugState(),
      wallCarry: this.wallCarryPressureSystem.getDebugState(),
      clearSafety:
        this.defenseSystem.getClearSafetyDebug() ??
        this.stickInteractionSystem.getKeeperClearSafetyResult(
          controlledPlayer.teamSide,
        ),
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
      keeperControlMode: controlConfig.keeperControlMode,
      keeperStyle: keeper?.playStyle ?? 'balanced',
      keeperTarget: keeperDebug?.target ?? { x: 0, y: 0 },
      keeperTargetRatio: keeperDebug?.targetRatio ?? 0,
      keeperHumanBias:
        keeperDebug?.humanBias ??
        this.keeperControlAssistSystem.getBias(),
      keeperThreatActive:
        keeperDebug?.threatActive ??
        ownershipDebug.keeperThreatActive,
      keeperAutoSwitchThreat:
        controlConfig.keeperAutoSwitchOnThreat,
      switchReason: ownershipDebug.switchReason,
      lastAutoSwitchReason:
        ownershipDebug.lastAutoSwitchReason,
      controlLockRemainingMs:
        ownershipDebug.controlLockRemainingMs,
      switchCooldownRemainingMs:
        ownershipDebug.switchCooldownRemainingMs,
      keeperHasPossession:
        ownershipDebug.keeperHasPossession,
      keeperInputLatched:
        ownershipDebug.keeperInputLatched,
      keeperClearDirection:
        stickKeeperClear?.direction ??
        keeperDebug?.clearDirection ??
        { x: 0, y: -1 },
      ownGoalPreventionCorrected:
        stickKeeperClear?.corrected ??
        keeperDebug?.ownGoalPreventionCorrected ??
        false,
      keeperLegalState: keeper
        ? this.keeperAreaSystem.getKeeperLegalState(keeper.id)
        : 'legal',
      keeperLastViolation: keeper
        ? this.keeperAreaSystem.getKeeperLastViolation(keeper.id)
        : 'legal',
      controlledZoneAccess:
        this.keeperAreaSystem.getZoneAccessState(controlledPlayer.id),
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

function movementToward(
  position: Point,
  target: Point,
  playerId: string,
): Phaser.Math.Vector2 {
  const safeTarget = sanitizeVector(
    target,
    position,
    {
      label: '[Invalid Tactical Target]',
      playerId,
      system: 'GameScene.movementToward',
    },
  )
  const vector = new Phaser.Math.Vector2(
    safeTarget.x - position.x,
    safeTarget.y - position.y,
  )

  if (vector.lengthSq() < 24 * 24) {
    return vector.set(0, 0)
  }

  const direction = normalizeSafe(vector, { x: 0, y: 0 })
  return vector.set(direction.x, direction.y)
}

function normalizedDirection(
  from: Point,
  to: Point,
  fallback: Point,
): Point {
  return normalizeSafe(
    {
      x: to.x - from.x,
      y: to.y - from.y,
    },
    fallback,
  )
}

function stabilizeAIAim(
  player: Player,
  requestedAngle: number,
  target: Point,
  actionLock: PlayerActionLock,
  isCarrier: boolean,
  actionRequested: boolean,
  deltaMs: number,
): number {
  const currentAngle = player.getReleaseAimAngle()

  const targetDistance = Math.hypot(
    target.x - player.position.x,
    target.y - player.position.y,
  )
  if (
    !isCarrier &&
    actionLock !== 'juke' &&
    actionLock !== 'slash' &&
    targetDistance < aiConfig.offBallAimMinimumDistance
  ) {
    return currentAngle
  }

  if (
    isCarrier ||
    actionRequested ||
    actionLock === 'juke' ||
    actionLock === 'slash'
  ) {
    return requestedAngle
  }

  const maximumTurn =
    aiConfig.offBallAimMaxTurnRate *
    Math.max(0, deltaMs / 1000)
  const turn = Phaser.Math.Clamp(
    Phaser.Math.Angle.Wrap(requestedAngle - currentAngle),
    -maximumTurn,
    maximumTurn,
  )
  return Phaser.Math.Angle.Wrap(currentAngle + turn)
}

function getCssPixelValue(propertyName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim()
  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}
