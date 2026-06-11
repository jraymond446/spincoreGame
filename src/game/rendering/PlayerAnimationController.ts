import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { StickActionState } from '../data/matchTypes'
import type {
  DefensiveVisualState,
  PlayerAnimationPose,
} from './AnimationState'

const neutralPose: PlayerAnimationPose = {
  bodyForwardOffset: 0,
  bodySideOffset: 0,
  bodyRotationOffset: 0,
  bodyScaleX: 1,
  bodyScaleY: 1,
  headForwardOffset: 0,
  shadowScale: 1,
  stickRotationOffset: 0,
  stickScaleX: 1,
  stickScaleY: 1,
  anticipation: 0,
  impact: 0,
}

export class PlayerAnimationController {
  private stateKey = ''
  private stateStartedAt = 0

  update(
    stickState: StickActionState,
    defenseState: DefensiveVisualState,
    mountSign: number,
    pocketFacingSign: number,
    now: number,
  ): PlayerAnimationPose {
    const stateKey = `${stickState}:${defenseState}`

    if (stateKey !== this.stateKey) {
      this.stateKey = stateKey
      this.stateStartedAt = now
    }

    const elapsed = now - this.stateStartedAt
    const pose = { ...neutralPose }

    this.applyStickPose(
      pose,
      stickState,
      mountSign,
      pocketFacingSign,
      elapsed,
    )
    this.applyDefensePose(
      pose,
      defenseState,
      pocketFacingSign,
      elapsed,
    )
    return pose
  }

  private applyStickPose(
    pose: PlayerAnimationPose,
    state: StickActionState,
    mountSign: number,
    pocketFacingSign: number,
    elapsed: number,
  ): void {
    const pulse = 0.5 + Math.sin(elapsed * 0.014) * 0.5

    switch (state) {
      case 'CATCH_READY':
        pose.bodyForwardOffset = -2
        pose.bodySideOffset = -2.5 * mountSign
        pose.bodyScaleX = 1.05
        pose.stickScaleY = 1.08
        pose.anticipation = 0.72
        break
      case 'CRADLED_STABLE':
        pose.bodyForwardOffset = -1.5
        pose.bodySideOffset = -1.5 * mountSign
        pose.stickScaleX = 0.98
        pose.anticipation = 0.35
        break
      case 'CRADLED_CHARGING':
        pose.bodyForwardOffset = -3 - pulse
        pose.bodySideOffset = -2 * mountSign
        pose.bodyScaleX = 1.04
        pose.bodyScaleY = 0.97
        pose.stickScaleX = 1.02
        pose.anticipation = 0.65 + pulse * 0.25
        break
      case 'CRADLED_OVERCHARGED':
        pose.bodyForwardOffset = -4
        pose.bodySideOffset =
          (Math.sin(elapsed * 0.06) * 1.4 - 2) * mountSign
        pose.bodyScaleX = 1.07
        pose.bodyScaleY = 0.95
        pose.anticipation = 1
        break
      case 'RELEASE_WINDUP':
        pose.bodyForwardOffset = -5
        pose.bodySideOffset = -3.5 * mountSign
        pose.bodyRotationOffset = -0.08 * pocketFacingSign
        pose.bodyScaleX = 1.06
        pose.bodyScaleY = 0.95
        pose.stickScaleX = 0.96
        pose.anticipation = 1
        break
      case 'RELEASE_SWING':
        pose.bodyForwardOffset = 5
        pose.bodySideOffset = 2.5 * mountSign
        pose.bodyRotationOffset = 0.12 * pocketFacingSign
        pose.bodyScaleX = 0.96
        pose.bodyScaleY = 1.08
        pose.stickScaleX = 1.1
        pose.impact = 1
        break
      case 'RELEASE_FOLLOW_THROUGH':
        pose.bodyForwardOffset = 4
        pose.bodySideOffset = 2 * mountSign
        pose.bodyRotationOffset = 0.1 * pocketFacingSign
        pose.bodyScaleX = 0.98
        pose.bodyScaleY = 1.04
        pose.stickScaleX = 1.05
        pose.impact = 0.42
        break
      case 'SWINGING':
        pose.bodyForwardOffset = 3
        pose.bodyRotationOffset = 0.08 * pocketFacingSign
        pose.stickRotationOffset = 0.08 * pocketFacingSign
        pose.stickScaleX = 1.08
        pose.impact = 0.75
        break
      case 'FUMBLED_COOLDOWN':
        pose.bodyForwardOffset = -3
        pose.bodySideOffset = Math.sin(elapsed * 0.07) * 2.2
        pose.bodyRotationOffset = Math.sin(elapsed * 0.045) * 0.08
        pose.stickRotationOffset = -0.18 * pocketFacingSign
        pose.bodyScaleX = 1.08
        pose.bodyScaleY = 0.92
        break
    }
  }

  private applyDefensePose(
    pose: PlayerAnimationPose,
    state: DefensiveVisualState,
    mirror: number,
    elapsed: number,
  ): void {
    const startup = Phaser.Math.Clamp(elapsed / 120, 0, 1)

    switch (state) {
      case 'TRUCK_STARTUP':
        pose.bodyForwardOffset -= 4 * startup
        pose.bodyScaleX *= 1.08
        pose.bodyScaleY *= 0.94
        pose.anticipation = Math.max(pose.anticipation, 0.8)
        break
      case 'TRUCK_ACTIVE':
        pose.bodyForwardOffset += 8
        pose.bodyScaleX *= 1.12
        pose.bodyScaleY *= 0.9
        pose.headForwardOffset += 3
        pose.shadowScale *= 1.12
        pose.impact = 1
        break
      case 'TRUCK_RECOVERY':
        pose.bodyForwardOffset += 2
        pose.bodyScaleX *= 1.04
        pose.bodyScaleY *= 0.97
        break
      case 'KNOCKED_DOWN':
        pose.bodyForwardOffset += 7
        pose.bodySideOffset += 5 * mirror
        pose.bodyRotationOffset += 1.32 * mirror
        pose.bodyScaleX *= 1.08
        pose.bodyScaleY *= 0.72
        pose.headForwardOffset -= 4
        pose.shadowScale *= 1.22
        pose.stickRotationOffset -= 0.48 * mirror
        pose.stickScaleY *= 0.9
        break
      case 'GETTING_UP': {
        const progress = Phaser.Math.Clamp(
          elapsed / defenseConfig.truckGetUpMs,
          0,
          1,
        )
        const inverse = 1 - progress
        pose.bodyForwardOffset += 7 * inverse
        pose.bodySideOffset += 5 * mirror * inverse
        pose.bodyRotationOffset += 1.32 * mirror * inverse
        pose.bodyScaleX *= Phaser.Math.Linear(1.08, 1, progress)
        pose.bodyScaleY *= Phaser.Math.Linear(0.72, 1, progress)
        pose.headForwardOffset -= 4 * inverse
        pose.shadowScale *= Phaser.Math.Linear(1.22, 1, progress)
        pose.stickRotationOffset -= 0.48 * mirror * inverse
        break
      }
      case 'SLASH_STARTUP':
        pose.bodyRotationOffset -= 0.09 * mirror
        pose.stickRotationOffset -= 0.13 * mirror
        pose.anticipation = Math.max(pose.anticipation, 0.7)
        break
      case 'SLASH_ACTIVE':
        pose.bodyRotationOffset += 0.11 * mirror
        pose.stickRotationOffset += 0.19 * mirror
        pose.stickScaleX *= 1.1
        pose.impact = 0.85
        break
      case 'SLASH_RECOVERY':
        pose.bodyRotationOffset += 0.04 * mirror
        pose.stickRotationOffset += 0.07 * mirror
        break
    }
  }
}
