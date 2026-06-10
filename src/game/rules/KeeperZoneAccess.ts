import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import { getKeeperHomeDirection } from './KeeperGeometry'
import { normalizeSafe } from '../utils/vectorSafety'

export type PlayerZoneAccessState =
  | 'legal'
  | 'legal own zone'
  | 'blocked opponent zone'
  | 'blocked inner ring'

export function getPlayerZoneAccessState(
  player: Player,
  point = player.position,
): PlayerZoneAccessState {
  for (const zoneSide of ['A', 'B'] as const) {
    const center = keeperAreaConfig.areas[zoneSide]
    const zoneDistance = distance(point, center)

    if (
      zoneSide !== player.teamSide &&
      keeperZoneRulesConfig.attackersBlockedFromOpponentKeeperZone &&
      zoneDistance < getOuterPlayerBoundaryRadius()
    ) {
      return 'blocked opponent zone'
    }

    if (
      keeperZoneRulesConfig.innerRingBlocksAllPlayers &&
      zoneDistance < getInnerPlayerBoundaryRadius()
    ) {
      return 'blocked inner ring'
    }

    if (
      zoneSide === player.teamSide &&
      player.role !== 'keeper' &&
      keeperZoneRulesConfig.defendersAllowedInOwnKeeperZone &&
      zoneDistance < keeperAreaConfig.keeperZoneRadius
    ) {
      return 'legal own zone'
    }
  }

  return 'legal'
}

export function clampFieldPlayerTargetToLegalZones(
  player: Player,
  point: Point,
  allowOwnOuterZone: boolean,
): Point {
  let adjusted = { ...point }

  for (const zoneSide of ['A', 'B'] as const) {
    const center = keeperAreaConfig.areas[zoneSide]
    const offset = subtract(adjusted, center)
    const currentDistance = magnitude(offset)
    const fallback = getKeeperHomeDirection(zoneSide)
    const direction = normalized(offset, fallback)
    const blocksOwnOuter =
      zoneSide === player.teamSide &&
      (!keeperZoneRulesConfig.defendersAllowedInOwnKeeperZone ||
        !allowOwnOuterZone)
    const blocksOpponentOuter =
      zoneSide !== player.teamSide &&
      keeperZoneRulesConfig.attackersBlockedFromOpponentKeeperZone

    if (
      keeperZoneRulesConfig.innerRingBlocksAllPlayers &&
      currentDistance < getInnerPlayerBoundaryRadius()
    ) {
      adjusted = pointAtRadius(
        center,
        direction,
        getInnerPlayerBoundaryRadius(),
      )
    }

    if (
      (blocksOwnOuter || blocksOpponentOuter) &&
      currentDistance < getOuterPlayerBoundaryRadius()
    ) {
      adjusted = pointAtRadius(
        center,
        direction,
        getOuterPlayerBoundaryRadius(),
      )
    }
  }

  return adjusted
}

export function isPointInKeeperZone(
  point: Point,
  zoneSide: TeamSide,
): boolean {
  return (
    distance(point, keeperAreaConfig.areas[zoneSide]) <
    keeperAreaConfig.keeperZoneRadius
  )
}

export function isPointInOpponentKeeperZone(
  point: Point,
  playerSide: TeamSide,
): boolean {
  return isPointInKeeperZone(point, oppositeSide(playerSide))
}

export function getInnerPlayerBoundaryRadius(): number {
  return (
    keeperAreaConfig.innerNoBodyRadius +
    playerRuntimeConfig.radius +
    keeperAreaConfig.keeperZoneBoundaryBuffer
  )
}

export function getOuterPlayerBoundaryRadius(): number {
  return (
    keeperAreaConfig.keeperZoneRadius +
    playerRuntimeConfig.radius +
    keeperAreaConfig.keeperZoneBoundaryBuffer
  )
}

function pointAtRadius(
  center: Point,
  direction: Point,
  radius: number,
): Point {
  return {
    x: center.x + direction.x * radius,
    y: center.y + direction.y * radius,
  }
}

function oppositeSide(side: TeamSide): TeamSide {
  return side === 'A' ? 'B' : 'A'
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function normalized(vector: Point, fallback: Point): Point {
  return normalizeSafe(vector, fallback)
}

function magnitude(vector: Point): number {
  return Math.hypot(vector.x, vector.y)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
