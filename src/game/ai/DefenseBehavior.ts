import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { AIDecisionContext } from './AIDecisionContext'

export type AIDefenseDecision = {
  truck: boolean
  slash: boolean
}

export function decideDefenseActions(
  context: AIDecisionContext,
): AIDefenseDecision {
  const { player, opponentCarrier } = context
  const tendencies = player.defenseTendencies
  const reactionRange = Phaser.Math.Linear(
    0.86,
    1.12,
    player.attributes.reaction,
  )

  if (opponentCarrier) {
    const carrierDistance = distance(
      player.position,
      opponentCarrier.position,
    )
    const canTruck =
      carrierDistance <=
      defenseConfig.truckRange *
        reactionRange *
        Phaser.Math.Linear(
          0.82,
          1.15,
          tendencies.truckAggression,
        )
    const canSlash =
      carrierDistance <=
      defenseConfig.slashRange *
        reactionRange *
        Phaser.Math.Linear(
          0.84,
          1.12,
          tendencies.slashAggression,
        )
    const bruteTruck =
      player.role === 'brute' &&
      tendencies.truckAggression >= 0.35 &&
      canTruck
    const aggressiveFieldTruck =
      (player.playStyle === 'aggressive' ||
        player.playStyle === 'disruptive') &&
      tendencies.truckAggression >= 0.72 &&
      canTruck

    if (bruteTruck || aggressiveFieldTruck) {
      return {
        truck: true,
        slash: false,
      }
    }

    return {
      truck: false,
      slash:
        canSlash && tendencies.slashAggression >= 0.28,
    }
  }

  const freeCoreSlash =
    context.carrier === null &&
    context.distanceToCore <=
      defenseConfig.slashRange * reactionRange &&
    tendencies.slashAggression >= 0.72 &&
    player.attributes.control < 0.72
  const strikerPositioningTruck =
    defenseConfig.truckOffBallSpeedBoostAllowed &&
    player.role === 'striker' &&
    context.carrier === null &&
    context.distanceToCore >= defenseConfig.truckRange * 1.8 &&
    context.distanceToCore <= defenseConfig.truckRange * 5 &&
    tendencies.truckAggression >= 0.24

  return {
    truck: strikerPositioningTruck,
    slash: freeCoreSlash,
  }
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
