import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { PlayerRole } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import type { CorePossessionState } from './StickInteractionSystem'

export type FumblePressureSource = 'truck' | 'slash'

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
    phaseMultiplierOverride?: number,
  ): boolean {
    const handling = Phaser.Math.Clamp(
      carrier.attributes.ballHandling,
      0,
      1.6,
    )
    const toughness = Phaser.Math.Clamp(
      carrier.attributes.toughness,
      0,
      1.6,
    )
    const contactResistance =
      source === 'truck'
        ? Phaser.Math.Linear(1.2, 0.7, toughness) *
          Phaser.Math.Linear(1.15, 0.75, handling)
        : Phaser.Math.Linear(1.2, 0.65, handling)
    const phaseMultiplier =
      phaseMultiplierOverride ??
      (coreState === 'CRADLED_OVERCHARGED'
        ? source === 'slash'
          ? defenseConfig.overchargedSlashVulnerability
          : defenseConfig.overchargeFumbleVulnerability *
            defenseConfig.truckOverchargeMultiplier
        : coreState === 'CRADLED_CHARGING'
          ? source === 'slash'
            ? defenseConfig.chargingSlashVulnerability
            : defenseConfig.chargingFumbleResistance
          : source === 'slash'
            ? defenseConfig.stableSlashVulnerability
            : defenseConfig.stableCradleFumbleResistance)
    const roleBonus =
      attackerRole === 'brute' && source === 'truck'
        ? defenseConfig.bruteFumbleBonus
        : attackerRole === 'support' && source === 'slash'
          ? defenseConfig.supportStealBonus
          : 0

    this.pressure = Phaser.Math.Clamp(
      this.pressure +
        amount * phaseMultiplier * contactResistance +
        roleBonus * contactResistance,
      0,
      defenseConfig.fumblePressureThreshold * 1.5,
    )

    return this.pressure >= defenseConfig.fumblePressureThreshold
  }

  addWallPressure(
    amount: number,
    coreState: CorePossessionState,
    carrier: Player,
    overchargeMultiplier: number,
  ): boolean {
    const handling = Phaser.Math.Clamp(
      carrier.attributes.ballHandling,
      0,
      1.6,
    )
    const toughness = Phaser.Math.Clamp(
      carrier.attributes.toughness,
      0,
      1.6,
    )
    const resistance = Phaser.Math.Linear(
      1.16,
      0.62,
      (handling + toughness) / 2,
    )
    const phaseMultiplier =
      coreState === 'CRADLED_OVERCHARGED'
        ? overchargeMultiplier
        : coreState === 'CRADLED_CHARGING'
          ? 1.08
          : 0.86

    this.pressure = Phaser.Math.Clamp(
      this.pressure + amount * resistance * phaseMultiplier,
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
