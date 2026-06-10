import Phaser from 'phaser'
import { goalConfigs } from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { keeperZoneRulesConfig } from '../config/keeperZoneRulesConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Player } from '../entities/Player'
import {
  getKeeperHomeDirection,
  getKeeperLegalRadii,
} from '../rules/KeeperGeometry'
import {
  getInnerPlayerBoundaryRadius,
  getOuterPlayerBoundaryRadius,
  type PlayerZoneAccessState,
} from '../rules/KeeperZoneAccess'
import { normalizeSafe } from '../utils/vectorSafety'

export type KeeperLegalState =
  | 'legal'
  | 'outside outer ring'
  | 'inside no-body ring'
  | 'corrected'

export type KeeperZoneAccessState =
  | PlayerZoneAccessState
  | 'blocked own zone'

export class KeeperAreaSystem {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics
  private labels: Phaser.GameObjects.Text[] = []
  private stateLabels = new Map<string, Phaser.GameObjects.Text>()
  private debugEnabled = false
  private active = true
  private legalStates = new Map<string, KeeperLegalState>()
  private lastViolations = new Map<string, KeeperLegalState>()
  private correctionTimers = new Map<string, number>()
  private accessStates = new Map<string, KeeperZoneAccessState>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-5)
    this.createLabels()
    this.draw()
  }

  update(players: Player[], deltaMs: number): void {
    if (!this.active) {
      return
    }

    for (const player of players) {
      this.updateCorrectionTimer(player.id, deltaMs)
      const corrected =
        player.role === 'keeper'
          ? this.constrainKeeperToDonut(player)
          : this.constrainFieldPlayerByZoneAccess(player)

      if (corrected) {
        player.updateVisuals()
      }

      this.updatePlayerStateLabel(player)
    }
  }

  private updatePlayerStateLabel(player: Player): void {
    let label = this.stateLabels.get(player.id)

    if (!label) {
      label = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: '700',
          color: keeperAreaConfig.debug.labelColor,
          backgroundColor: '#16324fcc',
          padding: { x: 4, y: 2 },
        })
        .setDepth(20)
      this.stateLabels.set(player.id, label)
      this.labels.push(label)
    }

    const keeperState = this.getKeeperLegalState(player.id)
    const violation = this.getKeeperLastViolation(player.id)
    const state =
      player.role === 'keeper'
        ? keeperState === 'corrected'
          ? `CORRECTED: ${violation}`
          : keeperState
        : this.getZoneAccessState(player.id)
    label
      .setPosition(player.position.x + 18, player.position.y - 34)
      .setText(state.toUpperCase())
      .setVisible(this.active && this.debugEnabled)
  }

  getKeeperLegalState(playerId: string): KeeperLegalState {
    return this.legalStates.get(playerId) ?? 'legal'
  }

  getKeeperLastViolation(playerId: string): KeeperLegalState {
    return this.lastViolations.get(playerId) ?? 'legal'
  }

  getZoneAccessState(playerId: string): KeeperZoneAccessState {
    return this.accessStates.get(playerId) ?? 'legal'
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    for (const label of this.labels) {
      label.setVisible(this.active && enabled)
    }

    this.draw()
  }

  setActive(active: boolean): void {
    this.active = active

    for (const label of this.labels) {
      label.setVisible(active && this.debugEnabled)
    }

    this.draw()
  }

  private constrainKeeperToDonut(player: Player): boolean {
    const center = keeperAreaConfig.areas[player.teamSide]
    const legal = getKeeperLegalRadii()
    const offset = subtract(player.position, center)
    const length = magnitude(offset)
    const normal = normalized(
      offset,
      getKeeperHomeDirection(player.teamSide),
    )

    if (length > legal.outer) {
      this.accessStates.set(player.id, 'legal own zone')
      this.correctKeeper(player, center, normal, legal.outer, 'outside outer ring')
      return true
    }

    if (length < legal.inner) {
      this.accessStates.set(player.id, 'blocked inner ring')
      this.correctKeeper(player, center, normal, legal.inner, 'inside no-body ring')
      return true
    }

    this.accessStates.set(player.id, 'legal own zone')
    if ((this.correctionTimers.get(player.id) ?? 0) <= 0) {
      this.legalStates.set(player.id, 'legal')
    }
    return false
  }

  private constrainFieldPlayerByZoneAccess(player: Player): boolean {
    for (const side of ['A', 'B'] as const) {
      const center = keeperAreaConfig.areas[side]
      const offset = subtract(player.position, center)
      const length = magnitude(offset)
      const normal = normalized(offset, fallbackDirection(side))

      if (
        side !== player.teamSide &&
        keeperZoneRulesConfig.attackersBlockedFromOpponentKeeperZone &&
        length < getOuterPlayerBoundaryRadius()
      ) {
        this.accessStates.set(player.id, 'blocked opponent zone')
        this.moveBodyToRadius(
          player,
          center,
          normal,
          getOuterPlayerBoundaryRadius(),
          'inside',
        )
        return true
      }

      if (
        keeperZoneRulesConfig.innerRingBlocksAllPlayers &&
        length < getInnerPlayerBoundaryRadius()
      ) {
        this.accessStates.set(player.id, 'blocked inner ring')
        this.moveBodyToRadius(
          player,
          center,
          normal,
          getInnerPlayerBoundaryRadius(),
          'inside',
        )
        return true
      }

      if (side === player.teamSide) {
        if (
          !keeperZoneRulesConfig.defendersAllowedInOwnKeeperZone &&
          length < getOuterPlayerBoundaryRadius()
        ) {
          this.accessStates.set(player.id, 'blocked own zone')
          this.moveBodyToRadius(
            player,
            center,
            normal,
            getOuterPlayerBoundaryRadius(),
            'inside',
          )
          return true
        }

        if (length < keeperAreaConfig.keeperZoneRadius) {
          this.accessStates.set(player.id, 'legal own zone')
          return false
        }
      }

    }

    this.accessStates.set(player.id, 'legal')
    return false
  }

  private correctKeeper(
    player: Player,
    center: Point,
    normal: Point,
    radius: number,
    violation: Exclude<KeeperLegalState, 'legal' | 'corrected'>,
  ): void {
    this.legalStates.set(player.id, violation)
    this.lastViolations.set(player.id, violation)
    this.moveBodyToRadius(
      player,
      center,
      normal,
      radius,
      violation === 'outside outer ring' ? 'outside' : 'inside',
    )
    this.legalStates.set(player.id, 'corrected')
    this.correctionTimers.set(player.id, 260)
  }

  private moveBodyToRadius(
    player: Player,
    center: Point,
    normal: Point,
    radius: number,
    violation: 'inside' | 'outside',
  ): void {
    const target = {
      x: center.x + normal.x * radius,
      y: center.y + normal.y * radius,
    }
    const strength = Phaser.Math.Clamp(
      keeperAreaConfig.keeperZonePushStrength,
      0,
      1,
    )

    this.scene.matter.body.setPosition(player.body, {
      x: target.x,
      y: target.y,
    })

    const radialVelocity = dot(player.velocity, normal)
    const movingFurtherIntoViolation =
      violation === 'outside' ? radialVelocity > 0 : radialVelocity < 0

    if (movingFurtherIntoViolation) {
      this.scene.matter.body.setVelocity(player.body, {
        x:
          player.velocity.x -
          normal.x * radialVelocity * strength,
        y:
          player.velocity.y -
          normal.y * radialVelocity * strength,
      })
    }
  }

  private updateCorrectionTimer(playerId: string, deltaMs: number): void {
    const remaining = Math.max(
      0,
      (this.correctionTimers.get(playerId) ?? 0) - deltaMs,
    )
    this.correctionTimers.set(playerId, remaining)

    if (remaining === 0 && this.legalStates.get(playerId) === 'corrected') {
      this.legalStates.set(playerId, 'legal')
    }
  }

  private createLabels(): void {
    for (const side of ['A', 'B'] as const) {
      const center = keeperAreaConfig.areas[side]
      const verticalDirection = side === 'A' ? -1 : 1
      const sharedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: '700',
        color: keeperAreaConfig.debug.labelColor,
      }

      const keeperLabel = this.scene.add.text(
        center.x + keeperAreaConfig.debug.labelOffsetX,
        center.y +
          verticalDirection *
            (keeperAreaConfig.keeperZoneRadius -
              keeperAreaConfig.debug.labelGap),
        'Keeper Donut',
        sharedStyle,
      )
      const blockedLabel = this.scene.add.text(
        center.x + keeperAreaConfig.debug.labelOffsetX,
        center.y +
          verticalDirection *
            keeperAreaConfig.innerNoBodyRadius,
        'No Body Zone',
        sharedStyle,
      )

      keeperLabel.setDepth(3)
      blockedLabel.setDepth(3)
      keeperLabel.setVisible(false)
      blockedLabel.setVisible(false)
      this.labels.push(keeperLabel, blockedLabel)
    }
  }

  private draw(): void {
    const normal = keeperAreaConfig.normal
    const debug = keeperAreaConfig.debug

    this.graphics.clear()

    if (!this.active) {
      return
    }

    for (const side of ['A', 'B'] as const) {
      const center = keeperAreaConfig.areas[side]

      this.graphics.fillStyle(
        normal.keeperFillColor,
        this.debugEnabled
          ? keeperAreaConfig.keeperZoneDebugAlpha
          : keeperAreaConfig.keeperZoneVisualAlpha,
      )
      this.graphics.fillCircle(
        center.x,
        center.y,
        keeperAreaConfig.keeperZoneRadius,
      )
      this.graphics.fillStyle(
        visualStyleConfig.court.surfaceShade,
        this.debugEnabled ? 0.22 : 0.08,
      )
      this.graphics.fillCircle(
        center.x,
        center.y,
        keeperAreaConfig.innerNoBodyRadius,
      )
      this.graphics.lineStyle(
        this.debugEnabled ? 4 : 2,
        normal.keeperStrokeColor,
        this.debugEnabled ? debug.keeperStrokeAlpha : normal.keeperStrokeAlpha,
      )
      this.graphics.strokeCircle(
        center.x,
        center.y,
        keeperAreaConfig.keeperZoneRadius,
      )

      this.graphics.lineStyle(
        this.debugEnabled ? 4 : 3,
        normal.innerStrokeColor,
        this.debugEnabled ? 0.94 : normal.innerStrokeAlpha,
      )
      this.graphics.strokeCircle(
        center.x,
        center.y,
        keeperAreaConfig.innerNoBodyRadius,
      )

      this.graphics.lineStyle(
        this.debugEnabled ? 3 : 2,
        normal.keeperStrokeColor,
        this.debugEnabled ? 0.82 : 0.42,
      )
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8
        const inner = keeperAreaConfig.keeperZoneRadius - 9
        const outer = keeperAreaConfig.keeperZoneRadius + 9
        this.graphics.lineBetween(
          center.x + Math.cos(angle) * inner,
          center.y + Math.sin(angle) * inner,
          center.x + Math.cos(angle) * outer,
          center.y + Math.sin(angle) * outer,
        )
      }

      if (this.debugEnabled) {
        const goal = goalConfigs.find((candidate) =>
          side === 'A'
            ? candidate.id === 'bottom-goal'
            : candidate.id === 'top-goal',
        )

        if (goal) {
          this.graphics.lineStyle(
            4,
            visualStyleConfig.goal.energy,
            0.9,
          )
          this.graphics.lineBetween(
            goal.x - goal.length / 2,
            goal.y,
            goal.x + goal.length / 2,
            goal.y,
          )
        }
      }
    }
  }
}

function fallbackDirection(side: TeamSide): Point {
  return {
    x: 0,
    y: side === 'A' ? -1 : 1,
  }
}

function subtract(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

function normalized(vector: Point, fallback: Point): Point {
  return normalizeSafe(vector, fallback)
}

function magnitude(vector: Point): number {
  return Math.hypot(vector.x, vector.y)
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
