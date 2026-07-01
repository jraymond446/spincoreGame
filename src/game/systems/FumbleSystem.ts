import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { Player } from '../entities/Player'
import type { CorePossessionState } from './StickInteractionSystem'
import {
  calculateFumblePressureGain,
  normalizeCarrierState,
  type FumbleContactType,
  type NormalizedCarrierState,
} from './CarrierVulnerability'

export type FumblePressureSource = 'truck' | 'slash'

export type FumblePressureResult = {
  shouldFumble: boolean
  pressureBefore: number
  pressureAfter: number
  fumbleMultiplier: number
  normalizedCarrierState: NormalizedCarrierState
}

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
    attackScale: number,
    attacker: Player,
    source: FumblePressureSource,
    coreState: CorePossessionState,
    chargeProgress: number,
    carrier: Player,
    releaseCommitted = false,
    phaseMultiplierOverride?: number,
  ): FumblePressureResult {
    const pressureBefore = this.pressure
    const normalizedCarrierState = normalizeCarrierState(
      coreState,
      chargeProgress,
      releaseCommitted,
    )
    const calculation = calculateFumblePressureGain({
      carrierOwnerType: carrier.controllerType,
      attackerOwnerType: attacker.controllerType,
      normalizedCarrierState,
      contactType: sourceToContactType(source),
      carrierHandling: carrier.attributes.ballHandling,
      carrierToughness: carrier.attributes.toughness,
      attackerRole: attacker.role,
      attackScale,
      phaseMultiplierOverride,
    })

    this.pressure = Phaser.Math.Clamp(
      this.pressure + calculation.pressureGain,
      0,
      defenseConfig.fumblePressureThreshold * 1.5,
    )

    return {
      shouldFumble:
        this.pressure >= defenseConfig.fumblePressureThreshold,
      pressureBefore,
      pressureAfter: this.pressure,
      fumbleMultiplier: calculation.fumbleMultiplier,
      normalizedCarrierState,
    }
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

function sourceToContactType(
  source: FumblePressureSource,
): FumbleContactType {
  return source === 'truck' ? 'check' : 'slash'
}

function isCradledState(state: CorePossessionState): boolean {
  return (
    state === 'CRADLED_STABLE' ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED'
  )
}
