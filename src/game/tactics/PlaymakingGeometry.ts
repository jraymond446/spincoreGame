import type { Point } from '../data/geometry'

export function isDeepAttackPosition(
  position: Point,
  attackGoal: Point,
  activationDistance: number,
): boolean {
  return distance(position, attackGoal) <= Math.max(0, activationDistance)
}

export function resolveBehindNetOffBallJob(
  carrierPosition: Point | null,
  attackGoal: Point,
  activationDistance: number,
): 'frontSlot' | 'supportOutlet' {
  return carrierPosition &&
    isDeepAttackPosition(
      carrierPosition,
      attackGoal,
      activationDistance,
    )
    ? 'frontSlot'
    : 'supportOutlet'
}

export function enforceMinimumSeparation(
  target: Point,
  anchor: Point,
  minimumDistance: number,
  fallbackDirection: Point,
): Point {
  const requiredDistance = Math.max(0, minimumDistance)
  const offset = {
    x: target.x - anchor.x,
    y: target.y - anchor.y,
  }
  const currentDistance = Math.hypot(offset.x, offset.y)

  if (currentDistance >= requiredDistance || requiredDistance === 0) {
    return { ...target }
  }

  const direction = normalize(
    currentDistance > 0.0001 ? offset : fallbackDirection,
    { x: 1, y: 0 },
  )

  return {
    x: anchor.x + direction.x * requiredDistance,
    y: anchor.y + direction.y * requiredDistance,
  }
}

export function resolveWeakSideLaneSign(
  carrierX: number,
  arenaCenterX: number,
): -1 | 1 {
  return carrierX < arenaCenterX ? 1 : -1
}

function normalize(point: Point, fallback: Point): Point {
  const length = Math.hypot(point.x, point.y)

  if (!Number.isFinite(length) || length <= 0.0001) {
    return { ...fallback }
  }

  return {
    x: point.x / length,
    y: point.y / length,
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
