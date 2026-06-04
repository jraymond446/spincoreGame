import Phaser from 'phaser'
import { coreConfig, playerConfig } from '../config/entityConfig'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import type { Point } from '../data/geometry'

export class StickContactSystem {
  update(core: Core, player: Player): void {
    const corePosition = core.position
    const samplePoints = player.getStickSamplePoints()
    const contactLimit = coreConfig.radius + playerConfig.stick.contactRadius
    const contactLimitSq = contactLimit * contactLimit
    const closest = findClosestPointOnPolyline(corePosition, samplePoints)

    if (!closest || closest.distanceSq > contactLimitSq) {
      return
    }

    const normal = new Phaser.Math.Vector2(
      corePosition.x - closest.point.x,
      corePosition.y - closest.point.y,
    )

    if (normal.lengthSq() === 0) {
      const forward = player.getStickForward()
      normal.set(forward.x, forward.y)
    }

    normal.normalize()

    const forward = player.getStickForward()
    const force = {
      x: normal.x * playerConfig.stick.contactForce + forward.x * playerConfig.stick.guideForce,
      y: normal.y * playerConfig.stick.contactForce + forward.y * playerConfig.stick.guideForce,
    }

    core.applyForce(force)
  }
}

function findClosestPointOnPolyline(
  point: Point,
  polyline: Point[],
): { point: Point; distanceSq: number } | null {
  let closest: { point: Point; distanceSq: number } | null = null

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const candidate = closestPointOnSegment(point, polyline[index], polyline[index + 1])

    if (!closest || candidate.distanceSq < closest.distanceSq) {
      closest = candidate
    }
  }

  return closest
}

function closestPointOnSegment(
  point: Point,
  start: Point,
  end: Point,
): { point: Point; distanceSq: number } {
  const segment = {
    x: end.x - start.x,
    y: end.y - start.y,
  }
  const lengthSq = segment.x * segment.x + segment.y * segment.y
  const rawT =
    lengthSq === 0
      ? 0
      : ((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSq
  const t = Phaser.Math.Clamp(rawT, 0, 1)
  const closest = {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  }
  const dx = point.x - closest.x
  const dy = point.y - closest.y

  return {
    point: closest,
    distanceSq: dx * dx + dy * dy,
  }
}
