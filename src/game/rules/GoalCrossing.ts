import type { Point } from '../data/geometry'

export type GoalCrossingRejectedReason =
  | 'didNotCrossPlane'
  | 'outsidePosts'
  | 'invalidPosition'

export type GoalCrossingEvaluation = {
  crossedPlane: boolean
  crossingX: number | null
  withinPosts: boolean
  directionSign: -1 | 1 | 0
  rejectedReason: GoalCrossingRejectedReason | null
}

export function evaluateGoalCrossing(input: {
  previousPosition: Point
  currentPosition: Point
  planeY: number
  minX: number
  maxX: number
  tolerance: number
  useSweptDetection: boolean
}): GoalCrossingEvaluation {
  const {
    previousPosition,
    currentPosition,
    planeY,
    tolerance,
    useSweptDetection,
  } = input
  const values = [
    previousPosition.x,
    previousPosition.y,
    currentPosition.x,
    currentPosition.y,
    planeY,
    input.minX,
    input.maxX,
    tolerance,
  ]

  if (!values.every(Number.isFinite)) {
    return {
      crossedPlane: false,
      crossingX: null,
      withinPosts: false,
      directionSign: 0,
      rejectedReason: 'invalidPosition',
    }
  }

  const deltaY = currentPosition.y - previousPosition.y
  const epsilon = 0.0001
  const previousOffset = previousPosition.y - planeY
  const currentOffset = currentPosition.y - planeY
  const crossedPlane =
    Math.abs(deltaY) >= epsilon &&
    ((previousOffset > epsilon && currentOffset <= 0) ||
      (previousOffset < -epsilon && currentOffset >= 0))
  const directionSign: -1 | 1 | 0 =
    deltaY < -epsilon ? -1 : deltaY > epsilon ? 1 : 0

  if (!crossedPlane) {
    return {
      crossedPlane: false,
      crossingX: null,
      withinPosts: false,
      directionSign,
      rejectedReason: 'didNotCrossPlane',
    }
  }

  const progress = Math.min(
    1,
    Math.max(0, (planeY - previousPosition.y) / deltaY),
  )
  const crossingX = useSweptDetection
    ? previousPosition.x +
      (currentPosition.x - previousPosition.x) * progress
    : currentPosition.x
  const openingMin = Math.min(input.minX, input.maxX) - tolerance
  const openingMax = Math.max(input.minX, input.maxX) + tolerance
  const withinPosts =
    crossingX >= openingMin && crossingX <= openingMax

  return {
    crossedPlane: true,
    crossingX,
    withinPosts,
    directionSign,
    rejectedReason: withinPosts ? null : 'outsidePosts',
  }
}
