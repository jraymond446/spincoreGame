import Phaser from 'phaser'
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
  private readonly clearSafety = new KeeperClearSafetySystem()
  private debugEnabled = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(19)
  }

  decide(
    context: AIDecisionContext,
    humanBias: Point,
  ): PlayerControlIntent {
    const { player, core, attackGoal, ownGoal } = context
    const threat = predictThreat(context)
    const target = this.getTarget(context, threat, humanBias)
    const rawClearDirection = getKeeperClearDirection(
      core.position,
      ownGoal,
      player.teamSide,
    )
    const clearResult = this.clearSafety.sanitize(
      rawClearDirection,
      player.teamSide,
      core.position,
    )
    const clearTarget = {
      x: player.position.x + clearResult.direction.x * 360,
      y: player.position.y + clearResult.direction.y * 360,
    }
    const moveVector = this.getOrbitMovement(player.position, target, player.teamSide)
    const farFromGoal =
      distance(core.position, ownGoal) >
      keeperAreaConfig.keeperZoneRadius * 3.6
    const reactionSpeed =
      player.attributes.reaction *
      keeperConfig.keeperReactionMultiplier
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
      ),
      0.25,
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
          Math.max(0.25, keeperConfig.keeperClearAggression),
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
        this.scene.time.now + stickConfig.aiSwingCooldownMs,
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

function predictThreat(context: AIDecisionContext): KeeperThreat {
  const { core, ownGoal, player } = context
  const velocity = core.velocity
  const frames =
    keeperConfig.keeperThreatLookaheadMs / (1000 / 60)
  const predicted = {
    x: core.position.x + velocity.x * frames,
    y: core.position.y + velocity.y * frames,
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
      ? core.position.x + velocity.x * travelFrames
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
  const length = Math.hypot(vector.x, vector.y)

  return length === 0
    ? fallback
    : { x: vector.x / length, y: vector.y / length }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
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
