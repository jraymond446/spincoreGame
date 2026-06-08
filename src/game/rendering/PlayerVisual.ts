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
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import { stickConfig } from '../config/stickConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import type {
  PlayerControllerType,
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { DefensiveVisualState, PlayerAnimationPose } from './AnimationState'
import { PlayerAnimationController } from './PlayerAnimationController'
import { StickVisual } from './StickVisual'
import { getHandednessFrame } from '../rules/Handedness'
import {
  getPlayerAssetKeys,
  hasVisualAsset,
} from './VisualAssetOverrides'

type Point = { x: number; y: number }

export type PlayerVisualUpdate = {
  position: Point
  velocity: Point
  facingRotation: number
  stickMountPoint: Point
  stickForward: Point
  stickSide: Point
  handednessMountSign: -1 | 1
  pocketFacingSign: -1 | 1
  visualMirrorSign: -1 | 1
  cradleSocketSign: -1 | 1
  cradleSocket: Point
  chargeVisual: {
    normalized: number
    hardCharge: boolean
    overcharged: boolean
  }
  stickState: StickActionState
  defenseState: DefensiveVisualState
}

type PlayerVisualOptions = {
  id: string
  role: PlayerRole
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  controllerType: PlayerControllerType
  teamSide: TeamSide
  profile: PlayerVisualProfile
}

export class PlayerVisual {
  private readonly scene: Phaser.Scene
  private readonly options: PlayerVisualOptions
  private readonly shadow: Phaser.GameObjects.Graphics
  private readonly chargeAura: Phaser.GameObjects.Graphics
  private readonly character: Phaser.GameObjects.Graphics
  private readonly controlledIndicator: Phaser.GameObjects.Graphics
  private readonly roleLabel: Phaser.GameObjects.Text
  private readonly aiStateLabel: Phaser.GameObjects.Text
  private readonly stick: StickVisual
  private readonly assetLayers: Phaser.GameObjects.Image[] = []
  private readonly animation = new PlayerAnimationController()
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

    this.chargeAura = scene.add.graphics().setDepth(2)
    this.shadow = scene.add.graphics().setDepth(3)
    this.stick = new StickVisual(scene, options.profile.stickStyle)
    this.character = scene.add.graphics().setDepth(6)
    getPlayerAssetKeys(options.teamSide).forEach((textureKey, index) => {
      if (!hasVisualAsset(scene, textureKey)) {
        return
      }

      this.assetLayers.push(
        scene.add
          .image(0, 0, textureKey)
          .setOrigin(0.5)
          .setDepth(6 + index * 0.1),
      )
    })
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
    ) * (data.stickState === 'IDLE' ? 0.72 : 0.42)
    const bob =
      Math.sin(
        this.scene.time.now * visualConfig.idleBobSpeed + this.animationPhase,
      ) * bobAmplitude
    const pose = this.animation.update(
      data.stickState,
      data.defenseState,
      data.handednessMountSign,
      data.pocketFacingSign,
      this.scene.time.now,
    )
    if (data.chargeVisual.normalized > 0) {
      const charge = data.chargeVisual.normalized
      pose.bodyForwardOffset -= charge * 3.5
      pose.bodySideOffset -=
        charge * 2.2 * data.handednessMountSign
      pose.bodyScaleX *= Phaser.Math.Linear(1, 1.06, charge)
      pose.bodyScaleY *= Phaser.Math.Linear(1, 0.95, charge)
      pose.anticipation = Math.max(pose.anticipation, charge)
    }
    const bodyRotation = data.facingRotation + pose.bodyRotationOffset
    const forward = {
      x: Math.cos(bodyRotation),
      y: Math.sin(bodyRotation),
    }
    const right = { x: -forward.y, y: forward.x }
    const visualPosition = {
      x:
        data.position.x +
        forward.x * pose.bodyForwardOffset +
        right.x * pose.bodySideOffset,
      y:
        data.position.y +
        bob +
        forward.y * pose.bodyForwardOffset +
        right.y * pose.bodySideOffset,
    }

    this.drawChargeAura(data.position, data.chargeVisual)
    this.drawShadow(data.position, speed, pose)
    this.drawControlledIndicator(data.position)
    if (this.assetLayers.length > 0) {
      this.character.clear()
      this.updateAssetCharacter(visualPosition, bodyRotation, pose)
    } else {
      this.drawCharacter(visualPosition, forward, right, pose)
    }
    this.stick.update(
      data.stickMountPoint,
      data.stickForward,
      data.stickSide,
      data.visualMirrorSign,
      data.cradleSocket,
      data.stickState,
      data.defenseState,
      pose,
      data.chargeVisual,
      this.scene.time.now,
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

  private drawChargeAura(
    position: Point,
    charge: PlayerVisualUpdate['chargeVisual'],
  ): void {
    this.chargeAura.clear()

    if (
      !possessionFeelConfig.playerChargeAuraEnabled ||
      charge.normalized < possessionFeelConfig.playerChargeAuraThreshold
    ) {
      return
    }

    const progress = Phaser.Math.Clamp(
      (charge.normalized - possessionFeelConfig.playerChargeAuraThreshold) /
        Math.max(0.01, 1 - possessionFeelConfig.playerChargeAuraThreshold),
      0,
      1,
    )
    const flicker =
      charge.overcharged && possessionFeelConfig.overchargeAuraFlicker
        ? 0.72 + Math.sin(this.scene.time.now * 0.055) * 0.28
        : 1
    const color = charge.overcharged
      ? possessionFeelConfig.chargeCoreColorOvercharged
      : charge.hardCharge
        ? possessionFeelConfig.chargeCoreColorHard
        : possessionFeelConfig.chargeCoreColorCharging
    const alpha =
      possessionFeelConfig.playerChargeAuraMaxAlpha *
      Phaser.Math.Linear(0.35, 1, progress) *
      flicker
    const radius =
      possessionFeelConfig.playerChargeAuraRadius *
      Phaser.Math.Linear(0.82, 1.12, progress)

    this.chargeAura.lineStyle(4, color, alpha)
    this.chargeAura.strokeCircle(position.x, position.y + 4, radius)
    this.chargeAura.lineStyle(2, color, alpha * 0.55)
    this.chargeAura.strokeCircle(
      position.x,
      position.y + 4,
      radius * 1.22,
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

  private drawShadow(
    position: Point,
    speed: number,
    pose: PlayerAnimationPose,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale
    const stretch = Phaser.Math.Clamp(speed * 0.7, 0, 10)
    this.shadow.clear()
    this.shadow.fillStyle(visualConfig.shadowColor, visualConfig.shadowAlpha)
    this.shadow.fillEllipse(
      position.x,
      position.y + visualConfig.shadowOffsetY,
      (visualConfig.shadowWidth + stretch) *
        visualScale *
        roleScale.shadow *
        pose.shadowScale,
      visualConfig.shadowHeight * visualScale * pose.shadowScale,
    )
  }

  private updateAssetCharacter(
    position: Point,
    rotation: number,
    pose: PlayerAnimationPose,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const width =
      assetOverrideConfig.players.displayWidth *
      roleScale.bodyX *
      pose.bodyScaleX
    const height =
      assetOverrideConfig.players.displayHeight *
      roleScale.bodyY *
      pose.bodyScaleY

    for (const layer of this.assetLayers) {
      layer
        .setPosition(position.x, position.y)
        .setRotation(rotation)
        .setDisplaySize(width, height)
    }
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
    pose: PlayerAnimationPose,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale
    const bodyLength =
      visualConfig.torsoLength *
      roleScale.bodyY *
      visualScale *
      pose.bodyScaleY
    const bodyWidth =
      visualConfig.torsoWidth *
      roleScale.bodyX *
      visualScale *
      pose.bodyScaleX
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
      visualConfig.headForwardOffset * visualScale +
        pose.headForwardOffset,
      right,
      0,
    )

    this.character.clear()
    this.drawLowerBody(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawTorso(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawRoleAccent(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawAthleticStance(
      bodyCenter,
      forward,
      right,
      bodyLength,
      bodyWidth,
      pose,
    )
    this.drawHead(headCenter, forward, right, headRadius)
  }

  private drawLowerBody(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const rear = this.offset(
      center,
      forward,
      -length * 0.62,
      right,
      0,
    )
    const points = [
      this.offset(rear, forward, length * 0.28, right, -width * 0.38),
      this.offset(rear, forward, length * 0.28, right, width * 0.38),
      this.offset(rear, forward, -length * 0.23, right, width * 0.3),
      this.offset(rear, forward, -length * 0.32, right, 0),
      this.offset(rear, forward, -length * 0.23, right, -width * 0.3),
    ]

    this.fillAndStrokePolygon(points, this.palette.shorts)
    this.character.fillStyle(this.palette.trim, 0.92)
    this.character.fillCircle(
      rear.x,
      rear.y,
      Math.max(2.2, visualConfig.playerScale * 3.2),
    )
  }

  private drawAthleticStance(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
    pose: PlayerAnimationPose,
  ): void {
    const mountSign =
      getHandednessFrame(this.options.handedness).mountSign
    const handSide = width * 0.48 * mountSign
    const rearSide = -width * 0.4 * mountSign
    const frontHand = this.offset(
      center,
      forward,
      length * (0.32 + pose.impact * 0.12),
      right,
      handSide,
    )
    const rearHand = this.offset(
      center,
      forward,
      -length * 0.08,
      right,
      rearSide,
    )
    const armColor = visualConfig.skinColor
    const armWidth = Math.max(4, visualConfig.playerScale * 6)

    this.character.lineStyle(
      armWidth + 3,
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.lineBetween(center.x, center.y, frontHand.x, frontHand.y)
    this.character.lineBetween(center.x, center.y, rearHand.x, rearHand.y)
    this.character.lineStyle(armWidth, armColor, 1)
    this.character.lineBetween(center.x, center.y, frontHand.x, frontHand.y)
    this.character.lineBetween(center.x, center.y, rearHand.x, rearHand.y)
    this.character.fillStyle(this.palette.trim, 1)
    this.character.fillCircle(frontHand.x, frontHand.y, armWidth * 0.55)
    this.character.fillCircle(rearHand.x, rearHand.y, armWidth * 0.55)
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
    this.drawLocalLine(
      center,
      forward,
      right,
      halfLength * 0.62,
      -halfWidth * 0.62,
      halfLength * 0.62,
      halfWidth * 0.62,
      this.palette.trim,
      Math.max(2.5, visualConfig.playerScale * 4),
    )

    const shadePoints = [
      this.offset(center, forward, halfLength * 0.82, right, 0),
      this.offset(center, forward, halfLength * 0.72, right, halfWidth * 0.7),
      this.offset(center, forward, -halfLength * 0.78, right, halfWidth * 0.94),
      this.offset(center, forward, -halfLength * 0.88, right, 0),
    ]
    this.fillPolygon(shadePoints, this.palette.shirtShade, 0.62)

    for (const side of [-1, 1]) {
      this.drawLocalLine(
        center,
        forward,
        right,
        halfLength * 0.45,
        halfWidth * 0.72 * side,
        -halfLength * 0.55,
        halfWidth * 0.86 * side,
        this.palette.trim,
        2.5,
      )
    }

    const collar = this.offset(
      center,
      forward,
      halfLength * 0.72,
      right,
      0,
    )
    this.character.fillStyle(visualConfig.outlineColor, 0.9)
    this.character.fillCircle(collar.x, collar.y, 5.2)
    this.character.fillStyle(this.palette.trim, 1)
    this.character.fillCircle(collar.x, collar.y, 3.1)
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

    for (const side of [-1, 1]) {
      const ear = this.offset(
        center,
        forward,
        -radius * 0.02,
        right,
        radius * 0.82 * side,
      )
      this.character.fillStyle(visualConfig.outlineColor, 0.9)
      this.character.fillCircle(ear.x, ear.y, radius * 0.25)
      this.character.fillStyle(visualConfig.skinColor, 1)
      this.character.fillCircle(ear.x, ear.y, radius * 0.17)
    }

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
    const crownPoints = this.createOrientedEllipse(
      crownCenter,
      forward,
      right,
      radius * this.hairStyle.crownScaleY,
      radius * this.hairStyle.crownScaleX,
      14,
    )
    this.fillAndStrokePolygon(
      crownPoints,
      this.options.profile.hairColor,
    )

    if (this.hairStyle.id === 'spikes' || this.hairStyle.id === 'tuft') {
      for (const side of [-1, 1]) {
        const tuftBase = this.offset(
          crownCenter,
          forward,
          -radius * 0.55,
          right,
          radius * 0.52 * side,
        )
        const tuftLeft = this.offset(
          tuftBase,
          forward,
          0,
          right,
          -radius * 0.22,
        )
        const tuftRight = this.offset(
          tuftBase,
          forward,
          0,
          right,
          radius * 0.22,
        )
        const tuftTip = this.offset(
          tuftBase,
          forward,
          -radius * 0.48,
          right,
          radius * 0.16 * side,
        )
        this.fillAndStrokePolygon(
          [tuftLeft, tuftRight, tuftTip],
          this.options.profile.hairColor,
        )
      }
    }

    this.drawHairFringe(center, forward, right, radius)

    const hairShine = this.offset(
      crownCenter,
      forward,
      -radius * 0.18,
      right,
      -radius * 0.28,
    )
    this.character.fillStyle(this.palette.trim, 0.2)
    this.character.fillEllipse(
      hairShine.x,
      hairShine.y,
      radius * 0.46,
      radius * 0.2,
    )

    const facePoint = this.offset(center, forward, radius * 0.68, right, 0)
    this.character.fillStyle(visualConfig.outlineColor, 0.84)
    this.character.fillCircle(facePoint.x, facePoint.y, 2.1)
  }

  private createOrientedEllipse(
    center: Point,
    forward: Point,
    right: Point,
    forwardRadius: number,
    rightRadius: number,
    segments: number,
  ): Point[] {
    const points: Point[] = []

    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2
      points.push(
        this.offset(
          center,
          forward,
          Math.cos(angle) * forwardRadius,
          right,
          Math.sin(angle) * rightRadius,
        ),
      )
    }

    return points
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
    const handedness = stickConfig.handednessDebugEnabled
      ? ` | ${this.options.handedness.toUpperCase()}`
      : ''

    return `${this.options.id} | ${this.options.role.toUpperCase()}${handedness} | ${this.options.playStyle.toUpperCase()} | ${this.options.profile.stickStyle.toUpperCase()}`
  }

  private hash(value: string): number {
    let result = 0
    for (let index = 0; index < value.length; index += 1) {
      result = (result * 31 + value.charCodeAt(index)) >>> 0
    }
    return result
  }
}
