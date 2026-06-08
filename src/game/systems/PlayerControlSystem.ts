import { aiConfig } from '../config/aiConfig'
import { keeperConfig } from '../config/keeperConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'
import type { ControlledPlayerSelection } from '../lab/LabConfig'

export class PlayerControlSystem {
  private controlledPlayerId: string | null = null
  private switchTimerMs = 0
  private keeperThreatTimerMs = 0
  private keeperControlHoldMs = 0
  private keeperThreatActive = false

  update(
    teamAPlayers: Player[],
    carrierId: string | null,
    corePosition: Point,
    coreVelocity: Point,
    deltaMs: number,
    selection: ControlledPlayerSelection = 'auto',
    allowKeeperSelection = false,
  ): Player {
    this.switchTimerMs -= deltaMs
    this.keeperControlHoldMs = Math.max(
      0,
      this.keeperControlHoldMs - deltaMs,
    )
    const keeperSelectionAllowed =
      allowKeeperSelection ||
      keeperConfig.controlMode === 'manualWhenSelected'
    const explicitlySelected = selectByRole(
      teamAPlayers,
      selection,
      keeperSelectionAllowed,
    )

    if (explicitlySelected) {
      this.keeperThreatTimerMs = 0
      this.setControlled(teamAPlayers, explicitlySelected)
      return explicitlySelected
    }

    const teamCarrier = teamAPlayers.find((player) => player.id === carrierId)
    const fieldCarrier =
      teamCarrier?.role === 'keeper' ? null : teamCarrier
    const keeper = teamAPlayers.find((player) => player.role === 'keeper')
    this.keeperThreatActive = isDirectKeeperThreat(
      corePosition,
      coreVelocity,
    )
    const autoSwitchAllowed =
      selection === 'auto' &&
      keeperConfig.controlMode === 'autoSwitch' &&
      keeperConfig.keeperAutoSwitchEnabled &&
      keeper !== undefined &&
      fieldCarrier === null

    if (autoSwitchAllowed && this.keeperThreatActive) {
      this.keeperThreatTimerMs += deltaMs
    } else {
      this.keeperThreatTimerMs = 0
    }

    if (
      keeper &&
      autoSwitchAllowed &&
      this.keeperThreatTimerMs >= keeperConfig.keeperAutoSwitchDelayMs
    ) {
      this.keeperControlHoldMs =
        keeperConfig.keeperManualOverrideDurationMs
      this.setControlled(teamAPlayers, keeper)
      return keeper
    }

    const current = teamAPlayers.find(
      (player) => player.id === this.controlledPlayerId,
    )

    if (
      current?.role === 'keeper' &&
      keeperConfig.controlMode === 'autoSwitch' &&
      this.keeperControlHoldMs > 0 &&
      !fieldCarrier
    ) {
      return current
    }

    if (fieldCarrier) {
      this.setControlled(teamAPlayers, fieldCarrier)
      return fieldCarrier
    }

    if (current && current.role !== 'keeper' && this.switchTimerMs > 0) {
      return current
    }

    const fieldCandidates = teamAPlayers.filter(
      (player) => player.role !== 'keeper',
    )
    const candidates =
      fieldCandidates.length > 0 ? fieldCandidates : teamAPlayers
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

  isKeeperThreatActive(): boolean {
    return this.keeperThreatActive
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

function selectByRole(
  players: Player[],
  selection: ControlledPlayerSelection,
  allowKeeperSelection: boolean,
): Player | null {
  if (selection === 'auto') {
    return null
  }

  if (selection === 'keeper' && !allowKeeperSelection) {
    return null
  }

  const preferredId =
    selection === 'keeper'
      ? 'a-keeper'
      : selection === 'flex'
        ? 'a-support'
        : 'a-striker'
  const preferred = players.find((player) => player.id === preferredId)

  if (preferred) {
    return preferred
  }

  return selection === 'flex'
    ? players.find(
        (player) => player.role === 'support' || player.role === 'brute',
      ) ?? null
    : players.find((player) => player.role === selection) ?? null
}

function isDirectKeeperThreat(
  corePosition: Point,
  coreVelocity: Point,
): boolean {
  const goal = keeperAreaConfig.areas.A
  const distanceToGoal = distance(corePosition, goal)
  const directionToGoal = {
    x: goal.x - corePosition.x,
    y: goal.y - corePosition.y,
  }
  const length = Math.max(
    0.001,
    Math.hypot(directionToGoal.x, directionToGoal.y),
  )
  const towardGoal =
    (coreVelocity.x * directionToGoal.x +
      coreVelocity.y * directionToGoal.y) /
    length

  return (
    distanceToGoal <= keeperConfig.keeperAutoSwitchThreatRadius &&
    (towardGoal > 0.2 ||
      distanceToGoal <= keeperAreaConfig.keeperZoneRadius)
  )
}
