import Phaser from 'phaser'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import type {
  PlayerRole,
  StickActionState,
  StickStyle,
  TeamSide,
} from '../data/matchTypes'
import type {
  DefensiveVisualState,
  PlayerAnimationPose,
} from './AnimationState'
import { CestaBatVisual } from './CestaBatVisual'
import { KeeperShieldVisual } from './KeeperShieldVisual'

type Point = { x: number; y: number }

export class StickVisual {
  private readonly cestaBat: CestaBatVisual | null
  private readonly keeperShield: KeeperShieldVisual | null

  constructor(
    scene: Phaser.Scene,
    style: StickStyle,
    role: PlayerRole,
    teamSide: TeamSide,
  ) {
    const usesShield =
      role === 'keeper' &&
      keeperShieldConfig.keeperUsesShieldDefault &&
      keeperShieldConfig.keeperEquipmentType === 'shield'

    this.cestaBat = usesShield ? null : new CestaBatVisual(scene, style)
    this.keeperShield = usesShield
      ? new KeeperShieldVisual(scene, teamSide)
      : null
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
    if (this.keeperShield) {
      this.keeperShield.update(
        mountPoint,
        forward,
        state,
        defenseState,
      )
    } else {
      this.cestaBat?.update({
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
  }

  destroy(): void {
    this.cestaBat?.destroy()
    this.keeperShield?.destroy()
  }

  setVisible(visible: boolean): void {
    this.cestaBat?.setVisible(visible)
    this.keeperShield?.setVisible(visible)
  }
}
