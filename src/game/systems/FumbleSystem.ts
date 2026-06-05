import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { PlayerRole } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import type { CorePossessionState } from './StickInteractionSystem'

export type FumblePressureSource = 'bodyCheck' | 'stickSwipe'

export class FumbleSystem {
  private carrierId: string | null = null
  private pressure = 0

  update(
    carrierId: string | null,
    coreState: CorePossessionState,
    deltaMs: number,
  ): void {
    if (!carrierId || !isCradledState(coreState)) {
      this.clear()
      return
    }

    if (this.carrierId !== carrierId) {
      this.carrierId = carrierId
      this.pressure = 0
    }

    this.pressure = Math.max(
      0,
      this.pressure -
        defenseConfig.fumblePressureDecayPerSecond * (deltaMs / 1000),
    )
  }

  addPressure(
    amount: number,
    attackerRole: PlayerRole,
    source: FumblePressureSource,
    coreState: CorePossessionState,
    carrier: Player,
  ): boolean {
    const handlingResistance = Phaser.Math.Linear(
      1.25,
      0.65,
      Phaser.Math.Clamp(carrier.attributes.ballHandling, 0, 1),
    )
    const handlingVulnerability = Phaser.Math.Linear(
      1.25,
      0.75,
      Phaser.Math.Clamp(carrier.attributes.ballHandling, 0, 1),
    )
    const phaseMultiplier =
      coreState === 'CRADLED_OVERCHARGED'
        ? defenseConfig.overchargeFumbleVulnerability *
          handlingVulnerability *
          (source === 'bodyCheck'
            ? defenseConfig.bodyCheckOverchargeMultiplier
            : defenseConfig.stickSwipeOverchargeMultiplier)
        : coreState === 'CRADLED_CHARGING'
          ? defenseConfig.chargingFumbleResistance
          : defenseConfig.stableCradleFumbleResistance *
            Phaser.Math.Linear(
              1.08,
              0.88,
              Phaser.Math.Clamp(carrier.attributes.ballHandling, 0, 1),
            )
    const roleBonus =
      attackerRole === 'brute'
        ? defenseConfig.bruteFumbleBonus
        : attackerRole === 'support' && source === 'stickSwipe'
          ? defenseConfig.supportStealBonus
          : 0

    this.pressure = Phaser.Math.Clamp(
      this.pressure +
        amount * phaseMultiplier * handlingResistance +
        roleBonus * handlingResistance,
      0,
      defenseConfig.fumblePressureThreshold * 1.5,
    )

    return this.pressure >= defenseConfig.fumblePressureThreshold
  }

  clear(): void {
    this.carrierId = null
    this.pressure = 0
  }

  getPressure(): number {
    return this.pressure
  }

  getNormalizedPressure(): number {
    return Phaser.Math.Clamp(
      this.pressure / defenseConfig.fumblePressureThreshold,
      0,
      1,
    )
  }
}

function isCradledState(state: CorePossessionState): boolean {
  return (
    state === 'CRADLED_STABLE' ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED'
  )
}
