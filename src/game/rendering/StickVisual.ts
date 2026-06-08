import Phaser from 'phaser'
import type { StickActionState, StickStyle } from '../data/matchTypes'
import type {
  DefensiveVisualState,
  PlayerAnimationPose,
} from './AnimationState'
import { CestaBatVisual } from './CestaBatVisual'

type Point = { x: number; y: number }

export class StickVisual {
  private readonly cestaBat: CestaBatVisual

  constructor(scene: Phaser.Scene, style: StickStyle) {
    this.cestaBat = new CestaBatVisual(scene, style)
  }

  update(
    mountPoint: Point,
    forward: Point,
    stickSide: Point,
    visualMirrorSign: -1 | 1,
    cradleSocket: Point,
    state: StickActionState,
    defenseState: DefensiveVisualState,
    pose: PlayerAnimationPose,
    chargeVisual: {
      normalized: number
      hardCharge: boolean
      overcharged: boolean
    },
    now: number,
  ): void {
    this.cestaBat.update({
      root: mountPoint,
      forward,
      cradleSide: stickSide,
      visualMirrorSign,
      cradleSocket,
      state,
      defenseState,
      pose,
      chargeVisual,
      now,
    })
  }

  destroy(): void {
    this.cestaBat.destroy()
  }
}
