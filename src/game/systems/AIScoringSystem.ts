import {
  getAiPassError,
  getAiShotSelectionBonus,
  type AIAssistContext,
} from '../ai/AIAssist'
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
    assistContext: AIAssistContext,
  ): ScoringChance {
    const baseEvaluation = this.bankShots.evaluate(
      shooter,
      players,
      strategy,
    )
    const selectionBonus = getAiShotSelectionBonus(
      shooter,
      assistContext,
    )
    const adjustedCandidates = baseEvaluation.bankCandidates.map(
      (candidate) => ({
        ...candidate,
        score: clamp01(candidate.score + selectionBonus * 0.72),
      }),
    )
    const shotEvaluation: AIShotEvaluation = {
      directTarget: baseEvaluation.directTarget,
      directScore: clamp01(
        baseEvaluation.directScore + selectionBonus,
      ),
      bankCandidates: adjustedCandidates,
      bestBank:
        adjustedCandidates
          .filter((candidate) => candidate.valid)
          .sort((a, b) => b.score - a.score)[0] ?? null,
    }
    const bankShotScore = shotEvaluation.bestBank?.score ?? 0
    const adjustedPassScore = clamp01(
      passShotScore +
        selectionBonus * 0.25 +
        (0.18 - getAiPassError(shooter, assistContext)) * 0.22,
    )
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
        score: adjustedPassScore,
        target: passTarget,
      },
    ]
    const best = choices.sort((a, b) => b.score - a.score)[0]

    return {
      directShotScore: shotEvaluation.directScore,
      bankShotScore,
      passShotScore: adjustedPassScore,
      bestAction:
        best && best.score > 0 ? best.action : 'noShotFound',
      bestTarget: best?.target ?? null,
      shotEvaluation,
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
