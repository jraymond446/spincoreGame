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

    // Final PNG or atlas frames can replace this generated texture without
    // changing gameplay sockets, zones, or action timing.
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
      0.8,
      1.16,
    )
    const styleScale =
      stickVisualConfig.visualScaleByStyle[this.style.id]
    const scaleX =
      data.pose.stickScaleX * stateScale.x * styleScale
    const scaleY =
      mirror *
      data.pose.stickScaleY *
      stateScale.y *
      styleScale *
      thicknessScale
    const imagePosition = this.positionPocketAtSocket(
      data.cradleSocket,
      angle,
      scaleX,
      scaleY,
    )
    const flicker =
      data.state === 'CRADLED_OVERCHARGED'
        ? 0.94 + Math.sin(elapsed * 0.07) * 0.06
        : 1

    this.image
      .setPosition(imagePosition.x, imagePosition.y)
      .setRotation(angle)
      .setScale(scaleX, scaleY)
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
      config.totalStickLength,
      config.handleLength,
      config.handleWidth,
      config.pocketWidth,
      config.pocketDepth,
      config.lipThickness,
      config.innerHighlightWidth,
      config.outlineWidth,
      config.woodGrainAlpha,
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
      config.handleLength *
      config.handleLengthScale *
      style.handleScale
    const handleWidth =
      config.handleWidth * style.handleWidthScale
    const handleEndX = root.x + handleLength
    const neckEndX = handleEndX + config.neckLength
    const neckWidth = config.neckWidth * style.neckWidthScale
    const lipX =
      root.x + config.totalStickLength * style.lengthScale
    const pocketDepth =
      config.pocketDepth * style.pocketDepthScale
    const pocketWidth =
      config.pocketWidth *
      config.pocketWidthScale *
      style.pocketWidthScale
    const lipThickness =
      config.lipThickness *
      config.lipThicknessScale *
      style.lipScale
    const openingLift =
      pocketDepth * 0.34 * style.openingScale

    this.drawPocketShadow(
      graphics,
      neckEndX,
      lipX,
      pocketDepth,
      pocketWidth,
      openingLift,
      style,
    )
    this.drawCavity(
      graphics,
      neckEndX,
      lipX,
      pocketDepth,
      openingLift,
      style,
    )
    this.drawPocket(
      graphics,
      neckEndX,
      lipX,
      pocketDepth,
      pocketWidth,
      openingLift,
      style,
    )
    this.drawNeck(
      graphics,
      root,
      handleEndX,
      neckEndX,
      handleWidth,
      neckWidth,
      style,
    )
    this.drawGrip(
      graphics,
      root,
      handleLength,
      handleWidth,
      style,
    )
    this.drawLip(
      graphics,
      lipX,
      pocketDepth,
      lipThickness,
      style,
    )
    this.drawInnerHighlight(
      graphics,
      neckEndX,
      lipX,
      pocketDepth,
      openingLift,
      style,
    )
    this.drawWoodGrain(
      graphics,
      handleEndX,
      neckEndX,
      style,
    )
  }

  private drawPocketShadow(
    graphics: Phaser.GameObjects.Graphics,
    neckX: number,
    lipX: number,
    depth: number,
    width: number,
    openingLift: number,
    style: CestaBatStyle,
  ): void {
    const points = this.createPocketPolygon(
      neckX,
      lipX,
      depth,
      width,
      openingLift,
      2,
    )

    this.fillAndStrokePolygon(
      graphics,
      points,
      style.bodyShade,
      style.bodyShade,
      stickVisualConfig.shadowAlpha,
      stickVisualConfig.outlineWidth + 1,
    )
  }

  private drawPocket(
    graphics: Phaser.GameObjects.Graphics,
    neckX: number,
    lipX: number,
    depth: number,
    width: number,
    openingLift: number,
    style: CestaBatStyle,
  ): void {
    const points = this.createPocketPolygon(
      neckX,
      lipX,
      depth,
      width,
      openingLift,
      0,
    )

    this.fillAndStrokePolygon(
      graphics,
      points,
      style.bodyColor,
      0x172126,
      1,
      stickVisualConfig.outlineWidth,
    )
  }

  private drawCavity(
    graphics: Phaser.GameObjects.Graphics,
    neckX: number,
    lipX: number,
    depth: number,
    openingLift: number,
    style: CestaBatStyle,
  ): void {
    const centerY = stickVisualConfig.centerY
    const start = {
      x: neckX + 5,
      y: centerY + 1,
    }
    const end = {
      x: lipX - 8,
      y: centerY + openingLift * 0.72,
    }
    const upper = sampleQuadratic(
      start,
      {
        x: Phaser.Math.Linear(neckX, lipX, 0.57),
        y: centerY - depth * 0.31,
      },
      end,
      8,
    )
    const lower = sampleQuadratic(
      end,
      {
        x: Phaser.Math.Linear(neckX, lipX, 0.55),
        y: centerY + openingLift + 5,
      },
      {
        x: neckX + 7,
        y: centerY + 6,
      },
      8,
    )

    this.fillAndStrokePolygon(
      graphics,
      [...upper, ...lower],
      style.cavityColor,
      style.cavityColor,
      0.72,
      1,
    )
  }

  private createPocketPolygon(
    neckX: number,
    lipX: number,
    depth: number,
    width: number,
    openingLift: number,
    offsetY: number,
  ): Point[] {
    const centerY = stickVisualConfig.centerY
    const outerStart = {
      x: neckX - 2,
      y: centerY - width * 0.26 + offsetY,
    }
    const outerControl = {
      x: Phaser.Math.Linear(neckX, lipX, 0.62),
      y: centerY - depth + offsetY,
    }
    const outerEnd = {
      x: lipX,
      y: centerY + depth * 0.08 + offsetY,
    }
    const innerEnd = {
      x: lipX - Math.max(7, width * 0.32),
      y: centerY + openingLift + offsetY,
    }
    const innerControl = {
      x: Phaser.Math.Linear(neckX, lipX, 0.58),
      y: centerY - depth * 0.24 + openingLift + offsetY,
    }
    const innerStart = {
      x: neckX + 2,
      y: centerY + width * 0.28 + offsetY,
    }
    const outer = sampleQuadratic(
      outerStart,
      outerControl,
      outerEnd,
      10,
    )
    const inner = sampleQuadratic(
      innerEnd,
      innerControl,
      innerStart,
      9,
    )

    return [...outer, ...inner]
  }

  private drawNeck(
    graphics: Phaser.GameObjects.Graphics,
    root: Point,
    handleEndX: number,
    neckEndX: number,
    handleWidth: number,
    neckWidth: number,
    style: CestaBatStyle,
  ): void {
    const centerY = root.y
    const points = [
      { x: handleEndX - 1, y: centerY - handleWidth * 0.45 },
      { x: neckEndX + 4, y: centerY - neckWidth * 0.5 },
      { x: neckEndX + 5, y: centerY + neckWidth * 0.5 },
      { x: handleEndX - 1, y: centerY + handleWidth * 0.45 },
    ]

    this.fillAndStrokePolygon(
      graphics,
      points,
      style.bodyColor,
      0x172126,
      1,
      stickVisualConfig.outlineWidth,
    )
    graphics.lineStyle(2, style.bodyShade, 0.4)
    graphics.lineBetween(
      handleEndX + 3,
      centerY + handleWidth * 0.2,
      neckEndX,
      centerY + neckWidth * 0.28,
    )
  }

  private drawGrip(
    graphics: Phaser.GameObjects.Graphics,
    root: Point,
    handleLength: number,
    handleWidth: number,
    style: CestaBatStyle,
  ): void {
    const gripLength = Math.min(handleLength, 17)
    const x = root.x - 2
    const y = root.y - handleWidth * 0.5

    graphics.fillStyle(0x172126, stickVisualConfig.outlineAlpha)
    graphics.fillRoundedRect(
      x - stickVisualConfig.outlineWidth,
      y - stickVisualConfig.outlineWidth,
      gripLength + stickVisualConfig.outlineWidth * 2,
      handleWidth + stickVisualConfig.outlineWidth * 2,
      handleWidth * 0.48,
    )
    graphics.fillStyle(style.gripColor, 1)
    graphics.fillRoundedRect(
      x,
      y,
      gripLength,
      handleWidth,
      handleWidth * 0.42,
    )

    for (const bandX of [x + gripLength * 0.38, x + gripLength * 0.72]) {
      graphics.fillStyle(style.accentColor, 0.68)
      graphics.fillRect(
        bandX,
        y + 1,
        2,
        Math.max(2, handleWidth - 2),
      )
    }

    graphics.fillStyle(0x172126, 1)
    graphics.fillCircle(
      root.x - 2,
      root.y,
      handleWidth * 0.62,
    )
    graphics.fillStyle(style.accentColor, 1)
    graphics.fillCircle(
      root.x - 2,
      root.y,
      handleWidth * 0.38,
    )
  }

  private drawLip(
    graphics: Phaser.GameObjects.Graphics,
    lipX: number,
    depth: number,
    thickness: number,
    style: CestaBatStyle,
  ): void {
    const centerY = stickVisualConfig.centerY + depth * 0.08
    const notch = style.tipNotch

    graphics.lineStyle(
      thickness + stickVisualConfig.outlineWidth * 2,
      0x172126,
      stickVisualConfig.outlineAlpha,
    )
    graphics.lineBetween(
      lipX - 2,
      centerY - thickness * 0.45 - notch * 0.35,
      lipX + 2,
      centerY + thickness * 0.48,
    )
    graphics.lineStyle(thickness, style.bodyShade, 1)
    graphics.lineBetween(
      lipX - 2,
      centerY - thickness * 0.45 - notch * 0.35,
      lipX + 2,
      centerY + thickness * 0.48,
    )

    if (notch > 0) {
      graphics.lineStyle(3, style.accentColor, 1)
      graphics.lineBetween(
        lipX - 1,
        centerY - 2,
        lipX + 6,
        centerY - notch,
      )
      graphics.lineBetween(
        lipX - 1,
        centerY + 1,
        lipX + 6,
        centerY + notch,
      )
    } else {
      graphics.fillStyle(style.accentColor, 0.9)
      graphics.fillCircle(
        lipX,
        centerY - thickness * 0.18,
        Math.max(2, thickness * 0.24),
      )
    }
  }

  private drawInnerHighlight(
    graphics: Phaser.GameObjects.Graphics,
    neckX: number,
    lipX: number,
    depth: number,
    openingLift: number,
    style: CestaBatStyle,
  ): void {
    const centerY = stickVisualConfig.centerY
    const start = {
      x: neckX + 5,
      y: centerY + openingLift * 0.56,
    }
    const control = {
      x: Phaser.Math.Linear(neckX, lipX, 0.58),
      y: centerY - depth * 0.18 + openingLift,
    }
    const end = {
      x: lipX - 8,
      y: centerY + openingLift * 0.92,
    }

    graphics.lineStyle(
      stickVisualConfig.innerHighlightWidth,
      style.accentColor,
      stickVisualConfig.innerHighlightAlpha,
    )
    this.strokeQuadratic(graphics, start, control, end)
  }

  private drawWoodGrain(
    graphics: Phaser.GameObjects.Graphics,
    handleEndX: number,
    neckEndX: number,
    style: CestaBatStyle,
  ): void {
    if (stickVisualConfig.woodGrainAlpha <= 0) {
      return
    }

    const y = stickVisualConfig.centerY
    graphics.lineStyle(
      1,
      style.bodyShade,
      stickVisualConfig.woodGrainAlpha,
    )
    graphics.lineBetween(
      handleEndX + 6,
      y - 2,
      neckEndX - 5,
      y - 1,
    )
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
    const pulse = 1 + Math.sin(elapsed * 0.014) * 0.07

    if (catchReady || cradled) {
      const glowAlpha = cradled ? 0.24 : 0.1
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
        cradled ? 0.82 : 0.48,
      )
      this.effects.strokeCircle(
        data.cradleSocket.x,
        data.cradleSocket.y,
        radius * 0.6,
      )
    }

    if (swinging || poking) {
      const progress = Phaser.Math.Clamp(
        elapsed / Math.max(1, stickVisualConfig.swingTrailDurationMs),
        0,
        1,
      )
      const baseAngle = Math.atan2(data.forward.y, data.forward.x)
      const arc = poking ? 0.42 : 0.78
      const start = baseAngle - arc * mirror
      const end = Phaser.Math.Linear(
        start,
        baseAngle + arc * 0.2 * mirror,
        progress,
      )
      const radius = distance(data.root, data.cradleSocket)

      this.effects.lineStyle(
        stickVisualConfig.swingTrailWidth,
        this.style.accentColor,
        stickVisualConfig.swingTrailAlpha * (1 - progress * 0.76),
      )
      this.effects.beginPath()
      this.effects.arc(
        data.root.x,
        data.root.y,
        radius,
        start,
        end,
        mirror < 0,
      )
      this.effects.strokePath()
    }

    if (cradled) {
      const forwardAngle = Math.atan2(data.forward.y, data.forward.x)
      const lipCenter = {
        x: data.cradleSocket.x + data.cradleSide.x * 8,
        y: data.cradleSocket.y + data.cradleSide.y * 8,
      }

      this.foreground.lineStyle(
        stickVisualConfig.pocketForegroundWidth + 3,
        0x172126,
        0.9,
      )
      this.foreground.beginPath()
      this.foreground.arc(
        lipCenter.x,
        lipCenter.y,
        12,
        forwardAngle - 1.05 * mirror,
        forwardAngle + 1.05 * mirror,
        mirror < 0,
      )
      this.foreground.strokePath()
      this.foreground.lineStyle(
        stickVisualConfig.pocketForegroundWidth,
        this.style.bodyShade,
        0.94,
      )
      this.foreground.beginPath()
      this.foreground.arc(
        lipCenter.x,
        lipCenter.y,
        12,
        forwardAngle - 1.05 * mirror,
        forwardAngle + 1.05 * mirror,
        mirror < 0,
      )
      this.foreground.strokePath()
    }
  }

  private positionPocketAtSocket(
    socket: Point,
    rotation: number,
    scaleX: number,
    scaleY: number,
  ): Point {
    const localX =
      stickVisualConfig.pocketAnchorX - stickVisualConfig.rootX
    const localY =
      stickVisualConfig.pocketAnchorY - stickVisualConfig.centerY
    const cosine = Math.cos(rotation)
    const sine = Math.sin(rotation)
    const worldX =
      cosine * localX * scaleX - sine * localY * scaleY
    const worldY =
      sine * localX * scaleX + cosine * localY * scaleY

    return {
      x: socket.x - worldX,
      y: socket.y - worldY,
    }
  }

  private getStateScale(
    state: StickActionState,
    elapsed: number,
  ): Point {
    if (state === 'CATCH_READY') {
      return { x: 1, y: 1.05 }
    }

    if (
      state === 'CRADLED_CHARGING' ||
      state === 'CRADLED_OVERCHARGED'
    ) {
      const pulse = Math.sin(elapsed * 0.014) * 0.018
      return { x: 1 + pulse, y: 1 - pulse }
    }

    if (state === 'RELEASE_SWING' || state === 'SWINGING') {
      return { x: 1.06, y: 0.96 }
    }

    if (state === 'FUMBLED_COOLDOWN') {
      return { x: 0.97, y: 1.04 }
    }

    return { x: 1, y: 1 }
  }

  private strokeQuadratic(
    graphics: Phaser.GameObjects.Graphics,
    start: Point,
    control: Point,
    end: Point,
  ): void {
    const points = sampleQuadratic(start, control, end, 12)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)

    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }

    graphics.strokePath()
  }

  private fillAndStrokePolygon(
    graphics: Phaser.GameObjects.Graphics,
    points: Point[],
    fillColor: number,
    strokeColor: number,
    alpha: number,
    strokeWidth: number,
  ): void {
    graphics.fillStyle(fillColor, alpha)
    graphics.lineStyle(
      strokeWidth,
      strokeColor,
      stickVisualConfig.outlineAlpha,
    )
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)

    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }

    graphics.closePath()
    graphics.fillPath()
    graphics.strokePath()
  }
}

function sampleQuadratic(
  start: Point,
  control: Point,
  end: Point,
  segments: number,
): Point[] {
  const points: Point[] = []

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const inverse = 1 - progress
    points.push({
      x:
        inverse * inverse * start.x +
        2 * inverse * progress * control.x +
        progress * progress * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * progress * control.y +
        progress * progress * end.y,
    })
  }

  return points
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
