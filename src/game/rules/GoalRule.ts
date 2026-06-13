import type { GoalGate } from '../entities/GoalGate'
import type { Point } from '../data/geometry'
import { goalConfig } from '../config/goalConfig'
import {
  evaluateGoalCrossing,
  type GoalCrossingRejectedReason,
} from './GoalCrossing'

export type GoalCrossing = {
  directionSign: -1 | 1
  impactPoint: Point
  previousPosition: Point
  currentPosition: Point
  renderedPosition: Point
  goalPlane: number
  crossingX: number
  scoringTolerance: number
  goalReason: 'swept-plane-crossing' | 'discrete-plane-crossing'
}

export class GoalRule {
  private previousPosition: Point
  private scoringCooldownMsRemaining = 0

  constructor(startPosition: Point) {
    this.previousPosition = { ...startPosition }
  }

  check(
    currentPosition: Point,
    gate: GoalGate,
    deltaMs: number,
    renderedPosition: Point = currentPosition,
  ): GoalCrossing | null {
    this.scoringCooldownMsRemaining = Math.max(
      0,
      this.scoringCooldownMsRemaining - deltaMs,
    )
    const previousPosition = { ...this.previousPosition }
    this.previousPosition = { ...currentPosition }
    const goalPlane = gate.scoringPlaneStart.y
    const nearGoalPlane =
      Math.min(
        Math.abs(previousPosition.y - goalPlane),
        Math.abs(currentPosition.y - goalPlane),
      ) <= 30

    if (this.scoringCooldownMsRemaining > 0) {
      if (nearGoalPlane) {
        this.logDetection(
          gate,
          previousPosition,
          currentPosition,
          renderedPosition,
          false,
          null,
          false,
          'goalCooldown',
        )
      }
      return null
    }

    const evaluation = evaluateGoalCrossing({
      previousPosition,
      currentPosition,
      planeY: goalPlane,
      minX: gate.scoringPlaneStart.x,
      maxX: gate.scoringPlaneEnd.x,
      tolerance: goalConfig.scoringPlaneTolerance,
      useSweptDetection: goalConfig.useSweptGoalDetection,
    })

    if (evaluation.rejectedReason) {
      if (nearGoalPlane || evaluation.crossedPlane) {
        this.logDetection(
          gate,
          previousPosition,
          currentPosition,
          renderedPosition,
          evaluation.crossedPlane,
          evaluation.crossingX,
          evaluation.withinPosts,
          evaluation.rejectedReason,
        )
      }
      return null
    }

    const crossingX = evaluation.crossingX!
    this.scoringCooldownMsRemaining = goalConfig.scoringCooldownMs
    const crossing: GoalCrossing = {
      directionSign: evaluation.directionSign as -1 | 1,
      impactPoint: {
        x: crossingX,
        y: goalPlane,
      },
      previousPosition,
      currentPosition: { ...currentPosition },
      renderedPosition: { ...renderedPosition },
      goalPlane,
      crossingX,
      scoringTolerance: goalConfig.scoringPlaneTolerance,
      goalReason: goalConfig.useSweptGoalDetection
        ? 'swept-plane-crossing'
        : 'discrete-plane-crossing',
    }

    this.logDetection(
      gate,
      previousPosition,
      currentPosition,
      renderedPosition,
      true,
      crossingX,
      true,
      null,
    )

    return crossing
  }

  reset(position: Point, clearCooldown = true): void {
    this.previousPosition = { ...position }

    if (clearCooldown) {
      this.scoringCooldownMsRemaining = 0
    }
  }

  private logDetection(
    gate: GoalGate,
    previousPosition: Point,
    currentPosition: Point,
    renderedPosition: Point,
    crossedPlane: boolean,
    crossingX: number | null,
    withinPosts: boolean,
    reason:
      | GoalCrossingRejectedReason
      | 'goalCooldown'
      | null,
  ): void {
    if (!goalConfig.goalDetectionDebugEnabled) {
      return
    }

    console.info(
      reason ? '[Goal Detection Rejected]' : '[Goal Scored]',
      {
        goalId: gate.id,
        defendingTeam: gate.defendingTeam,
        scoringTeam: gate.scoringTeam,
        previousCorePosition: previousPosition,
        currentCorePosition: currentPosition,
        renderedCorePosition: renderedPosition,
        physicsCorePosition: currentPosition,
        goalPlane: gate.scoringPlaneStart.y,
        crossedPlane,
        crossingX,
        withinPosts,
        scoringTolerance: goalConfig.scoringPlaneTolerance,
        rejectedReason: reason,
        positionStep: Math.hypot(
          currentPosition.x - previousPosition.x,
          currentPosition.y - previousPosition.y,
        ),
        positionStepExceededDiagnostic:
          Math.hypot(
            currentPosition.x - previousPosition.x,
            currentPosition.y - previousPosition.y,
          ) > goalConfig.maxGoalCrossingStep,
      },
    )
  }
}
