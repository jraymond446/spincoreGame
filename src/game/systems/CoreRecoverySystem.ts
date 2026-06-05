import { arenaConfig } from '../config/arenaConfig'
import { coreSafetyConfig } from '../config/coreSafetyConfig'
import type { Point } from '../data/geometry'

export class CoreRecoverySystem {
  private outOfBoundsElapsedMs = 0
  private recoveredMessageMsRemaining = 0

  update(position: Point, deltaMs: number): boolean {
    this.recoveredMessageMsRemaining = Math.max(
      0,
      this.recoveredMessageMsRemaining - deltaMs,
    )

    if (!this.isBeyondRecoveryBounds(position)) {
      this.outOfBoundsElapsedMs = 0
      return false
    }

    this.outOfBoundsElapsedMs += deltaMs

    if (this.outOfBoundsElapsedMs < coreSafetyConfig.coreRecoveryDelayMs) {
      return false
    }

    this.outOfBoundsElapsedMs = 0
    this.recoveredMessageMsRemaining = coreSafetyConfig.recoveredMessageMs
    console.info('[Spincore] Core recovered to faceoff after leaving the arena.')
    return true
  }

  reset(): void {
    this.outOfBoundsElapsedMs = 0
  }

  getDebugStatus(): string {
    if (this.recoveredMessageMsRemaining > 0) {
      return 'RECOVERED TO FACEOFF'
    }

    if (this.outOfBoundsElapsedMs > 0) {
      return `OUT OF BOUNDS ${Math.round(this.outOfBoundsElapsedMs)} / ${
        coreSafetyConfig.coreRecoveryDelayMs
      }ms`
    }

    return 'IN BOUNDS'
  }

  private isBeyondRecoveryBounds(position: Point): boolean {
    const halfWidth = arenaConfig.width / 2
    const halfHeight = arenaConfig.height / 2
    const margin = coreSafetyConfig.coreOutOfBoundsMargin

    return (
      position.x < arenaConfig.center.x - halfWidth - margin ||
      position.x > arenaConfig.center.x + halfWidth + margin ||
      position.y < arenaConfig.center.y - halfHeight - margin ||
      position.y > arenaConfig.center.y + halfHeight + margin
    )
  }
}
