import { aiConfig } from '../config/aiConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'

export class PlayerControlSystem {
  private controlledPlayerId: string | null = null
  private switchTimerMs = 0

  update(
    teamAPlayers: Player[],
    carrierId: string | null,
    corePosition: Point,
    deltaMs: number,
  ): Player {
    this.switchTimerMs -= deltaMs
    const teamCarrier = teamAPlayers.find((player) => player.id === carrierId)

    if (teamCarrier) {
      this.setControlled(teamAPlayers, teamCarrier)
      return teamCarrier
    }

    const current = teamAPlayers.find((player) => player.id === this.controlledPlayerId)

    if (current && current.role !== 'keeper' && this.switchTimerMs > 0) {
      return current
    }

    const candidates = teamAPlayers.filter((player) => player.role !== 'keeper')
    const nearest = minByDistance(candidates, corePosition)
    const striker = candidates.find((player) => player.role === 'striker')
    const selected =
      striker &&
      distance(striker.position, corePosition) <=
        distance(nearest.position, corePosition) + aiConfig.humanPreferStrikerDistance
        ? striker
        : nearest

    this.setControlled(teamAPlayers, selected)
    this.switchTimerMs = aiConfig.humanSwitchIntervalMs
    return selected
  }

  getControlledPlayerId(): string | null {
    return this.controlledPlayerId
  }

  private setControlled(players: Player[], selected: Player): void {
    this.controlledPlayerId = selected.id

    for (const player of players) {
      player.setControlled(player.id === selected.id)
    }
  }
}

function minByDistance(players: Player[], point: Point): Player {
  if (players.length === 0) {
    throw new Error('No selectable human-control players')
  }

  return players.reduce((nearest, player) =>
    distance(player.position, point) < distance(nearest.position, point) ? player : nearest,
  )
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
