import { arenaConfig } from '../config/arenaConfig'
import { coreSafetyConfig } from '../config/coreSafetyConfig'
import { wallConfig } from '../config/wallConfig'
import type { Point } from '../data/geometry'

export type CoreRecoveryReason =
  | 'OUT_OF_BOUNDS'
  | 'STUCK_NEAR_WALL'
  | 'INVALID_POSITION'

export class CoreRecoverySystem {
  private outOfBoundsElapsedMs = 0
  private stuckElapsedMs = 0
  private stuckAnchor: Point | null = null
  private recoveredMessageMsRemaining = 0
  private lastRecoveryReason: CoreRecoveryReason | null = null

  update(
    position: Point,
    velocity: Point,
    isPossessed: boolean,
    deltaMs: number,
  ): CoreRecoveryReason | null {
    this.recoveredMessageMsRemaining = Math.max(
      0,
      this.recoveredMessageMsRemaining - deltaMs,
    )

    if (!isFinitePoint(position) || !isFinitePoint(velocity)) {
      return this.recover('INVALID_POSITION')
    }

    if (this.isBeyondRecoveryBounds(position)) {
      this.outOfBoundsElapsedMs += deltaMs

      if (
        this.outOfBoundsElapsedMs >=
        Math.max(
          wallConfig.coreRecoveryDelayMs,
          wallConfig.coreSafetyResetToCenterAfterMs,
        )
      ) {
        return this.recover('OUT_OF_BOUNDS')
      }
    } else {
      this.outOfBoundsElapsedMs = 0
    }

    if (
      !coreSafetyConfig.coreStuckDetectionEnabled ||
      isPossessed ||
      !this.isNearArenaWall(position) ||
      Math.hypot(velocity.x, velocity.y) >
        coreSafetyConfig.coreStuckSpeedThreshold
    ) {
      this.clearStuckTimer()
      return null
    }

    if (!this.stuckAnchor) {
      this.stuckAnchor = { ...position }
    } else if (
      distance(position, this.stuckAnchor) >
      coreSafetyConfig.coreStuckMovementThreshold
    ) {
      this.stuckAnchor = { ...position }
      this.stuckElapsedMs = 0
    }

    this.stuckElapsedMs += deltaMs

    if (
      this.stuckElapsedMs >=
      coreSafetyConfig.coreStuckRecoveryDelayMs
    ) {
      return this.recover('STUCK_NEAR_WALL')
    }

    return null
  }

  reset(): void {
    this.outOfBoundsElapsedMs = 0
    this.clearStuckTimer()
  }

  getDebugStatus(): string {
    if (this.recoveredMessageMsRemaining > 0) {
      return `RECOVERED ${this.lastRecoveryReason ?? 'TO FACEOFF'}`
    }

    if (this.outOfBoundsElapsedMs > 0) {
      const status =
        this.outOfBoundsElapsedMs >= wallConfig.coreRecoveryDelayMs
          ? 'RECOVERY ARMED'
          : 'OUT OF BOUNDS'

      return `${status} ${Math.round(this.outOfBoundsElapsedMs)} / ${
        wallConfig.coreSafetyResetToCenterAfterMs
      }ms`
    }

    if (this.stuckElapsedMs > 0) {
      return `STUCK NEAR WALL ${Math.round(this.stuckElapsedMs)} / ${
        coreSafetyConfig.coreStuckRecoveryDelayMs
      }ms`
    }

    return 'IN BOUNDS'
  }

  private recover(reason: CoreRecoveryReason): CoreRecoveryReason {
    this.outOfBoundsElapsedMs = 0
    this.clearStuckTimer()
    this.lastRecoveryReason = reason
    this.recoveredMessageMsRemaining =
      coreSafetyConfig.recoveredMessageMs
    console.info(
      `[Spincore] Core recovery faceoff triggered: ${reason}.`,
    )
    return reason
  }

  private clearStuckTimer(): void {
    this.stuckElapsedMs = 0
    this.stuckAnchor = null
  }

  private isBeyondRecoveryBounds(position: Point): boolean {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const margin = wallConfig.coreOutOfBoundsMargin

    return (
      position.x < arenaConfig.center.x - halfWidth - margin ||
      position.x > arenaConfig.center.x + halfWidth + margin ||
      position.y < arenaConfig.center.y - halfHeight - margin ||
      position.y > arenaConfig.center.y + halfHeight + margin
    )
  }

  private isNearArenaWall(position: Point): boolean {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const left = arenaConfig.center.x - halfWidth
    const right = arenaConfig.center.x + halfWidth
    const top = arenaConfig.center.y - halfHeight
    const bottom = arenaConfig.center.y + halfHeight
    const nearestWallDistance = Math.min(
      Math.abs(position.x - left),
      Math.abs(right - position.x),
      Math.abs(position.y - top),
      Math.abs(bottom - position.y),
    )

    return (
      nearestWallDistance <=
      coreSafetyConfig.coreStuckNearWallDistance
    )
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}
