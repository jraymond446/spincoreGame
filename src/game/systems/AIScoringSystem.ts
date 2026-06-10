import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'
import type { TeamStrategy } from '../tactics/TeamStrategy'
import {
  AIBankShotSystem,
  type AIShotEvaluation,
} from './AIBankShotSystem'

export type ScoringChanceAction =
  | 'directShot'
  | 'bankShot'
  | 'pass'
  | 'noShotFound'

export type ScoringChance = {
  directShotScore: number
  bankShotScore: number
  passShotScore: number
  bestAction: ScoringChanceAction
  bestTarget: Point | null
  shotEvaluation: AIShotEvaluation
}

export class AIScoringSystem {
  private readonly bankShots = new AIBankShotSystem()

  evaluate(
    shooter: Player,
    players: Player[],
    strategy: TeamStrategy,
    passShotScore: number,
    passTarget: Point | null,
  ): ScoringChance {
    const shotEvaluation = this.bankShots.evaluate(
      shooter,
      players,
      strategy,
    )
    const bankShotScore = shotEvaluation.bestBank?.score ?? 0
    const choices: Array<{
      action: ScoringChanceAction
      score: number
      target: Point | null
    }> = [
      {
        action: 'directShot',
        score: shotEvaluation.directScore,
        target: shotEvaluation.directTarget,
      },
      {
        action: 'bankShot',
        score: bankShotScore,
        target: shotEvaluation.bestBank?.reflectionPoint ?? null,
      },
      {
        action: 'pass',
        score: passShotScore,
        target: passTarget,
      },
    ]
    const best = choices.sort((a, b) => b.score - a.score)[0]

    return {
      directShotScore: shotEvaluation.directScore,
      bankShotScore,
      passShotScore,
      bestAction:
        best && best.score > 0 ? best.action : 'noShotFound',
      bestTarget: best?.target ?? null,
      shotEvaluation,
    }
  }
}
