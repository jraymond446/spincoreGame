import Phaser from 'phaser'
import { stickVisualConfig } from '../config/stickVisualConfig'
import { visualConfig } from '../config/visualConfig'
import { cestaBatStyles, type CestaBatStyle } from '../data/stickStyles'
import type { StickActionState, StickStyle } from '../data/matchTypes'
import type { PlayerAnimationPose } from './AnimationState'

type Point = { x: number; y: number }

export type CestaBatVisualUpdate = {
  root: Point
  forward: Point
  cradleSide: Point
  cradleSocket: Point
  state: StickActionState
  pose: PlayerAnimationPose
  now: number
}

export class CestaBatVisual {
  private readonly scene: Phaser.Scene
  private readonly style: CestaBatStyle
  private readonly image: Phaser.GameObjects.Image
  private readonly effects: Phaser.GameObjects.Graphics
  private readonly foreground: Phaser.GameObjects.Graphics
  private lastState: StickActionState = 'IDLE'
  private stateStartedAt = 0

  constructor(scene: Phaser.Scene, styleId: StickStyle) {
    this.scene = scene
    this.style = cestaBatStyles[styleId]
    const textureKey = this.ensureGeneratedTexture()

    // Swap this generated texture key for an atlas frame or PNG key when final
    // art lands. Gameplay sockets and zones remain owned by Player/systems.
    this.image = scene.add
      .image(0, 0, textureKey)
      .setOrigin(
        stickVisualConfig.rootX / stickVisualConfig.textureWidth,
        stickVisualConfig.centerY / stickVisualConfig.textureHeight,
      )
      .setDepth(5)
    this.effects = scene.add.graphics().setDepth(4)
    this.foreground = scene.add.graphics().setDepth(9)
  }

  update(data: CestaBatVisualUpdate): void {
    if (data.state !== this.lastState) {
      this.lastState = data.state
      this.stateStartedAt = data.now
    }

    const elapsed = data.now - this.stateStartedAt
    const right = { x: -data.forward.y, y: data.forward.x }
    const mirror =
      data.cradleSide.x * right.x + data.cradleSide.y * right.y >= 0
        ? 1
        : -1
    const angle =
      Math.atan2(data.forward.y, data.forward.x) +
      data.pose.stickRotationOffset
    const stateScale = this.getStateScale(data.state, elapsed)
    const thicknessScale = Phaser.Math.Clamp(
      visualConfig.stick.thickness / 12,
      0.78,
      1.28,
    )
    const flicker =
      data.state === 'CRADLED_OVERCHARGED'
        ? 0.92 + Math.sin(elapsed * 0.07) * 0.08
        : 1

    this.image
      .setPosition(data.root.x, data.root.y)
      .setRotation(angle)
      .setScale(
        data.pose.stickScaleX * stateScale.x,
        mirror *
          data.pose.stickScaleY *
          stateScale.y *
          thicknessScale,
      )
      .setAlpha(flicker)

    this.drawEffects(data, elapsed, mirror)
  }

  destroy(): void {
    this.image.destroy()
    this.effects.destroy()
    this.foreground.destroy()
  }

  private ensureGeneratedTexture(): string {
    const style = this.style
    const config = stickVisualConfig
    const key = [
      config.generatedTexturePrefix,
      style.id,
      config.pocketWidthScale,
      config.lipThicknessScale,
      config.handleLengthScale,
      config.innerHighlightAlpha,
      config.outlineAlpha,
    ].join('-')

    if (this.scene.textures.exists(key)) {
      return key
    }

    const graphics = this.scene.add.graphics()
    this.drawGeneratedBat(graphics, style)
    graphics.generateTexture(
      key,
      config.textureWidth,
      config.textureHeight,
    )
    graphics.destroy()
    return key
  }

  private drawGeneratedBat(
    graphics: Phaser.GameObjects.Graphics,
    style: CestaBatStyle,
  ): void {
    const config = stickVisualConfig
    const root = { x: config.rootX, y: config.centerY }
    const handleLength =
      style.handleLength * config.handleLengthScale
    const handleEnd = { x: root.x + handleLength, y: root.y }
    const pocketStart = {
      x: handleEnd.x + 10,
      y: handleEnd.y,
    }
    const pocketEnd = {
      x: Math.min(
        config.textureWidth - 15,
        pocketStart.x + style.pocketLength,
      ),
      y: root.y + style.pocketDepth * 0.28,
    }
    const pocketControl = {
      x: pocketStart.x + style.pocketLength * 0.62,
      y: root.y + style.pocketDepth,
    }
    const outline = 0x172126
    const shaftEndHalf = style.shaftWidth * style.taper * 0.5
    const shaftStartHalf = style.shaftWidth * 0.5

    graphics.lineStyle(
      style.pocketBodyWidth * config.pocketWidthScale + 7,
      outline,
      config.outlineAlpha,
    )
    this.drawQuadratic(graphics, pocketStart, pocketControl, pocketEnd)
    graphics.lineStyle(
      style.pocketBodyWidth * config.pocketWidthScale,
      style.bodyColor,
      1,
    )
    this.drawQuadratic(graphics, pocketStart, pocketControl, pocketEnd)

    graphics.fillStyle(outline, config.outlineAlpha)
    this.fillPolygon(graphics, [
      { x: root.x, y: root.y - shaftStartHalf - 2 },
      { x: handleEnd.x + 13, y: handleEnd.y - shaftEndHalf - 2 },
      { x: handleEnd.x + 13, y: handleEnd.y + shaftEndHalf + 2 },
      { x: root.x, y: root.y + shaftStartHalf + 2 },
    ])
    graphics.fillStyle(style.bodyColor, 1)
    this.fillPolygon(graphics, [
      { x: root.x, y: root.y - shaftStartHalf },
      { x: handleEnd.x + 13, y: handleEnd.y - shaftEndHalf },
      { x: handleEnd.x + 13, y: handleEnd.y + shaftEndHalf },
      { x: root.x, y: root.y + shaftStartHalf },
    ])

    const cavityOffset = style.pocketBodyWidth * 0.22
    graphics.lineStyle(
      style.pocketBodyWidth * 0.5 * config.pocketWidthScale,
      style.cavityColor,
      0.92,
    )
    this.drawQuadratic(
      graphics,
      {
        x: pocketStart.x + 7,
        y: pocketStart.y + cavityOffset,
      },
      {
        x: pocketControl.x,
        y: pocketControl.y + cavityOffset,
      },
      {
        x: pocketEnd.x - 5,
        y: pocketEnd.y + cavityOffset,
      },
    )
    graphics.lineStyle(
      Math.max(2, style.pocketBodyWidth * 0.13),
      style.accentColor,
      config.innerHighlightAlpha,
    )
    this.drawQuadratic(
      graphics,
      {
        x: pocketStart.x + 8,
        y: pocketStart.y + cavityOffset - 1,
      },
      {
        x: pocketControl.x,
        y: pocketControl.y + cavityOffset - 1,
      },
      {
        x: pocketEnd.x - 4,
        y: pocketEnd.y + cavityOffset - 1,
      },
    )

    graphics.lineStyle(3, style.bodyShade, 0.78)
    this.drawQuadratic(
      graphics,
      { x: pocketStart.x + 1, y: pocketStart.y - 4 },
      { x: pocketControl.x, y: pocketControl.y - 6 },
      { x: pocketEnd.x, y: pocketEnd.y - 5 },
    )

    this.drawGrip(graphics, root, handleLength, style)
    this.drawLip(graphics, pocketEnd, style)

    if (style.forkGap > 0) {
      this.drawForkLip(graphics, pocketEnd, style)
    }
  }

  private drawGrip(
    graphics: Phaser.GameObjects.Graphics,
    root: Point,
    handleLength: number,
    style: CestaBatStyle,
  ): void {
    const gripLength = Math.min(22, handleLength * 0.82)

    graphics.lineStyle(style.shaftWidth + 3, 0x172126, 0.95)
    graphics.lineBetween(
      root.x - 2,
      root.y,
      root.x + gripLength,
      root.y,
    )
    graphics.lineStyle(style.shaftWidth, style.gripColor, 1)
    graphics.lineBetween(
      root.x - 1,
      root.y,
      root.x + gripLength,
      root.y,
    )

    for (let x = root.x + 3; x < root.x + gripLength; x += 6) {
      graphics.lineStyle(2, style.accentColor, 0.72)
      graphics.lineBetween(
        x,
        root.y - style.shaftWidth * 0.48,
        x + 3,
        root.y + style.shaftWidth * 0.48,
      )
    }

    graphics.fillStyle(style.accentColor, 1)
    graphics.fillCircle(root.x, root.y, style.shaftWidth * 0.55)
  }

  private drawLip(
    graphics: Phaser.GameObjects.Graphics,
    end: Point,
    style: CestaBatStyle,
  ): void {
    const thickness =
      style.lipThickness * stickVisualConfig.lipThicknessScale

    graphics.lineStyle(thickness + 4, 0x172126, 0.96)
    graphics.lineBetween(
      end.x - 3,
      end.y - thickness * 0.55,
      end.x + 5,
      end.y + thickness * 0.55,
    )
    graphics.lineStyle(thickness, style.accentColor, 1)
    graphics.lineBetween(
      end.x - 3,
      end.y - thickness * 0.55,
      end.x + 5,
      end.y + thickness * 0.55,
    )
  }

  private drawForkLip(
    graphics: Phaser.GameObjects.Graphics,
    end: Point,
    style: CestaBatStyle,
  ): void {
    const length = 10
    const gap = style.forkGap

    graphics.lineStyle(6, 0x172126, 1)
    graphics.lineBetween(end.x - 2, end.y, end.x + length, end.y - gap)
    graphics.lineBetween(end.x - 2, end.y, end.x + length, end.y + gap)
    graphics.lineStyle(3, style.accentColor, 1)
    graphics.lineBetween(end.x - 2, end.y, end.x + length, end.y - gap)
    graphics.lineBetween(end.x - 2, end.y, end.x + length, end.y + gap)
  }

  private drawEffects(
    data: CestaBatVisualUpdate,
    elapsed: number,
    mirror: number,
  ): void {
    this.effects.clear()
    this.foreground.clear()

    const catchReady = data.state === 'CATCH_READY'
    const cradled =
      data.state === 'CRADLED_STABLE' ||
      data.state === 'CRADLED_CHARGING' ||
      data.state === 'CRADLED_OVERCHARGED' ||
      data.state === 'RELEASE_WINDUP' ||
      data.state === 'RELEASE_SWING'
    const swinging =
      data.state === 'RELEASE_SWING' ||
      data.state === 'RELEASE_FOLLOW_THROUGH' ||
      data.state === 'SWINGING'
    const poking = data.pose.impact > 0.7 && !cradled
    const pulse = 1 + Math.sin(elapsed * 0.014) * 0.09

    if (catchReady || cradled) {
      const glowAlpha = cradled ? 0.28 : 0.13
      const radius = stickVisualConfig.pocketGlowRadius * pulse

      this.effects.fillStyle(this.style.accentColor, glowAlpha)
      this.effects.fillCircle(
        data.cradleSocket.x,
        data.cradleSocket.y,
        radius,
      )
      this.effects.lineStyle(
        cradled ? 3 : 2,
        this.style.accentColor,
        cradled ? 0.9 : 0.58,
      )
      this.effects.strokeCircle(
        data.cradleSocket.x,
        data.cradleSocket.y,
        radius * 0.62,
      )
    }

    if (swinging || poking) {
      const progress = Phaser.Math.Clamp(
        elapsed / Math.max(1, stickVisualConfig.swingTrailDurationMs),
        0,
        1,
      )
      const baseAngle = Math.atan2(data.forward.y, data.forward.x)
      const arc = poking ? 0.48 : 0.92
      const start = baseAngle - arc * mirror
      const end = Phaser.Math.Linear(start, baseAngle + arc * 0.25 * mirror, progress)

      this.effects.lineStyle(
        stickVisualConfig.swingTrailWidth,
        this.style.accentColor,
        stickVisualConfig.swingTrailAlpha * (1 - progress * 0.7),
      )
      this.effects.beginPath()
      this.effects.arc(
        data.root.x,
        data.root.y,
        76,
        start,
        end,
        mirror < 0,
      )
      this.effects.strokePath()
    }

    if (cradled) {
      const forwardAngle = Math.atan2(data.forward.y, data.forward.x)
      const lipCenter = {
        x:
          data.cradleSocket.x +
          data.cradleSide.x * 9 -
          data.forward.x * 1,
        y:
          data.cradleSocket.y +
          data.cradleSide.y * 9 -
          data.forward.y * 1,
      }

      this.foreground.lineStyle(
        stickVisualConfig.pocketForegroundWidth + 3,
        0x172126,
        0.92,
      )
      this.foreground.beginPath()
      this.foreground.arc(
        lipCenter.x,
        lipCenter.y,
        13,
        forwardAngle - 1.15 * mirror,
        forwardAngle + 1.15 * mirror,
        mirror < 0,
      )
      this.foreground.strokePath()
      this.foreground.lineStyle(
        stickVisualConfig.pocketForegroundWidth,
        this.style.accentColor,
        0.92,
      )
      this.foreground.beginPath()
      this.foreground.arc(
        lipCenter.x,
        lipCenter.y,
        13,
        forwardAngle - 1.15 * mirror,
        forwardAngle + 1.15 * mirror,
        mirror < 0,
      )
      this.foreground.strokePath()
    }
  }

  private getStateScale(
    state: StickActionState,
    elapsed: number,
  ): Point {
    if (state === 'CATCH_READY') {
      return { x: 1.01, y: 1.08 }
    }

    if (
      state === 'CRADLED_CHARGING' ||
      state === 'CRADLED_OVERCHARGED'
    ) {
      const pulse = Math.sin(elapsed * 0.014) * 0.025
      return { x: 1 + pulse, y: 1 - pulse }
    }

    if (state === 'RELEASE_SWING' || state === 'SWINGING') {
      return { x: 1.1, y: 0.94 }
    }

    if (state === 'FUMBLED_COOLDOWN') {
      return { x: 0.96, y: 1.08 }
    }

    return { x: 1, y: 1 }
  }

  private drawQuadratic(
    graphics: Phaser.GameObjects.Graphics,
    start: Point,
    control: Point,
    end: Point,
  ): void {
    graphics.beginPath()
    graphics.moveTo(start.x, start.y)

    for (let index = 1; index <= 20; index += 1) {
      const point = quadraticPoint(start, control, end, index / 20)
      graphics.lineTo(point.x, point.y)
    }

    graphics.strokePath()
  }

  private fillPolygon(
    graphics: Phaser.GameObjects.Graphics,
    points: Point[],
  ): void {
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)

    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }

    graphics.closePath()
    graphics.fillPath()
  }
}

function quadraticPoint(
  start: Point,
  control: Point,
  end: Point,
  progress: number,
): Point {
  const inverse = 1 - progress

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * progress * control.x +
      progress * progress * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * progress * control.y +
      progress * progress * end.y,
  }
}
