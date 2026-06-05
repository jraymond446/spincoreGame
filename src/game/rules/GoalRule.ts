import type { GoalGate } from '../entities/GoalGate'
import type { Point } from '../data/geometry'
import { goalConfig } from '../config/goalConfig'

export type GoalCrossing = {
  directionSign: -1 | 1
  impactPoint: Point
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
  ): GoalCrossing | null {
    this.scoringCooldownMsRemaining = Math.max(
      0,
      this.scoringCooldownMsRemaining - deltaMs,
    )
    const motion = subtract(currentPosition, this.previousPosition)
    const directionSign = dot(motion, gate.normal) >= 0 ? 1 : -1
    const crossing = findSegmentIntersection(
      this.previousPosition,
      currentPosition,
      gate.scoringPlaneStart,
      gate.scoringPlaneEnd,
    )

    this.previousPosition = { ...currentPosition }

    if (!crossing || this.scoringCooldownMsRemaining > 0) {
      return null
    }

    this.scoringCooldownMsRemaining = goalConfig.scoringCooldownMs

    return {
      directionSign,
      impactPoint: crossing,
    }
  }

  reset(position: Point, clearCooldown = true): void {
    this.previousPosition = { ...position }

    if (clearCooldown) {
      this.scoringCooldownMsRemaining = 0
    }
  }
}

function findSegmentIntersection(
  motionStart: Point,
  motionEnd: Point,
  gateStart: Point,
  gateEnd: Point,
): Point | null {
  const motion = subtract(motionEnd, motionStart)
  const gate = subtract(gateEnd, gateStart)
  const denominator = cross(motion, gate)

  if (Math.abs(denominator) < 0.0001) {
    return null
  }

  const startDelta = subtract(gateStart, motionStart)
  const motionT = cross(startDelta, gate) / denominator
  const gateT = cross(startDelta, motion) / denominator

  if (motionT < 0 || motionT > 1 || gateT < 0 || gateT > 1) {
    return null
  }

  return {
    x: motionStart.x + motion.x * motionT,
    y: motionStart.y + motion.y * motionT,
  }
}

function subtract(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
