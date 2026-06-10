import { aiOffenseConfig } from '../config/aiOffenseConfig'
import type {
  FormationAIBias,
  TeamTacticalQuality,
} from '../data/matchTypes'
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
  tacticalQuality: TeamTacticalQuality
  scoringAggression: number
  pressure: number
}

export function createAIDecisionContext(
  player: Player,
  players: Player[],
  core: Core,
  carrier: Player | null,
  ownGoal: Point,
  attackGoal: Point,
  formationBias: FormationAIBias,
  tacticalQuality: TeamTacticalQuality,
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
    tacticalQuality,
    scoringAggression:
      player.teamSide === 'B'
        ? aiOffenseConfig.opponentAiScoringAggression
        : 0.55,
    pressure: getOpponentPressure(player, players),
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getOpponentPressure(player: Player, players: Player[]): number {
  const opponents = players.filter(
    (candidate) => candidate.teamSide !== player.teamSide,
  )
  const nearest =
    opponents.length === 0
      ? Infinity
      : Math.min(
          ...opponents.map((opponent) =>
            distance(opponent.position, player.position),
          ),
        )

  return 1 - Math.min(1, Math.max(0, nearest / 220))
}
