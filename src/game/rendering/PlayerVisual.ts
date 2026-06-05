import Phaser from 'phaser'
import type { HairStyle } from '../data/hairStyles'
import { hairStyles } from '../data/hairStyles'
import type { PlayerVisualProfile } from '../data/playerVisualProfiles'
import {
  roleAccentColors,
  teamVisualPalettes,
  type TeamVisualPalette,
} from '../data/visualPalettes'
import { visualConfig } from '../config/visualConfig'
import type {
  PlayerControllerType,
  PlayerRole,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { StickCurve } from '../entities/Player'
import { StickVisual } from './StickVisual'

type Point = { x: number; y: number }

export type PlayerVisualUpdate = {
  position: Point
  velocity: Point
  facingRotation: number
  stickCurve: StickCurve
  stickForward: Point
  stickRight: Point
  cradleSocket: Point
  stickState: StickActionState
}

type PlayerVisualOptions = {
  id: string
  role: PlayerRole
  controllerType: PlayerControllerType
  teamSide: TeamSide
  profile: PlayerVisualProfile
}

export class PlayerVisual {
  private readonly scene: Phaser.Scene
  private readonly options: PlayerVisualOptions
  private readonly shadow: Phaser.GameObjects.Graphics
  private readonly character: Phaser.GameObjects.Graphics
  private readonly controlledIndicator: Phaser.GameObjects.Graphics
  private readonly roleLabel: Phaser.GameObjects.Text
  private readonly aiStateLabel: Phaser.GameObjects.Text
  private readonly stick: StickVisual
  private readonly palette: TeamVisualPalette
  private readonly hairStyle: HairStyle
  private readonly animationPhase: number
  private controlled = false
  private debugVisible = false
  private aiState = 'IDLE'

  constructor(scene: Phaser.Scene, options: PlayerVisualOptions) {
    this.scene = scene
    this.options = options
    this.palette = teamVisualPalettes[options.teamSide]
    this.hairStyle = hairStyles[options.profile.hairStyle]
    this.animationPhase = this.hash(options.id) * 0.01

    this.shadow = scene.add.graphics().setDepth(3)
    this.stick = new StickVisual(scene, options.profile.stickStyle)
    this.character = scene.add.graphics().setDepth(6)
    this.controlledIndicator = scene.add.graphics().setDepth(8)
    this.roleLabel = scene.add
      .text(0, 0, this.getRoleLabel(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${visualConfig.label.roleFontSize}px`,
        color: '#ffffff',
        backgroundColor: '#071016cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false)
    this.aiStateLabel = scene.add
      .text(0, 0, this.aiState, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${visualConfig.label.aiFontSize}px`,
        color: '#d8f5ff',
        backgroundColor: '#071016b8',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false)
  }

  update(data: PlayerVisualUpdate): void {
    const speed = Math.hypot(data.velocity.x, data.velocity.y)
    const movementFactor = Phaser.Math.Clamp(speed / 9, 0, 1)
    const bobAmplitude = Phaser.Math.Linear(
      visualConfig.idleBobAmplitude,
      visualConfig.movementBobAmplitude,
      movementFactor,
    )
    const bob =
      Math.sin(
        this.scene.time.now * visualConfig.idleBobSpeed + this.animationPhase,
      ) * bobAmplitude
    const forward = {
      x: Math.cos(data.facingRotation),
      y: Math.sin(data.facingRotation),
    }
    const right = { x: -forward.y, y: forward.x }
    const visualPosition = {
      x: data.position.x,
      y: data.position.y + bob,
    }

    this.drawShadow(data.position, speed)
    this.drawControlledIndicator(data.position)
    this.drawCharacter(visualPosition, forward, right)
    this.stick.update(
      data.stickCurve,
      data.stickForward,
      data.stickRight,
      data.cradleSocket,
      data.stickState,
    )

    this.roleLabel.setPosition(
      data.position.x,
      data.position.y - visualConfig.label.roleOffsetY,
    )
    this.aiStateLabel.setPosition(
      data.position.x,
      data.position.y + visualConfig.label.aiOffsetY,
    )
  }

  setControlled(controlled: boolean): void {
    this.controlled = controlled
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible
    this.roleLabel.setVisible(visible)
    this.aiStateLabel.setVisible(
      visible && this.options.controllerType === 'ai',
    )
  }

  setAIState(state: string): void {
    this.aiState = state
    this.aiStateLabel.setText(state)
    this.aiStateLabel.setVisible(
      this.debugVisible && this.options.controllerType === 'ai',
    )
  }

  private drawShadow(position: Point, speed: number): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale
    const stretch = Phaser.Math.Clamp(speed * 0.7, 0, 10)
    this.shadow.clear()
    this.shadow.fillStyle(visualConfig.shadowColor, visualConfig.shadowAlpha)
    this.shadow.fillEllipse(
      position.x,
      position.y + visualConfig.shadowOffsetY,
      (visualConfig.shadowWidth + stretch) * visualScale * roleScale.shadow,
      visualConfig.shadowHeight * visualScale,
    )
  }

  private drawControlledIndicator(position: Point): void {
    this.controlledIndicator.clear()
    if (!this.controlled) {
      return
    }

    this.controlledIndicator.lineStyle(
      visualConfig.controlledRingWidth,
      visualConfig.controlledRingColor,
      visualConfig.controlledRingAlpha,
    )
    this.controlledIndicator.strokeCircle(
      position.x,
      position.y,
      visualConfig.controlledRingRadius,
    )
    this.controlledIndicator.fillStyle(this.palette.trim, 1)
    this.controlledIndicator.fillTriangle(
      position.x,
      position.y - visualConfig.controlledRingRadius - 12,
      position.x - 7,
      position.y - visualConfig.controlledRingRadius - 23,
      position.x + 7,
      position.y - visualConfig.controlledRingRadius - 23,
    )
  }

  private drawCharacter(
    position: Point,
    forward: Point,
    right: Point,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale
    const bodyLength =
      visualConfig.torsoLength * roleScale.bodyY * visualScale
    const bodyWidth = visualConfig.torsoWidth * roleScale.bodyX * visualScale
    const headRadius =
      visualConfig.headRadius * roleScale.head * visualScale
    const bodyCenter = this.offset(
      position,
      forward,
      -4 * visualScale,
      right,
      0,
    )
    const headCenter = this.offset(
      position,
      forward,
      visualConfig.headForwardOffset * visualScale,
      right,
      0,
    )

    this.character.clear()
    this.drawTorso(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawRoleAccent(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawHead(headCenter, forward, right, headRadius)
  }

  private drawTorso(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const halfLength = length * 0.5
    const halfWidth = width * 0.5
    const points = [
      this.offset(center, forward, halfLength, right, -halfWidth * 0.72),
      this.offset(center, forward, halfLength, right, halfWidth * 0.72),
      this.offset(center, forward, -halfLength * 0.8, right, halfWidth),
      this.offset(center, forward, -halfLength, right, halfWidth * 0.62),
      this.offset(center, forward, -halfLength, right, -halfWidth * 0.62),
      this.offset(center, forward, -halfLength * 0.8, right, -halfWidth),
    ]

    this.fillAndStrokePolygon(points, this.palette.shirt)

    const shadePoints = [
      this.offset(center, forward, halfLength * 0.82, right, 0),
      this.offset(center, forward, halfLength * 0.72, right, halfWidth * 0.7),
      this.offset(center, forward, -halfLength * 0.78, right, halfWidth * 0.94),
      this.offset(center, forward, -halfLength * 0.88, right, 0),
    ]
    this.fillPolygon(shadePoints, this.palette.shirtShade, 0.62)
  }

  private drawRoleAccent(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const accent = roleAccentColors[this.options.role]
    const visualScale = visualConfig.playerScale

    switch (this.options.role) {
      case 'keeper': {
        const shoulderOffset = width * 0.52
        for (const side of [-1, 1]) {
          const shoulder = this.offset(
            center,
            forward,
            length * 0.12,
            right,
            shoulderOffset * side,
          )
          this.character.fillStyle(visualConfig.outlineColor, 1)
          this.character.fillCircle(
            shoulder.x,
            shoulder.y,
            8.5 * visualScale,
          )
          this.character.fillStyle(accent, 1)
          this.character.fillCircle(shoulder.x, shoulder.y, 6 * visualScale)
        }
        this.drawLocalLine(
          center,
          forward,
          right,
          length * 0.2,
          -width * 0.34,
          length * 0.2,
          width * 0.34,
          accent,
          5 * visualScale,
        )
        break
      }
      case 'striker':
        this.drawLocalLine(
          center,
          forward,
          right,
          -length * 0.35,
          0,
          length * 0.44,
          0,
          accent,
          6 * visualScale,
        )
        break
      case 'support':
        this.drawLocalLine(
          center,
          forward,
          right,
          -length * 0.34,
          0,
          length * 0.35,
          0,
          accent,
          4 * visualScale,
        )
        this.drawLocalLine(
          center,
          forward,
          right,
          0,
          -width * 0.3,
          0,
          width * 0.3,
          accent,
          4 * visualScale,
        )
        break
      case 'brute': {
        const padOffset = width * 0.52
        for (const side of [-1, 1]) {
          const pad = this.offset(
            center,
            forward,
            0,
            right,
            padOffset * side,
          )
          this.character.fillStyle(visualConfig.outlineColor, 1)
          this.character.fillCircle(pad.x, pad.y, 10 * visualScale)
          this.character.fillStyle(accent, 1)
          this.character.fillCircle(pad.x, pad.y, 7.2 * visualScale)
        }
        break
      }
    }
  }

  private drawHead(
    center: Point,
    forward: Point,
    right: Point,
    radius: number,
  ): void {
    this.character.fillStyle(
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.fillCircle(center.x, center.y, radius + 2.5)
    this.character.fillStyle(visualConfig.skinColor, 1)
    this.character.fillCircle(center.x, center.y, radius)

    const faceShade = this.offset(center, forward, -1, right, radius * 0.42)
    this.character.fillStyle(visualConfig.skinShadeColor, 0.42)
    this.character.fillCircle(faceShade.x, faceShade.y, radius * 0.58)

    const crownCenter = this.offset(
      center,
      forward,
      -radius * 0.32,
      right,
      0,
    )
    const crownRadius =
      radius *
      (this.hairStyle.crownScaleX + this.hairStyle.crownScaleY) *
      0.5
    this.character.fillStyle(this.options.profile.hairColor, 1)
    this.character.fillCircle(crownCenter.x, crownCenter.y, crownRadius)

    this.drawHairFringe(center, forward, right, radius)

    const facePoint = this.offset(center, forward, radius * 0.68, right, 0)
    this.character.fillStyle(this.palette.trim, 0.9)
    this.character.fillCircle(facePoint.x, facePoint.y, 2.3)
  }

  private drawHairFringe(
    center: Point,
    forward: Point,
    right: Point,
    radius: number,
  ): void {
    const fringe = this.hairStyle.fringe

    fringe.forEach((offset, index) => {
      const side = fringe.length === 1 ? 0 : index / (fringe.length - 1) - 0.5
      const base = this.offset(
        center,
        forward,
        radius * 0.12,
        right,
        side * radius * 1.25 + offset * radius * 0.08,
      )
      const left = this.offset(base, forward, 0, right, -radius * 0.24)
      const rightPoint = this.offset(base, forward, 0, right, radius * 0.24)
      const tip = this.offset(
        base,
        forward,
        radius * (0.5 + Math.abs(offset) * 0.06),
        right,
        offset * radius * 0.1,
      )
      this.character.fillTriangle(
        left.x,
        left.y,
        rightPoint.x,
        rightPoint.y,
        tip.x,
        tip.y,
      )
    })
  }

  private drawLocalLine(
    center: Point,
    forward: Point,
    right: Point,
    startForward: number,
    startRight: number,
    endForward: number,
    endRight: number,
    color: number,
    width: number,
  ): void {
    const start = this.offset(
      center,
      forward,
      startForward,
      right,
      startRight,
    )
    const end = this.offset(center, forward, endForward, right, endRight)
    this.character.lineStyle(width, color, 1)
    this.character.lineBetween(start.x, start.y, end.x, end.y)
  }

  private fillAndStrokePolygon(points: Point[], color: number): void {
    this.character.fillStyle(color, 1)
    this.character.lineStyle(
      visualConfig.outlineWidth,
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.beginPath()
    this.character.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => {
      this.character.lineTo(point.x, point.y)
    })
    this.character.closePath()
    this.character.fillPath()
    this.character.strokePath()
  }

  private fillPolygon(points: Point[], color: number, alpha: number): void {
    this.character.fillStyle(color, alpha)
    this.character.beginPath()
    this.character.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => {
      this.character.lineTo(point.x, point.y)
    })
    this.character.closePath()
    this.character.fillPath()
  }

  private offset(
    origin: Point,
    forward: Point,
    forwardAmount: number,
    right: Point,
    rightAmount: number,
  ): Point {
    return {
      x: origin.x + forward.x * forwardAmount + right.x * rightAmount,
      y: origin.y + forward.y * forwardAmount + right.y * rightAmount,
    }
  }

  private getRoleLabel(): string {
    return `${this.options.id} | ${this.options.role.toUpperCase()} | ${this.options.profile.stickStyle.toUpperCase()}`
  }

  private hash(value: string): number {
    let result = 0
    for (let index = 0; index < value.length; index += 1) {
      result = (result * 31 + value.charCodeAt(index)) >>> 0
    }
    return result
  }
}
