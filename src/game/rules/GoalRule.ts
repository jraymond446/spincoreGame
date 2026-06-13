import type { GoalGate } from '../entities/GoalGate'
import type { Point } from '../data/geometry'
import { goalConfig } from '../config/goalConfig'

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

    if (this.scoringCooldownMsRemaining > 0) {
      return null
    }

    const goalPlane = gate.scoringPlaneStart.y
    const expectedDirection: -1 | 1 =
      gate.id === 'top-goal' ? -1 : 1
    const crossedPlane =
      expectedDirection === -1
        ? previousPosition.y > goalPlane &&
          currentPosition.y <= goalPlane
        : previousPosition.y < goalPlane &&
          currentPosition.y >= goalPlane
    const crossedWrongDirection =
      expectedDirection === -1
        ? previousPosition.y < goalPlane &&
          currentPosition.y >= goalPlane
        : previousPosition.y > goalPlane &&
          currentPosition.y <= goalPlane

    if (!crossedPlane) {
      if (crossedWrongDirection) {
        this.logInvalidCandidate(
          gate,
          previousPosition,
          currentPosition,
          renderedPosition,
          null,
          'wrong-direction',
        )
      }
      return null
    }

    const stepDistance = Math.hypot(
      currentPosition.x - previousPosition.x,
      currentPosition.y - previousPosition.y,
    )

    if (stepDistance > goalConfig.maxGoalCrossingStep) {
      this.logInvalidCandidate(
        gate,
        previousPosition,
        currentPosition,
        renderedPosition,
        null,
        'implausible-position-step',
      )
      return null
    }

    const deltaY = currentPosition.y - previousPosition.y

    if (Math.abs(deltaY) < 0.0001) {
      return null
    }

    const progress = Math.min(
      1,
      Math.max(0, (goalPlane - previousPosition.y) / deltaY),
    )
    const crossingX = goalConfig.useSweptGoalDetection
      ? previousPosition.x +
        (currentPosition.x - previousPosition.x) * progress
      : currentPosition.x
    const openingMin = Math.min(
      gate.scoringPlaneStart.x,
      gate.scoringPlaneEnd.x,
    )
    const openingMax = Math.max(
      gate.scoringPlaneStart.x,
      gate.scoringPlaneEnd.x,
    )
    const withinPosts =
      crossingX >= openingMin && crossingX <= openingMax

    if (!withinPosts) {
      this.logInvalidCandidate(
        gate,
        previousPosition,
        currentPosition,
        renderedPosition,
        crossingX,
        'outside-posts',
      )
      return null
    }

    this.scoringCooldownMsRemaining = goalConfig.scoringCooldownMs
    const crossing: GoalCrossing = {
      directionSign: expectedDirection,
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

    if (goalConfig.goalWarpDebugEnabled) {
      console.info('[Goal Scored]', {
        goalId: gate.id,
        previousCorePosition: crossing.previousPosition,
        currentCorePosition: crossing.currentPosition,
        renderedCorePosition: crossing.renderedPosition,
        physicsCorePosition: crossing.currentPosition,
        goalPlane,
        crossingX,
        withinPosts,
        scoringTolerance: crossing.scoringTolerance,
        goalReason: crossing.goalReason,
      })
    }

    return crossing
  }

  reset(position: Point, clearCooldown = true): void {
    this.previousPosition = { ...position }

    if (clearCooldown) {
      this.scoringCooldownMsRemaining = 0
    }
  }

  private logInvalidCandidate(
    gate: GoalGate,
    previousPosition: Point,
    currentPosition: Point,
    renderedPosition: Point,
    crossingX: number | null,
    reason:
      | 'wrong-direction'
      | 'outside-posts'
      | 'implausible-position-step',
  ): void {
    if (!goalConfig.goalWarpDebugEnabled) {
      return
    }

    console.info('[Invalid Goal Candidate]', {
      goalId: gate.id,
      previousCorePosition: previousPosition,
      currentCorePosition: currentPosition,
      renderedCorePosition: renderedPosition,
      physicsCorePosition: currentPosition,
      goalPlane: gate.scoringPlaneStart.y,
      crossingX,
      withinPosts: false,
      scoringTolerance: goalConfig.scoringPlaneTolerance,
      goalReason: reason,
    })
  }
}
