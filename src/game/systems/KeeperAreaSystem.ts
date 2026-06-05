import Phaser from 'phaser'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Player } from '../entities/Player'

export class KeeperAreaSystem {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics
  private labels: Phaser.GameObjects.Text[] = []
  private debugEnabled = false
  private active = true

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(-5)
    this.createLabels()
    this.draw()
  }

  update(players: Player[]): void {
    if (!this.active) {
      return
    }

    for (const player of players) {
      let corrected = false

      if (player.role === 'keeper') {
        corrected = this.constrainInsideKeeperArea(player) || corrected
      }

      corrected = this.constrainOutsideNoBodyZones(player) || corrected

      if (corrected) {
        player.updateVisuals()
      }
    }
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

  private constrainInsideKeeperArea(player: Player): boolean {
    const center = keeperAreaConfig.areas[player.teamSide]
    const maximumDistance =
      keeperAreaConfig.outerRadius -
      playerRuntimeConfig.radius -
      keeperAreaConfig.bodyPadding
    const offset = subtract(player.position, center)
    const length = magnitude(offset)

    if (length <= maximumDistance) {
      return false
    }

    const normal = normalized(offset, fallbackDirection(player.teamSide))
    this.moveBodyToRadius(player, center, normal, maximumDistance, 'outside')
    return true
  }

  private constrainOutsideNoBodyZones(player: Player): boolean {
    const minimumDistance =
      keeperAreaConfig.noBodyRadius +
      playerRuntimeConfig.radius +
      keeperAreaConfig.bodyPadding

    for (const side of ['A', 'B'] as const) {
      const center = keeperAreaConfig.areas[side]
      const offset = subtract(player.position, center)
      const length = magnitude(offset)

      if (length >= minimumDistance) {
        continue
      }

      const normal = normalized(offset, fallbackDirection(side))
      this.moveBodyToRadius(player, center, normal, minimumDistance, 'inside')
      return true
    }

    return false
  }

  private moveBodyToRadius(
    player: Player,
    center: Point,
    normal: Point,
    radius: number,
    violation: 'inside' | 'outside',
  ): void {
    this.scene.matter.body.setPosition(player.body, {
      x: center.x + normal.x * radius,
      y: center.y + normal.y * radius,
    })

    const radialVelocity = dot(player.velocity, normal)
    const movingFurtherIntoViolation =
      violation === 'outside' ? radialVelocity > 0 : radialVelocity < 0

    if (movingFurtherIntoViolation) {
      this.scene.matter.body.setVelocity(player.body, {
        x: player.velocity.x - normal.x * radialVelocity,
        y: player.velocity.y - normal.y * radialVelocity,
      })
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
        center.y + verticalDirection * keeperAreaConfig.outerRadius,
        'Keeper Area',
        sharedStyle,
      )
      const noBodyLabel = this.scene.add.text(
        center.x + keeperAreaConfig.debug.labelOffsetX,
        center.y + verticalDirection * keeperAreaConfig.noBodyRadius,
        'No Body Zone',
        sharedStyle,
      )

      keeperLabel.setDepth(3)
      noBodyLabel.setDepth(3)
      keeperLabel.setVisible(false)
      noBodyLabel.setVisible(false)
      this.labels.push(keeperLabel, noBodyLabel)
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
        this.debugEnabled ? debug.keeperFillAlpha : normal.keeperFillAlpha,
      )
      this.graphics.fillCircle(center.x, center.y, keeperAreaConfig.outerRadius)
      this.graphics.lineStyle(
        this.debugEnabled ? 4 : 2,
        normal.keeperStrokeColor,
        this.debugEnabled ? debug.keeperStrokeAlpha : normal.keeperStrokeAlpha,
      )
      this.graphics.strokeCircle(center.x, center.y, keeperAreaConfig.outerRadius)

      this.graphics.fillStyle(
        normal.noBodyFillColor,
        this.debugEnabled ? debug.noBodyFillAlpha : normal.noBodyFillAlpha,
      )
      this.graphics.fillCircle(center.x, center.y, keeperAreaConfig.noBodyRadius)
      this.graphics.lineStyle(
        this.debugEnabled ? 4 : 2,
        normal.noBodyStrokeColor,
        this.debugEnabled ? debug.noBodyStrokeAlpha : normal.noBodyStrokeAlpha,
      )
      this.graphics.strokeCircle(center.x, center.y, keeperAreaConfig.noBodyRadius)
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
  const length = magnitude(vector)

  if (length === 0) {
    return fallback
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

function magnitude(vector: Point): number {
  return Math.hypot(vector.x, vector.y)
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
