import { arenaConfig } from '../config/arenaConfig'
import type { Point } from '../data/geometry'

export type WallSide = 'top' | 'bottom' | 'left' | 'right'

export type WallLabelInfo = {
  side: WallSide
  safety: boolean
}

export function parseWallLabel(label: string): WallLabelInfo | null {
  const match = /^(arena-wall|arena-safety-wall):(top|bottom|left|right)$/.exec(
    label,
  )

  if (!match) {
    return null
  }

  return {
    safety: match[1] === 'arena-safety-wall',
    side: match[2] as WallSide,
  }
}

export function getWallInwardNormal(side: WallSide): Point {
  switch (side) {
    case 'left':
      return { x: 1, y: 0 }
    case 'right':
      return { x: -1, y: 0 }
    case 'top':
      return { x: 0, y: 1 }
    case 'bottom':
      return { x: 0, y: -1 }
  }
}

export function getArenaBounds(inset = 0): {
  left: number
  right: number
  top: number
  bottom: number
} {
  const halfWidth = arenaConfig.width / 2
  const halfHeight = arenaConfig.height / 2

  return {
    left: arenaConfig.center.x - halfWidth + inset,
    right: arenaConfig.center.x + halfWidth - inset,
    top: arenaConfig.center.y - halfHeight + inset,
    bottom: arenaConfig.center.y + halfHeight - inset,
  }
}

export function clampPointInsideArena(
  point: Point,
  inset = 0,
): Point {
  const bounds = getArenaBounds(inset)

  return {
    x: Math.min(bounds.right, Math.max(bounds.left, point.x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, point.y)),
  }
}

export function getNearestWall(
  point: Point,
  inset = 0,
): {
  side: WallSide
  distance: number
  inward: Point
} {
  const bounds = getArenaBounds(inset)
  const candidates: Array<{ side: WallSide; distance: number }> = [
    { side: 'left', distance: point.x - bounds.left },
    { side: 'right', distance: bounds.right - point.x },
    { side: 'top', distance: point.y - bounds.top },
    { side: 'bottom', distance: bounds.bottom - point.y },
  ]
  let nearest = candidates[0]

  for (const candidate of candidates.slice(1)) {
    if (candidate.distance < nearest.distance) {
      nearest = candidate
    }
  }

  return {
    ...nearest,
    inward: getWallInwardNormal(nearest.side),
  }
}

export function isOutsideArena(point: Point, margin = 0): boolean {
  const bounds = getArenaBounds(-margin)

  return (
    point.x < bounds.left ||
    point.x > bounds.right ||
    point.y < bounds.top ||
    point.y > bounds.bottom
  )
}
