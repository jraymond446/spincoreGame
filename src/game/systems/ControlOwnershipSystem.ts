import { controlConfig } from '../config/controlConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import type { Point } from '../data/geometry'
import type { KeeperControlMode } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import type { ControlledPlayerSelection } from '../lab/LabConfig'

export type ControlSwitchReason =
  | 'initialSelection'
  | 'explicitManualSwitch'
  | 'selectedInLabConsole'
  | 'currentPlayerInactiveOrInvalid'
  | 'keeperHasPossession'
  | 'keeperReleasedCore'
  | 'optionalAssistSwitch'
  | 'reset'

export type ControlOwnershipDebugState = {
  controlledPlayerId: string | null
  switchReason: ControlSwitchReason
  lastAutoSwitchReason: ControlSwitchReason | null
  controlLockRemainingMs: number
  switchCooldownRemainingMs: number
  keeperHasPossession: boolean
  keeperInputLatched: boolean
  keeperThreatActive: boolean
  mode: KeeperControlMode
}

export class ControlOwnershipSystem {
  private controlledPlayerId: string | null = null
  private previousFieldPlayerId: string | null = null
  private switchReason: ControlSwitchReason = 'initialSelection'
  private lastAutoSwitchReason: ControlSwitchReason | null = null
  private controlLockRemainingMs = 0
  private switchCooldownRemainingMs = 0
  private keeperPossessionElapsedMs = 0
  private keeperReleaseElapsedMs = 0
  private keeperHasPossession = false
  private keeperInputLatched = false
  private keeperThreatActive = false

  update(
    teamPlayers: Player[],
    carrierId: string | null,
    corePosition: Point,
    coreVelocity: Point,
    deltaMs: number,
    selection: ControlledPlayerSelection = 'auto',
  ): Player {
    this.controlLockRemainingMs = Math.max(
      0,
      this.controlLockRemainingMs - deltaMs,
    )
    this.switchCooldownRemainingMs = Math.max(
      0,
      this.switchCooldownRemainingMs - deltaMs,
    )

    const keeper = teamPlayers.find((player) => player.role === 'keeper')
    this.keeperThreatActive = isDirectKeeperThreat(
      corePosition,
      coreVelocity,
    )
    const keeperHasPossession = keeper?.id === carrierId
    this.keeperHasPossession = keeperHasPossession
    this.keeperPossessionElapsedMs = keeperHasPossession
      ? this.keeperPossessionElapsedMs + deltaMs
      : 0

    const explicitSelection = selectByRole(teamPlayers, selection)

    if (explicitSelection) {
      this.keeperReleaseElapsedMs = 0
      this.setControlled(
        teamPlayers,
        explicitSelection,
        'selectedInLabConsole',
        false,
        controlConfig.manualSwitchIgnoresCooldown,
      )
      return explicitSelection
    }

    let current = teamPlayers.find(
      (player) => player.id === this.controlledPlayerId,
    )

    if (!current) {
      const fallback = selectDefaultFieldPlayer(teamPlayers)
      this.setControlled(
        teamPlayers,
        fallback,
        this.controlledPlayerId
          ? 'currentPlayerInactiveOrInvalid'
          : 'initialSelection',
        false,
        true,
      )
      current = fallback
    }

    if (
      keeper &&
      keeperHasPossession &&
      controlConfig.keeperAutoSwitchOnPossession &&
      controlConfig.keeperControlMode === 'keeperOnPossession' &&
      this.keeperPossessionElapsedMs >=
        controlConfig.keeperPossessionSwitchDelayMs &&
      current.id !== keeper.id
    ) {
      this.setControlled(
        teamPlayers,
        keeper,
        'keeperHasPossession',
        true,
        controlConfig.possessionSwitchIgnoresCooldown,
      )
      current = keeper
      this.keeperInputLatched = true
      this.keeperReleaseElapsedMs = 0
    }

    const teamCarrier = teamPlayers.find(
      (player) => player.id === carrierId,
    )

    if (
      controlConfig.keeperControlMode === 'autoNearest' &&
      teamCarrier &&
      teamCarrier.id !== current.id &&
      this.canAutoSwitch()
    ) {
      this.setControlled(
        teamPlayers,
        teamCarrier,
        'optionalAssistSwitch',
        true,
        false,
      )
      current = teamCarrier
    }

    if (
      keeper &&
      controlConfig.keeperAutoSwitchOnThreat &&
      this.keeperThreatActive &&
      current.id !== keeper.id &&
      this.canAutoSwitch()
    ) {
      this.setControlled(
        teamPlayers,
        keeper,
        'optionalAssistSwitch',
        true,
        false,
      )
      current = keeper
      this.keeperReleaseElapsedMs = 0
    }

    if (
      current.role === 'keeper' &&
      !keeperHasPossession &&
      (this.switchReason === 'keeperHasPossession' ||
        (this.switchReason === 'optionalAssistSwitch' &&
          !this.keeperThreatActive))
    ) {
      this.keeperReleaseElapsedMs += deltaMs

      if (
        this.keeperReleaseElapsedMs >=
        controlConfig.keeperReturnToFieldAfterReleaseMs
      ) {
        const returnPlayer =
          teamPlayers.find(
            (player) =>
              player.id === this.previousFieldPlayerId &&
              player.role !== 'keeper',
          ) ?? selectDefaultFieldPlayer(teamPlayers)
        this.setControlled(
          teamPlayers,
          returnPlayer,
          'keeperReleasedCore',
          true,
          true,
        )
        current = returnPlayer
        this.keeperInputLatched = false
        this.keeperReleaseElapsedMs = 0
      }
    } else if (!keeperHasPossession) {
      this.keeperReleaseElapsedMs = 0
    }

    if (
      controlConfig.keeperControlMode === 'autoNearest' &&
      controlConfig.autoSwitchOnLooseBall &&
      carrierId === null &&
      this.canAutoSwitch()
    ) {
      const candidates = teamPlayers.filter(
        (player) =>
          player.role !== 'keeper' ||
          controlConfig.keeperAutoSwitchOnLooseBall,
      )
      const nearest = minByDistance(candidates, corePosition)
      const currentDistance = distance(current.position, corePosition)
      const nearestDistance = distance(nearest.position, corePosition)

      if (
        nearest.id !== current.id &&
        currentDistance - nearestDistance >=
          controlConfig.autoSwitchDistanceAdvantageRequired
      ) {
        this.setControlled(
          teamPlayers,
          nearest,
          'optionalAssistSwitch',
          true,
          false,
        )
        this.switchCooldownRemainingMs = Math.max(
          this.switchCooldownRemainingMs,
          controlConfig.looseBallSwitchCooldownMs,
        )
        current = nearest
      }
    }

    return current
  }

  acknowledgeKeeperPossessionInput(active: boolean): void {
    if (this.keeperInputLatched && active) {
      this.keeperInputLatched = false
    }
  }

  shouldLatchKeeperPossession(): boolean {
    return this.keeperInputLatched && this.keeperHasPossession
  }

  getControlledPlayerId(): string | null {
    return this.controlledPlayerId
  }

  getDebugState(): ControlOwnershipDebugState {
    return {
      controlledPlayerId: this.controlledPlayerId,
      switchReason: this.switchReason,
      lastAutoSwitchReason: this.lastAutoSwitchReason,
      controlLockRemainingMs: this.controlLockRemainingMs,
      switchCooldownRemainingMs: this.switchCooldownRemainingMs,
      keeperHasPossession: this.keeperHasPossession,
      keeperInputLatched: this.keeperInputLatched,
      keeperThreatActive: this.keeperThreatActive,
      mode: controlConfig.keeperControlMode,
    }
  }

  reset(players: Player[]): void {
    this.controlLockRemainingMs = 0
    this.switchCooldownRemainingMs = 0
    this.keeperPossessionElapsedMs = 0
    this.keeperReleaseElapsedMs = 0
    this.keeperHasPossession = false
    this.keeperInputLatched = false
    this.keeperThreatActive = false
    this.switchReason = 'reset'

    const current = players.find(
      (player) => player.id === this.controlledPlayerId,
    )
    const resetTarget =
      current?.role === 'keeper'
        ? players.find(
            (player) =>
              player.id === this.previousFieldPlayerId &&
              player.role !== 'keeper',
          ) ?? selectDefaultFieldPlayer(players)
        : current

    if (resetTarget) {
      this.setControlled(players, resetTarget, 'reset', false, true)
    }
  }

  private canAutoSwitch(): boolean {
    return (
      !controlConfig.preventRapidSwitching ||
      (this.controlLockRemainingMs === 0 &&
        this.switchCooldownRemainingMs === 0)
    )
  }

  private setControlled(
    players: Player[],
    selected: Player,
    reason: ControlSwitchReason,
    automatic: boolean,
    ignoreCooldown: boolean,
  ): void {
    if (selected.id === this.controlledPlayerId) {
      for (const player of players) {
        player.setControlled(player.id === selected.id)
      }
      return
    }

    if (
      !ignoreCooldown &&
      controlConfig.preventRapidSwitching &&
      !this.canAutoSwitch()
    ) {
      return
    }

    if (selected.role !== 'keeper') {
      this.previousFieldPlayerId = selected.id
    }

    this.controlledPlayerId = selected.id
    this.switchReason = reason
    this.controlLockRemainingMs = controlConfig.minControlOwnershipMs
    this.switchCooldownRemainingMs =
      controlConfig.controlSwitchCooldownMs

    if (automatic) {
      this.lastAutoSwitchReason = reason
    }

    for (const player of players) {
      player.setControlled(player.id === selected.id)
    }
  }
}

function selectByRole(
  players: Player[],
  selection: ControlledPlayerSelection,
): Player | null {
  if (selection === 'auto') {
    return null
  }

  if (selection === 'keeper') {
    return players.find((player) => player.role === 'keeper') ?? null
  }

  if (selection === 'flex') {
    return (
      players.find(
        (player) =>
          player.role === 'support' || player.role === 'brute',
      ) ?? null
    )
  }

  return players.find((player) => player.role === selection) ?? null
}

function selectDefaultFieldPlayer(players: Player[]): Player {
  const selected =
    players.find((player) => player.role === 'striker') ??
    players.find((player) => player.role !== 'keeper') ??
    players[0]

  if (!selected) {
    throw new Error('No selectable human-control players')
  }

  return selected
}

function minByDistance(players: Player[], point: Point): Player {
  const first = players[0]

  if (!first) {
    throw new Error('No auto-switch candidates')
  }

  return players.reduce((nearest, player) =>
    distance(player.position, point) <
    distance(nearest.position, point)
      ? player
      : nearest,
  )
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isDirectKeeperThreat(
  corePosition: Point,
  coreVelocity: Point,
): boolean {
  const goal = keeperAreaConfig.areas.A
  const toGoal = {
    x: goal.x - corePosition.x,
    y: goal.y - corePosition.y,
  }
  const distanceToGoal = Math.hypot(toGoal.x, toGoal.y)
  const length = Math.max(0.001, distanceToGoal)
  const towardGoal =
    (coreVelocity.x * toGoal.x + coreVelocity.y * toGoal.y) /
    length

  return (
    distanceToGoal <= keeperAreaConfig.keeperZoneRadius * 1.35 &&
    towardGoal > 0.2
  )
}
