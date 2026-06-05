import type { FormationAIBias } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import type { Point } from '../data/geometry'
import {
  getPlayStyleModifiers,
  type PlayStyleModifiers,
} from './PlayStyleModifiers'

export type AIDecisionContext = {
  player: Player
  players: Player[]
  core: Core
  carrier: Player | null
  ownGoal: Point
  attackGoal: Point
  distanceToCore: number
  isCarrier: boolean
  teammateCarrier: Player | null
  opponentCarrier: Player | null
  formationBias: FormationAIBias
  style: PlayStyleModifiers
}

export function createAIDecisionContext(
  player: Player,
  players: Player[],
  core: Core,
  carrier: Player | null,
  ownGoal: Point,
  attackGoal: Point,
  formationBias: FormationAIBias,
): AIDecisionContext {
  return {
    player,
    players,
    core,
    carrier,
    ownGoal,
    attackGoal,
    distanceToCore: distance(player.position, core.position),
    isCarrier: carrier?.id === player.id,
    teammateCarrier:
      carrier?.teamSide === player.teamSide ? carrier : null,
    opponentCarrier:
      carrier && carrier.teamSide !== player.teamSide ? carrier : null,
    formationBias,
    style: getPlayStyleModifiers(player.role, player.playStyle),
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
