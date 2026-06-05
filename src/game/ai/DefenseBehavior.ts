import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { AIDecisionContext } from './AIDecisionContext'

export type AIDefenseDecision = {
  bodyCheck: boolean
  stickSwipe: boolean
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
    const canCheck =
      carrierDistance <=
      defenseConfig.bodyCheckRange *
        reactionRange *
        Phaser.Math.Linear(
          0.82,
          1.15,
          tendencies.bodyCheckAggression,
        )
    const canSwipe =
      carrierDistance <=
      defenseConfig.stickSwipeRange *
        reactionRange *
        Phaser.Math.Linear(
          0.84,
          1.12,
          tendencies.stickSwipeAggression,
        )
    const bruteCheck =
      player.role === 'brute' &&
      tendencies.bodyCheckAggression >= 0.35 &&
      canCheck
    const aggressiveFieldCheck =
      (player.playStyle === 'aggressive' ||
        player.playStyle === 'disruptive') &&
      tendencies.bodyCheckAggression >= 0.72 &&
      canCheck

    if (bruteCheck || aggressiveFieldCheck) {
      return {
        bodyCheck: true,
        stickSwipe: false,
      }
    }

    return {
      bodyCheck: false,
      stickSwipe:
        canSwipe && tendencies.stickSwipeAggression >= 0.28,
    }
  }

  const freeCoreSwipe =
    context.carrier === null &&
    context.distanceToCore <=
      defenseConfig.stickSwipeRange * reactionRange &&
    tendencies.stickSwipeAggression >= 0.72 &&
    player.attributes.control < 0.72

  return {
    bodyCheck: false,
    stickSwipe: freeCoreSwipe,
  }
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
