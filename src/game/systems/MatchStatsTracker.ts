import type { TeamSide } from '../data/matchTypes'
import type { Player } from '../entities/Player'

export type MatchStatLine = {
  assists: number
  checks: number
  saves: number
}

export type MatchStats = Record<TeamSide, MatchStatLine>

export class MatchStatsTracker {
  private stats: MatchStats = createEmptyStats()
  private lastObservedCarrierId: string | null = null
  private lastCarrierByTeam: Record<TeamSide, string | null> = {
    A: null,
    B: null,
  }
  private previousCarrierByTeam: Record<TeamSide, string | null> = {
    A: null,
    B: null,
  }

  observeCarrier(carrierId: string | null, players: Player[]): boolean {
    if (carrierId === this.lastObservedCarrierId) {
      return false
    }

    this.lastObservedCarrierId = carrierId

    if (!carrierId) {
      return false
    }

    const carrier = players.find((player) => player.id === carrierId)

    if (!carrier) {
      return false
    }

    const opposingSide: TeamSide = carrier.teamSide === 'A' ? 'B' : 'A'
    const previousTeamCarrier = this.lastCarrierByTeam[carrier.teamSide]

    this.lastCarrierByTeam[opposingSide] = null
    this.previousCarrierByTeam[opposingSide] = null

    if (previousTeamCarrier !== carrier.id) {
      this.previousCarrierByTeam[carrier.teamSide] = previousTeamCarrier
      this.lastCarrierByTeam[carrier.teamSide] = carrier.id
    }

    if (carrier.role === 'keeper') {
      this.stats[carrier.teamSide].saves += 1
      return true
    }

    return false
  }

  recordCheck(side: TeamSide): void {
    this.stats[side].checks += 1
  }

  recordGoal(side: TeamSide): void {
    const lastCarrier = this.lastCarrierByTeam[side]
    const previousCarrier = this.previousCarrierByTeam[side]

    if (
      lastCarrier &&
      previousCarrier &&
      lastCarrier !== previousCarrier
    ) {
      this.stats[side].assists += 1
    }

    this.clearPossessionChain()
  }

  reset(): void {
    this.stats = createEmptyStats()
    this.clearPossessionChain()
  }

  clearPossession(): void {
    this.clearPossessionChain()
  }

  getSnapshot(): MatchStats {
    return {
      A: { ...this.stats.A },
      B: { ...this.stats.B },
    }
  }

  private clearPossessionChain(): void {
    this.lastObservedCarrierId = null
    this.lastCarrierByTeam = { A: null, B: null }
    this.previousCarrierByTeam = { A: null, B: null }
  }
}

function createEmptyStats(): MatchStats {
  return {
    A: {
      assists: 0,
      checks: 0,
      saves: 0,
    },
    B: {
      assists: 0,
      checks: 0,
      saves: 0,
    },
  }
}
