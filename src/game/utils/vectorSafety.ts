import type { Point } from '../data/geometry'

export type VectorWarningLabel =
  | '[Invalid Movement Vector]'
  | '[Invalid Aim Vector]'
  | '[Invalid Juke Vector]'
  | '[Invalid Tactical Target]'
  | '[Invalid Facing Angle]'

type WarningContext = {
  label: VectorWarningLabel
  playerId?: string
  system: string
  value: unknown
}

const warnedKeys = new Set<string>()

export function isValidVector(vector: Point | null | undefined): vector is Point {
  return Boolean(
    vector &&
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y),
  )
}

export function copyVector(
  source: Point | null | undefined,
  fallback: Point = { x: 0, y: 0 },
): Point {
  return isValidVector(source)
    ? { x: source.x, y: source.y }
    : { x: fallback.x, y: fallback.y }
}

export function normalizeSafe(
  vector: Point | null | undefined,
  fallback: Point,
): Point {
  const safeFallback = normalizedFallback(fallback)

  if (!isValidVector(vector)) {
    return safeFallback
  }

  const length = Math.hypot(vector.x, vector.y)

  if (!Number.isFinite(length) || length <= 0.000001) {
    return safeFallback
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

export function angleToSafe(
  vector: Point | null | undefined,
  fallbackAngle: number,
): number {
  if (!isValidVector(vector)) {
    return sanitizeAngle(fallbackAngle, 0)
  }

  return sanitizeAngle(
    Math.atan2(vector.y, vector.x),
    fallbackAngle,
  )
}

export function clampVectorMagnitude(
  vector: Point | null | undefined,
  maximum: number,
  fallback: Point = { x: 0, y: 0 },
): Point {
  const safe = copyVector(vector, fallback)
  const limit = Number.isFinite(maximum)
    ? Math.max(0, maximum)
    : 0
  const length = Math.hypot(safe.x, safe.y)

  if (!Number.isFinite(length) || length <= limit || length === 0) {
    return safe
  }

  const scale = limit / length
  return {
    x: safe.x * scale,
    y: safe.y * scale,
  }
}

export function sanitizeAngle(
  angle: number,
  fallback: number,
): number {
  const safeFallback = Number.isFinite(fallback) ? fallback : 0
  return Number.isFinite(angle) ? angle : safeFallback
}

export function sanitizeVector(
  vector: Point | null | undefined,
  fallback: Point,
  context: Omit<WarningContext, 'value'>,
): Point {
  if (isValidVector(vector)) {
    return { x: vector.x, y: vector.y }
  }

  warnInvalid({ ...context, value: vector })
  return copyVector(fallback)
}

export function sanitizeAngleWithWarning(
  angle: number,
  fallback: number,
  context: Omit<WarningContext, 'value'>,
): number {
  if (Number.isFinite(angle)) {
    return angle
  }

  warnInvalid({ ...context, value: angle })
  return sanitizeAngle(fallback, 0)
}

export function resetVectorSafetyWarnings(): void {
  warnedKeys.clear()
}

function normalizedFallback(fallback: Point): Point {
  if (!isValidVector(fallback)) {
    return { x: 1, y: 0 }
  }

  const length = Math.hypot(fallback.x, fallback.y)
  return length > 0.000001 && Number.isFinite(length)
    ? { x: fallback.x / length, y: fallback.y / length }
    : { x: fallback.x, y: fallback.y }
}

function warnInvalid(context: WarningContext): void {
  const key =
    `${context.label}:${context.system}:` +
    `${context.playerId ?? 'global'}`

  if (warnedKeys.has(key)) {
    return
  }

  warnedKeys.add(key)
  console.warn(context.label, {
    playerId: context.playerId ?? null,
    system: context.system,
    value: context.value,
  })
}
