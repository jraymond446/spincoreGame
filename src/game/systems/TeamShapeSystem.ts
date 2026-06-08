import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { spacingConfig } from '../config/spacingConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'

export type TeamShapeRole =
  | 'presser'
  | 'outlet'
  | 'cover'
  | 'behindGoalCut'
  | 'frontSlot'
  | 'keeper'

export type TeamShapeAssignment = {
  role: TeamShapeRole
  target: Point
}

type PresserState = {
  playerId: string | null
  cooldownMs: number
}

export class TeamShapeSystem {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels = new Map<string, Phaser.GameObjects.Text>()
  private readonly assignments = new Map<string, TeamShapeAssignment>()
  private readonly pressers: Record<TeamSide, PresserState> = {
    A: { playerId: null, cooldownMs: 0 },
    B: { playerId: null, cooldownMs: 0 },
  }
  private debugEnabled = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(18)
  }

  update(
    players: Player[],
    core: Core,
    carrierId: string | null,
    controlledPlayerId: string,
    deltaMs: number,
  ): void {
    const carrier =
      players.find((player) => player.id === carrierId) ?? null

    for (const side of ['A', 'B'] as const) {
      this.pressers[side].cooldownMs = Math.max(
        0,
        this.pressers[side].cooldownMs - deltaMs,
      )
      this.assignTeam(
        side,
        players,
        core,
        carrier,
        controlledPlayerId,
      )
    }

    this.drawDebug(players)
  }

  getAssignment(playerId: string): TeamShapeAssignment | null {
    const assignment = this.assignments.get(playerId)

    return assignment
      ? {
          role: assignment.role,
          target: { ...assignment.target },
        }
      : null
  }

  getActivePresser(side: TeamSide): string | null {
    return this.pressers[side].playerId
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    this.graphics.setVisible(enabled)

    for (const label of this.labels.values()) {
      label.setVisible(enabled)
    }

    if (!enabled) {
      this.graphics.clear()
    }
  }

  reset(): void {
    this.assignments.clear()
    this.pressers.A = { playerId: null, cooldownMs: 0 }
    this.pressers.B = { playerId: null, cooldownMs: 0 }
  }

  private assignTeam(
    side: TeamSide,
    players: Player[],
    core: Core,
    carrier: Player | null,
    controlledPlayerId: string,
  ): void {
    const teammates = players.filter((player) => player.teamSide === side)
    const fieldPlayers = teammates.filter((player) => player.role !== 'keeper')
    const teamCarrier =
      carrier?.teamSide === side ? carrier : null
    const opponentCarrier =
      carrier && carrier.teamSide !== side ? carrier : null
    const pressurePoint = opponentCarrier?.position ?? core.position
    let presser: Player | null

    if (teamCarrier) {
      presser = teamCarrier.role === 'keeper' ? null : teamCarrier
      if (presser && this.pressers[side].playerId !== presser.id) {
        this.setPresser(side, presser.id)
      } else if (!presser) {
        this.pressers[side].playerId = null
      }
    } else {
      presser = this.selectPresser(
        side,
        fieldPlayers,
        pressurePoint,
        controlledPlayerId,
      )
    }

    for (const player of teammates) {
      if (player.role === 'keeper') {
        this.assignments.set(player.id, {
          role: 'keeper',
          target: { ...player.position },
        })
        continue
      }

      if (player.id === presser?.id) {
        this.assignments.set(player.id, {
          role: 'presser',
          target: { ...pressurePoint },
        })
        continue
      }

      const role = this.chooseSupportRole(player, teamCarrier, core)
      const target = this.applySpacing(
        this.getRoleTarget(role, player, teamCarrier, core),
        player,
        teammates,
      )
      this.assignments.set(player.id, { role, target })
    }
  }

  private selectPresser(
    side: TeamSide,
    players: Player[],
    target: Point,
    controlledPlayerId: string,
  ): Player | null {
    if (spacingConfig.maxCorePressersPerTeam <= 0 || players.length === 0) {
      this.pressers[side].playerId = null
      return null
    }

    const sorted = [...players].sort(
      (a, b) => distance(a.position, target) - distance(b.position, target),
    )
    const current = players.find(
      (player) => player.id === this.pressers[side].playerId,
    )
    const controlled = players.find(
      (player) => player.id === controlledPlayerId,
    )
    const preferred = controlled ?? sorted[0]

    if (!current) {
      this.setPresser(side, preferred.id)
      return preferred
    }

    if (this.pressers[side].cooldownMs > 0) {
      return current
    }

    const challenger = sorted[0]
    const advantage =
      distance(current.position, target) -
      distance(challenger.position, target)

    if (
      challenger.id !== current.id &&
      advantage >= spacingConfig.presserDistanceAdvantageRequired
    ) {
      this.setPresser(side, challenger.id)
      return challenger
    }

    if (
      controlled &&
      current.id !== controlled.id &&
      distance(controlled.position, target) <=
        distance(current.position, target) +
          spacingConfig.presserDistanceAdvantageRequired
    ) {
      this.setPresser(side, controlled.id)
      return controlled
    }

    return current
  }

  private setPresser(side: TeamSide, playerId: string): void {
    this.pressers[side] = {
      playerId,
      cooldownMs: spacingConfig.presserSwitchCooldownMs,
    }
  }

  private chooseSupportRole(
    player: Player,
    teamCarrier: Player | null,
    core: Core,
  ): TeamShapeRole {
    if (!teamCarrier) {
      return player.role === 'brute' ? 'cover' : 'outlet'
    }

    const attackGoal = keeperAreaConfig.areas[
      player.teamSide === 'A' ? 'B' : 'A'
    ]
    const nearAttackEnd =
      distance(teamCarrier.position, attackGoal) <=
      keeperAreaConfig.keeperZoneRadius * 2.35
    const cutChance =
      player.role === 'support'
        ? spacingConfig.behindGoalCutChanceSupport
        : spacingConfig.behindGoalCutChanceStriker
    const wantsBehindGoal =
      spacingConfig.enableBehindGoalCuts &&
      nearAttackEnd &&
      stableChance(player.id, core.position) < cutChance

    if (wantsBehindGoal) {
      return 'behindGoalCut'
    }

    if (
      nearAttackEnd &&
      (player.role === 'striker' || teamCarrier.role === 'support')
    ) {
      return 'frontSlot'
    }

    return player.role === 'brute' ? 'cover' : 'outlet'
  }

  private getRoleTarget(
    role: TeamShapeRole,
    player: Player,
    carrier: Player | null,
    core: Core,
  ): Point {
    const attackDirection = {
      x: 0,
      y: player.teamSide === 'A' ? -1 : 1,
    }
    const right = { x: -attackDirection.y, y: attackDirection.x }
    const ownGoal = keeperAreaConfig.areas[player.teamSide]
    const attackGoal = keeperAreaConfig.areas[
      player.teamSide === 'A' ? 'B' : 'A'
    ]
    const laneSign = stableChance(`${player.id}:lane`, core.position) < 0.5
      ? -1
      : 1

    if (role === 'behindGoalCut') {
      const radialDistance =
        keeperAreaConfig.keeperZoneRadius +
        playerRuntimeConfig.radius +
        keeperAreaConfig.keeperZoneBoundaryBuffer +
        12
      const depth = Math.min(
        spacingConfig.behindGoalSpacing,
        radialDistance * 0.55,
      )
      const lateral = Math.sqrt(
        Math.max(0, radialDistance * radialDistance - depth * depth),
      )

      return this.clampToArena({
        x:
          attackGoal.x +
          right.x * lateral * laneSign +
          attackDirection.x * depth,
        y:
          attackGoal.y +
          right.y * lateral * laneSign +
          attackDirection.y * depth,
      })
    }

    if (role === 'frontSlot') {
      const slotDistance =
        keeperAreaConfig.keeperZoneRadius +
        spacingConfig.frontSlotSpacing * 0.35

      return this.clampToArena({
        x: attackGoal.x + right.x * spacingConfig.frontSlotSpacing * 0.36 * laneSign,
        y: attackGoal.y - attackDirection.y * slotDistance,
      })
    }

    if (role === 'cover') {
      const threat = carrier?.position ?? core.position

      return this.clampToArena({
        x: Phaser.Math.Linear(ownGoal.x, threat.x, 0.48),
        y: Phaser.Math.Linear(ownGoal.y, threat.y, 0.48),
      })
    }

    const anchor = carrier?.position ?? core.position
    return this.clampToArena({
      x:
        anchor.x +
        right.x * spacingConfig.supportPreferredSpacing * laneSign,
      y:
        anchor.y -
        attackDirection.y *
          Math.max(
            spacingConfig.supportMinSpacingFromCarrier,
            spacingConfig.supportPreferredSpacing * 0.42,
          ),
    })
  }

  private applySpacing(
    target: Point,
    player: Player,
    teammates: Player[],
  ): Point {
    let adjusted = { ...target }

    for (const teammate of teammates) {
      if (teammate.id === player.id) {
        continue
      }

      const separation = distance(adjusted, teammate.position)

      if (separation >= spacingConfig.avoidClusterRadius) {
        continue
      }

      const away = normalized(
        subtract(adjusted, teammate.position),
        player.teamSide === 'A' ? { x: 1, y: 0 } : { x: -1, y: 0 },
      )
      const strength =
        (1 - separation / spacingConfig.avoidClusterRadius) *
        spacingConfig.avoidClusterRadius *
        spacingConfig.teammateRepulsionStrength
      adjusted = {
        x: adjusted.x + away.x * strength,
        y: adjusted.y + away.y * strength,
      }
    }

    return this.clampToArena(adjusted)
  }

  private clampToArena(point: Point): Point {
    const padding =
      arenaConfig.wallThickness / 2 + playerRuntimeConfig.radius + 8
    const left = arenaConfig.center.x - arenaConfig.width / 2 + padding
    const right = arenaConfig.center.x + arenaConfig.width / 2 - padding
    const top = arenaConfig.center.y - arenaConfig.height / 2 + padding
    const bottom = arenaConfig.center.y + arenaConfig.height / 2 - padding

    return {
      x: Phaser.Math.Clamp(point.x, left, right),
      y: Phaser.Math.Clamp(point.y, top, bottom),
    }
  }

  private drawDebug(players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    this.graphics.clear()
    const visibleIds = new Set<string>()

    for (const player of players) {
      const assignment = this.assignments.get(player.id)

      if (!assignment || assignment.role === 'keeper') {
        continue
      }

      visibleIds.add(player.id)
      const color = roleColor(assignment.role)
      this.graphics.lineStyle(2, color, 0.55)
      this.graphics.lineBetween(
        player.position.x,
        player.position.y,
        assignment.target.x,
        assignment.target.y,
      )
      this.graphics.lineStyle(3, color, 0.9)
      this.graphics.strokeCircle(
        assignment.target.x,
        assignment.target.y,
        spacingConfig.debug.targetRadius,
      )
      this.getLabel(player.id)
        .setPosition(player.position.x + 18, player.position.y - 28)
        .setText(assignment.role)
        .setVisible(true)
    }

    for (const [playerId, label] of this.labels) {
      if (!visibleIds.has(playerId)) {
        label.setVisible(false)
      }
    }
  }

  private getLabel(playerId: string): Phaser.GameObjects.Text {
    const existing = this.labels.get(playerId)

    if (existing) {
      return existing
    }

    const label = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: '#10243dcc',
        padding: { x: 4, y: 2 },
      })
      .setDepth(20)
      .setVisible(this.debugEnabled)

    this.labels.set(playerId, label)
    return label
  }
}

function roleColor(role: TeamShapeRole): number {
  switch (role) {
    case 'presser':
      return spacingConfig.debug.presserColor
    case 'outlet':
      return spacingConfig.debug.outletColor
    case 'cover':
      return spacingConfig.debug.coverColor
    case 'behindGoalCut':
      return spacingConfig.debug.behindGoalColor
    case 'frontSlot':
      return spacingConfig.debug.frontSlotColor
    default:
      return 0xffffff
  }
}

function stableChance(seed: string, point: Point): number {
  let hash = 2166136261
  const value = `${seed}:${Math.round(point.x / 90)}:${Math.round(point.y / 90)}`

  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967295
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function normalized(vector: Point, fallback: Point): Point {
  const length = Math.hypot(vector.x, vector.y)

  return length === 0
    ? { ...fallback }
    : { x: vector.x / length, y: vector.y / length }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
