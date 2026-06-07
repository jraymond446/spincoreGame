import Phaser from 'phaser'
import type { StickActionState, StickStyle } from '../data/matchTypes'
import type { StickCurve } from '../entities/Player'
import type { PlayerAnimationPose } from './AnimationState'
import { CestaBatVisual } from './CestaBatVisual'

type Point = { x: number; y: number }

export class StickVisual {
  private readonly cestaBat: CestaBatVisual

  constructor(scene: Phaser.Scene, style: StickStyle) {
    this.cestaBat = new CestaBatVisual(scene, style)
  }

  update(
    curve: StickCurve,
    forward: Point,
    stickSide: Point,
    cradleSocket: Point,
    state: StickActionState,
    pose: PlayerAnimationPose,
    now: number,
  ): void {
    this.cestaBat.update({
      root: curve.root,
      forward,
      cradleSide: stickSide,
      cradleSocket,
      state,
      pose,
      now,
    })
  }

  destroy(): void {
    this.cestaBat.destroy()
  }
}
