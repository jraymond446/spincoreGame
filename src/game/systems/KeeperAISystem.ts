import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getAiDecisionSpeed,
} from '../ai/AIAssist'
import type { AIDecisionContext } from '../ai/AIDecisionContext'
import { aiConfig } from '../config/aiConfig'
import { controlConfig } from '../config/controlConfig'
import { goalConfigs } from '../config/goalConfig'
import {
  getKeeperTargetRatio,
  keeperConfig,
} from '../config/keeperConfig'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'
import type {
  KeeperControlMode,
  PlayerControlIntent,
  PlayerPlayStyle,
  TeamSide,
} from '../data/matchTypes'
import {
  clampPointToKeeperDonut,
  getKeeperHomeDirection,
  getKeeperLegalRadii,
  getKeeperStyleRadius,
} from '../rules/KeeperGeometry'
import { normalizeSafe } from '../utils/vectorSafety'
import { KeeperClearSafetySystem } from './KeeperClearSafetySystem'

export type KeeperAIDebugState = {
  target: Point
  threatStart: Point
  threatEnd: Point
  humanBias: Point
  style: PlayerPlayStyle
  targetRatio: number
  controlMode: KeeperControlMode
  threatActive: boolean
  clearDirection: Point
  ownGoalPreventionCorrected: boolean
}

export class KeeperAISystem {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels = new Map<TeamSide, Phaser.GameObjects.Text>()
  private readonly debugStates = new Map<TeamSide, KeeperAIDebugState>()
  private readonly nextSwingAt = new Map<string, number>()
  private readonly motionRuntimes = new Map<string, KeeperMotionRuntime>()
  private readonly postSaveRecoveryUntil: Record<TeamSide, number> = {
    A: 0,
    B: 0,
  }
  private readonly clearSafety = new KeeperClearSafetySystem()
  private debugEnabled = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(19)
  }

  decide(
    context: AIDecisionContext,
    humanBias: Point,
    deltaMs: number,
  ): PlayerControlIntent {
    const { player, core, attackGoal, ownGoal } = context
    const threat = predictThreat(context)
    const requestedTarget = this.getTarget(context, threat, humanBias)
    const target = this.getReactionDelayedTarget(
      player.id,
      requestedTarget,
      deltaMs,
    )
    const rawClearDirection = getKeeperClearDirection(
      core.position,
      ownGoal,
      player.teamSide,
    )
    const clearResult = this.clearSafety.sanitize(
      rawClearDirection,
      player.teamSide,
      core.position,
      {
        awayBias:
          0.55 + getAiClearSafetyBonus(player, context),
      },
    )
    const clearTarget = {
      x: player.position.x + clearResult.direction.x * 360,
      y: player.position.y + clearResult.direction.y * 360,
    }
    const desiredMovement = this.getOrbitMovement(
      player.position,
      target,
      player.teamSide,
    )
    const moveVector = this.tuneMovement(
      player.id,
      desiredMovement,
      player.teamSide,
      deltaMs,
    )
    const farFromGoal =
      distance(core.position, ownGoal) >
      keeperAreaConfig.keeperZoneRadius * 3.6
    const reactionSpeed =
      player.attributes.reaction *
      keeperConfig.keeperReactionMultiplier *
      getAiDecisionSpeed(player, context)
    const speedLimit =
      keeperConfig.keeperMaxLateralSpeed /
      Math.max(
        0.1,
        playerRuntimeConfig.baseMaxSpeed * player.attributes.speed,
      )
    const moveSpeedMultiplier = Phaser.Math.Clamp(
      Math.min(
        speedLimit,
        farFromGoal
          ? keeperConfig.keeperReturnHomeSpeed
          : reactionSpeed,
      ) *
        keeperConfig.keeperMoveSpeedMultiplier *
        (this.scene.time.now <
        this.postSaveRecoveryUntil[player.teamSide]
          ? 0.45
          : 1),
      0.12,
      1.35,
    )

    this.recordDebug(
      context,
      target,
      threat,
      humanBias,
      clearResult.direction,
      clearResult.corrected,
    )

    if (context.isCarrier) {
      const releaseTarget = keeperConfig.keeperClearUsesThreatVector
        ? clearTarget
        : attackGoal

      return {
        moveTarget: target,
        moveVector,
        moveSpeedMultiplier,
        aimTarget: releaseTarget,
        hold: true,
        releaseTarget,
        aiReleaseDelayMs:
          aiConfig.aiReleaseDelayMs /
          Math.max(
            0.25,
            keeperConfig.keeperClearAggression *
              getAiDecisionSpeed(player, context),
          ),
        aiState: 'CLEAR',
      }
    }

    const coreDistance = context.distanceToCore
    const usesShield =
      keeperShieldConfig.keeperUsesShieldDefault &&
      keeperShieldConfig.keeperEquipmentType === 'shield'
    const catchRadius =
      aiConfig.aiCradleRadius *
      Phaser.Math.Linear(0.82, 1.08, player.attributes.control)
    const looseCore = context.carrier === null
    const coreInKeeperArea =
      distance(core.position, ownGoal) <=
      keeperAreaConfig.keeperZoneRadius + stickConfig.aiSwingRange
    const hold =
      (!usesShield || keeperShieldConfig.keeperShieldCanTrap) &&
      looseCore &&
      coreInKeeperArea &&
      coreDistance <= catchRadius
    const swingRange =
      stickConfig.aiSwingRange *
      Phaser.Math.Linear(0.82, 1.08, player.attributes.reaction)
    const shouldDeflect =
      threat.active &&
      coreDistance <=
        swingRange * keeperConfig.keeperDeflectAggression
    const shouldClearLooseCore =
      looseCore &&
      coreInKeeperArea &&
      !hold &&
      coreDistance <=
        swingRange * keeperConfig.keeperClearAggression
    const wantsSwing = shouldDeflect || shouldClearLooseCore
    const swing =
      wantsSwing &&
      this.scene.time.now >=
        (this.nextSwingAt.get(player.id) ?? 0)

    if (swing) {
      this.nextSwingAt.set(
        player.id,
        this.scene.time.now +
          stickConfig.aiSwingCooldownMs /
            getAiDecisionSpeed(player, context),
      )
    }

    return {
      moveTarget: target,
      moveVector,
      moveSpeedMultiplier,
      aimTarget:
        !usesShield &&
        wantsSwing &&
        keeperConfig.keeperClearUsesThreatVector
          ? clearTarget
          : core.position,
      hold,
      swing,
      aiState:
        shouldClearLooseCore || hold
          ? 'CLEAR'
          : threat.active
            ? 'DEFEND_GOAL'
            : 'DEFEND_GOAL',
    }
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.graphics.setVisible(enabled)

    for (const label of this.labels.values()) {
      label.setVisible(enabled)
    }

    if (!enabled) {
      this.graphics.clear()
    }
  }

  drawDebug(): void {
    if (!this.debugEnabled) {
      return
    }

    this.graphics.clear()

    for (const [side, state] of this.debugStates) {
      const center = keeperAreaConfig.areas[side]

      this.graphics.lineStyle(3, keeperConfig.debug.targetColor, 0.9)
      this.graphics.lineBetween(
        center.x,
        center.y,
        state.target.x,
        state.target.y,
      )
      this.graphics.strokeCircle(state.target.x, state.target.y, 10)
      this.graphics.lineStyle(
        3,
        keeperConfig.debug.threatColor,
        state.threatActive ? 0.9 : 0.34,
      )
      this.graphics.lineBetween(
        state.threatStart.x,
        state.threatStart.y,
        state.threatEnd.x,
        state.threatEnd.y,
      )
      this.graphics.lineStyle(3, keeperConfig.debug.biasColor, 0.9)
      this.graphics.lineBetween(
        state.target.x,
        state.target.y,
        state.target.x + state.humanBias.x * 4,
        state.target.y + state.humanBias.y * 4,
      )

      const label = this.getLabel(side)
      label
        .setPosition(state.target.x + 14, state.target.y - 14)
        .setText(
          `${side} ${state.style.toUpperCase()} ${state.targetRatio.toFixed(2)}\n` +
            `${state.controlMode}${state.threatActive ? ' / THREAT' : ''}\n` +
            `CLEAR ${state.clearDirection.x.toFixed(2)},${state.clearDirection.y.toFixed(2)}` +
            `${state.ownGoalPreventionCorrected ? ' / SAFE' : ''}`,
        )
        .setVisible(true)
    }
  }

  getDebugState(side: TeamSide): KeeperAIDebugState | null {
    const state = this.debugStates.get(side)

    return state
      ? {
          ...state,
          target: { ...state.target },
          threatStart: { ...state.threatStart },
          threatEnd: { ...state.threatEnd },
          humanBias: { ...state.humanBias },
          clearDirection: { ...state.clearDirection },
        }
      : null
  }

  recordSave(side: TeamSide): void {
    this.postSaveRecoveryUntil[side] =
      this.scene.time.now + keeperConfig.keeperPostSaveRecoveryMs
  }

  reset(): void {
    this.motionRuntimes.clear()
    this.nextSwingAt.clear()
    this.postSaveRecoveryUntil.A = 0
    this.postSaveRecoveryUntil.B = 0
  }

  private getTarget(
    context: AIDecisionContext,
    threat: KeeperThreat,
    humanBias: Point,
  ): Point {
    const { player, core, ownGoal } = context
    const homeDirection = getKeeperHomeDirection(player.teamSide)
    const farFromGoal =
      distance(core.position, ownGoal) >
      keeperAreaConfig.keeperZoneRadius * 3.6
    const focus = farFromGoal ? add(ownGoal, homeDirection) : threat.focus
    const focusDirection = normalized(
      subtract(focus, ownGoal),
      homeDirection,
    )
    const radius = getKeeperStyleRadius(player.playStyle)
    const rawTarget = {
      x: ownGoal.x + focusDirection.x * radius + humanBias.x,
      y: ownGoal.y + focusDirection.y * radius + humanBias.y,
    }

    return clampPointToKeeperDonut(
      rawTarget,
      player.teamSide,
      homeDirection,
    )
  }

  private getOrbitMovement(
    position: Point,
    target: Point,
    side: TeamSide,
  ): Point {
    const center = keeperAreaConfig.areas[side]
    const fallback = getKeeperHomeDirection(side)
    const currentOffset = subtract(position, center)
    const targetOffset = subtract(target, center)
    const currentRadius = Math.hypot(currentOffset.x, currentOffset.y)
    const targetRadius = Math.hypot(targetOffset.x, targetOffset.y)
    const radial = normalized(currentOffset, fallback)
    const tangent = { x: -radial.y, y: radial.x }
    const currentAngle = Math.atan2(radial.y, radial.x)
    const targetAngle = Math.atan2(targetOffset.y, targetOffset.x)
    const angleDelta = Phaser.Math.Angle.Wrap(targetAngle - currentAngle)
    const legal = getKeeperLegalRadii()
    let radialCommand = Phaser.Math.Clamp(
      (targetRadius - currentRadius) / 18,
      -1,
      1,
    )

    if (
      (currentRadius <= legal.inner + 2 && radialCommand < 0) ||
      (currentRadius >= legal.outer - 2 && radialCommand > 0)
    ) {
      radialCommand = 0
    }

    const tangentCommand = Phaser.Math.Clamp(
      angleDelta * keeperConfig.keeperOrbitSmoothing,
      -1,
      1,
    )
    const movement = {
      x: radial.x * radialCommand + tangent.x * tangentCommand,
      y: radial.y * radialCommand + tangent.y * tangentCommand,
    }
    const length = Math.hypot(movement.x, movement.y)

    if (distance(position, target) < 7 || length === 0) {
      return { x: 0, y: 0 }
    }

    return {
      x: movement.x / length,
      y: movement.y / length,
    }
  }

  private getReactionDelayedTarget(
    playerId: string,
    requestedTarget: Point,
    deltaMs: number,
  ): Point {
    const runtime = this.getMotionRuntime(playerId, requestedTarget)
    runtime.targetRefreshMs = Math.max(
      0,
      runtime.targetRefreshMs - deltaMs,
    )

    if (runtime.targetRefreshMs === 0) {
      runtime.target = { ...requestedTarget }
      runtime.targetRefreshMs = keeperConfig.keeperReactionDelayMs
    }

    return { ...runtime.target }
  }

  private tuneMovement(
    playerId: string,
    desired: Point,
    side: TeamSide,
    deltaMs: number,
  ): Point {
    const runtime = this.getMotionRuntime(playerId, desired)
    const desiredLength = Math.hypot(desired.x, desired.y)
    const previousLength = Math.hypot(
      runtime.movement.x,
      runtime.movement.y,
    )
    const reversing =
      desiredLength > 0.1 &&
      previousLength > 0.1 &&
      dot(
        normalized(desired, { x: 0, y: 0 }),
        normalized(runtime.movement, { x: 0, y: 0 }),
      ) < -0.35

    runtime.repositionDelayMs = Math.max(
      0,
      runtime.repositionDelayMs - deltaMs,
    )

    if (reversing && runtime.repositionDelayMs === 0) {
      runtime.repositionDelayMs =
        keeperConfig.keeperRepositionDelayMs
    }

    if (runtime.repositionDelayMs > 0) {
      runtime.movement = {
        x: runtime.movement.x * 0.72,
        y: runtime.movement.y * 0.72,
      }
      return { ...runtime.movement }
    }

    const deltaSeconds = Math.max(0, deltaMs / 1000)
    const accelerationBlend =
      1 -
      Math.exp(
        -8 *
          keeperConfig.keeperAccelerationMultiplier *
          deltaSeconds,
      )
    let turnedDesired = desired

    if (desiredLength > 0.1 && previousLength > 0.1) {
      const previousAngle = Math.atan2(
        runtime.movement.y,
        runtime.movement.x,
      )
      const desiredAngle = Math.atan2(desired.y, desired.x)
      const maximumTurn =
        Math.PI *
        2.4 *
        keeperConfig.keeperTurnRateMultiplier *
        deltaSeconds
      const angle =
        previousAngle +
        Phaser.Math.Clamp(
          Phaser.Math.Angle.Wrap(desiredAngle - previousAngle),
          -maximumTurn,
          maximumTurn,
        )
      turnedDesired = {
        x: Math.cos(angle) * desiredLength,
        y: Math.sin(angle) * desiredLength,
      }
    }

    const next = {
      x: Phaser.Math.Linear(
        runtime.movement.x,
        turnedDesired.x,
        accelerationBlend,
      ),
      y: Phaser.Math.Linear(
        runtime.movement.y,
        turnedDesired.y,
        accelerationBlend,
      ),
    }
    const fieldward = getKeeperHomeDirection(side)
    const normalizedNext = normalized(next, { x: 0, y: 0 })
    const frontBackAmount = Math.abs(dot(normalizedNext, fieldward))
    const frontBackMultiplier = Phaser.Math.Linear(
      1,
      keeperConfig.keeperFrontBackRecoveryMultiplier,
      frontBackAmount,
    )

    runtime.movement = {
      x: next.x * frontBackMultiplier,
      y: next.y * frontBackMultiplier,
    }
    return { ...runtime.movement }
  }

  private getMotionRuntime(
    playerId: string,
    target: Point,
  ): KeeperMotionRuntime {
    const existing = this.motionRuntimes.get(playerId)

    if (existing) {
      return existing
    }

    const runtime: KeeperMotionRuntime = {
      movement: { x: 0, y: 0 },
      target: { ...target },
      targetRefreshMs: keeperConfig.keeperReactionDelayMs,
      repositionDelayMs: 0,
    }
    this.motionRuntimes.set(playerId, runtime)
    return runtime
  }

  private recordDebug(
    context: AIDecisionContext,
    target: Point,
    threat: KeeperThreat,
    humanBias: Point,
    clearDirection: Point,
    ownGoalPreventionCorrected: boolean,
  ): void {
    this.debugStates.set(context.player.teamSide, {
      target: { ...target },
      threatStart: { ...context.core.position },
      threatEnd: { ...context.ownGoal },
      humanBias: { ...humanBias },
      style: context.style.effectiveStyle,
      targetRatio: getKeeperTargetRatio(context.style.effectiveStyle),
      controlMode: controlConfig.keeperControlMode,
      threatActive: threat.active,
      clearDirection: { ...clearDirection },
      ownGoalPreventionCorrected,
    })
  }

  private getLabel(side: TeamSide): Phaser.GameObjects.Text {
    const existing = this.labels.get(side)

    if (existing) {
      return existing
    }

    const label = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: '700',
        color: keeperConfig.debug.textColor,
        backgroundColor: '#16324fcc',
        padding: { x: 5, y: 3 },
      })
      .setDepth(20)
      .setVisible(this.debugEnabled)

    this.labels.set(side, label)
    return label
  }
}

type KeeperThreat = {
  active: boolean
  focus: Point
}

type KeeperMotionRuntime = {
  movement: Point
  target: Point
  targetRefreshMs: number
  repositionDelayMs: number
}

function predictThreat(context: AIDecisionContext): KeeperThreat {
  const { core, ownGoal, player } = context
  const velocity = core.velocity
  const frames =
    keeperConfig.keeperThreatLookaheadMs / (1000 / 60)
  const predicted = {
    x:
      core.position.x +
      velocity.x * frames * keeperConfig.keeperPredictionStrength,
    y:
      core.position.y +
      velocity.y * frames * keeperConfig.keeperPredictionStrength,
  }
  const goal = goalConfigs.find((candidate) =>
    player.teamSide === 'A'
      ? candidate.id === 'bottom-goal'
      : candidate.id === 'top-goal',
  )
  const movingToward =
    player.teamSide === 'A' ? velocity.y > 0.2 : velocity.y < -0.2
  const travelFrames =
    Math.abs(velocity.y) < 0.01
      ? Infinity
      : (ownGoal.y - core.position.y) / velocity.y
  const crossingX =
    Number.isFinite(travelFrames) && travelFrames >= 0
      ? Phaser.Math.Linear(
          core.position.x,
          core.position.x + velocity.x * travelFrames,
          keeperConfig.keeperPredictionStrength,
        )
      : predicted.x
  const insidePosts = goal
    ? Math.abs(crossingX - goal.x) <= goal.length / 2
    : false
  const active =
    movingToward &&
    travelFrames >= 0 &&
    travelFrames <= Math.max(72, frames * 2) &&
    insidePosts
  const focus = active
    ? {
        x: crossingX,
        y:
          Phaser.Math.Linear(
            core.position.y,
            ownGoal.y,
            0.66,
          ),
      }
    : predicted

  return { active, focus }
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function normalized(vector: Point, fallback: Point): Point {
  return normalizeSafe(vector, fallback)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

function getKeeperClearDirection(
  corePosition: Point,
  ownGoal: Point,
  side: TeamSide,
): Point {
  const fieldward = getKeeperHomeDirection(side)
  const fromGoal = normalized(
    subtract(corePosition, ownGoal),
    fieldward,
  )
  const pointsIntoField =
    fromGoal.x * fieldward.x + fromGoal.y * fieldward.y > 0.05
  const clearDirection = pointsIntoField
    ? normalized(
        {
          x: fromGoal.x + fieldward.x * 0.35,
          y: fromGoal.y + fieldward.y * 0.35,
        },
        fieldward,
      )
    : fieldward

  return clearDirection
}
