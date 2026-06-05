import Phaser from 'phaser'
import { stickConfig } from '../config/stickConfig'
import { visualConfig } from '../config/visualConfig'
import type { StickCurve } from '../entities/Player'
import type { StickStyle } from '../data/playerVisualProfiles'
import type { StickActionState } from '../data/matchTypes'

type Point = { x: number; y: number }

export class StickVisual {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly style: StickStyle

  constructor(scene: Phaser.Scene, style: StickStyle) {
    this.style = style
    this.graphics = scene.add.graphics().setDepth(5)
  }

  update(
    curve: StickCurve,
    forward: Point,
    stickSide: Point,
    cradleSocket: Point,
    state: StickActionState,
  ): void {
    const color = this.getStateColor(state)
    const outlineWidth =
      visualConfig.stick.thickness + visualConfig.stick.outlineExtra

    this.graphics.clear()
    this.drawSocketGlow(cradleSocket, state)

    if (this.style === 'whip') {
      this.drawWhip(curve, color)
      this.drawInnerEdge(curve, stickSide)
      return
    }

    this.drawQuadratic(curve, visualConfig.outlineColor, outlineWidth)
    this.drawQuadratic(curve, color, visualConfig.stick.thickness)
    this.drawInnerEdge(curve, stickSide)

    switch (this.style) {
      case 'hook':
        this.drawHook(curve.tip, forward, stickSide, color)
        break
      case 'cradle':
        this.drawCradle(curve.tip, forward, stickSide, color)
        break
      case 'hammer':
        this.drawHammer(curve.tip, stickSide, color)
        break
      case 'fork':
        this.drawFork(curve.tip, forward, stickSide, color)
        break
    }
  }

  private drawQuadratic(
    curve: StickCurve,
    color: number,
    width: number,
  ): void {
    this.graphics.lineStyle(width, color, 1)
    this.graphics.beginPath()
    this.graphics.moveTo(curve.root.x, curve.root.y)

    const segments = 18
    for (let index = 1; index <= segments; index += 1) {
      const point = this.sampleQuadratic(curve, index / segments)
      this.graphics.lineTo(point.x, point.y)
    }

    this.graphics.strokePath()
  }

  private drawInnerEdge(curve: StickCurve, right: Point): void {
    const config = visualConfig.stick
    const segments = 12

    this.graphics.lineStyle(
      config.innerEdgeWidth,
      config.innerEdgeColor,
      config.innerEdgeAlpha,
    )
    this.graphics.beginPath()

    for (let index = 0; index <= segments; index += 1) {
      const progress = Phaser.Math.Linear(
        config.innerEdgeStart,
        config.innerEdgeEnd,
        index / segments,
      )
      const point = this.sampleQuadratic(curve, progress)
      const innerPoint = {
        x: point.x - right.x * config.innerEdgeOffset,
        y: point.y - right.y * config.innerEdgeOffset,
      }

      if (index === 0) {
        this.graphics.moveTo(innerPoint.x, innerPoint.y)
      } else {
        this.graphics.lineTo(innerPoint.x, innerPoint.y)
      }
    }

    this.graphics.strokePath()
  }

  private drawSocketGlow(
    socket: Point,
    state: StickActionState,
  ): void {
    const catchReady = state === 'CATCH_READY'
    const cradled =
      state === 'CRADLED_STABLE' ||
      state === 'CRADLED_CHARGING' ||
      state === 'CRADLED_OVERCHARGED'

    if (!catchReady && !cradled) {
      return
    }

    const pulse =
      cradled && state !== 'CRADLED_STABLE'
        ? 1 + Math.sin(Date.now() * 0.012) * 0.12
        : 1
    const radius = visualConfig.stick.socketGlowRadius * pulse

    this.graphics.fillStyle(
      visualConfig.stick.socketGlowColor,
      cradled ? 0.22 : 0.12,
    )
    this.graphics.fillCircle(socket.x, socket.y, radius)
    this.graphics.lineStyle(
      cradled ? 3 : 2,
      visualConfig.stick.socketGlowColor,
      cradled ? 0.9 : 0.62,
    )
    this.graphics.strokeCircle(socket.x, socket.y, radius * 0.56)
    this.graphics.fillStyle(visualConfig.stick.innerEdgeColor, 0.92)
    this.graphics.fillCircle(
      socket.x,
      socket.y,
      visualConfig.stick.socketCoreRadius,
    )
  }

  private drawHook(
    tip: Point,
    forward: Point,
    right: Point,
    color: number,
  ): void {
    const shoulder = this.offset(tip, forward, -3, right, 13)
    const end = this.offset(tip, forward, -15, right, 18)
    this.drawSegment(tip, shoulder, visualConfig.outlineColor, 17)
    this.drawSegment(shoulder, end, visualConfig.outlineColor, 17)
    this.drawSegment(tip, shoulder, color, 11)
    this.drawSegment(shoulder, end, color, 11)
    this.drawTip(end, color)
  }

  private drawCradle(
    tip: Point,
    forward: Point,
    right: Point,
    color: number,
  ): void {
    const innerStart = this.offset(tip, forward, -22, right, 4)
    const innerMid = this.offset(tip, forward, -10, right, 16)
    const innerEnd = this.offset(tip, forward, 3, right, 18)
    this.drawSegment(innerStart, innerMid, visualConfig.outlineColor, 16)
    this.drawSegment(innerMid, innerEnd, visualConfig.outlineColor, 16)
    this.drawSegment(innerStart, innerMid, color, 10)
    this.drawSegment(innerMid, innerEnd, color, 10)
    this.drawTip(innerEnd, color)
  }

  private drawHammer(tip: Point, right: Point, color: number): void {
    const halfLength = visualConfig.stick.hammerHeadLength * 0.5
    const start = {
      x: tip.x - right.x * halfLength,
      y: tip.y - right.y * halfLength,
    }
    const end = {
      x: tip.x + right.x * halfLength,
      y: tip.y + right.y * halfLength,
    }

    this.drawSegment(
      start,
      end,
      visualConfig.outlineColor,
      visualConfig.stick.hammerHeadWidth + visualConfig.stick.outlineExtra,
    )
    this.drawSegment(
      start,
      end,
      color,
      visualConfig.stick.hammerHeadWidth,
    )
  }

  private drawFork(
    tip: Point,
    forward: Point,
    right: Point,
    color: number,
  ): void {
    const root = this.offset(tip, forward, -5, right, 0)
    const leftTip = this.offset(
      tip,
      forward,
      20,
      right,
      -visualConfig.stick.forkSpread,
    )
    const rightTip = this.offset(
      tip,
      forward,
      20,
      right,
      visualConfig.stick.forkSpread,
    )

    this.drawSegment(root, leftTip, visualConfig.outlineColor, 13)
    this.drawSegment(root, rightTip, visualConfig.outlineColor, 13)
    this.drawSegment(root, leftTip, color, 8)
    this.drawSegment(root, rightTip, color, 8)
    this.drawTip(leftTip, color)
    this.drawTip(rightTip, color)
  }

  private drawWhip(curve: StickCurve, color: number): void {
    let previous = curve.root
    const segmentCount = visualConfig.stick.whipSegments

    for (let index = 1; index <= segmentCount; index += 1) {
      const progress = index / segmentCount
      const point = this.sampleQuadratic(curve, progress)
      const width = Phaser.Math.Linear(
        visualConfig.stick.thickness,
        visualConfig.stick.thickness * 0.42,
        progress,
      )

      this.drawSegment(
        previous,
        point,
        visualConfig.outlineColor,
        width + visualConfig.stick.outlineExtra,
      )
      this.drawSegment(previous, point, color, width)
      previous = point
    }

    this.drawTip(curve.tip, color, 0.72)
  }

  private drawTip(point: Point, color: number, scale = 1): void {
    const radius = visualConfig.stick.tipAccentRadius * scale
    this.graphics.fillStyle(visualConfig.outlineColor, 1)
    this.graphics.fillCircle(point.x, point.y, radius + 2)
    this.graphics.fillStyle(color, 1)
    this.graphics.fillCircle(point.x, point.y, radius)
  }

  private drawSegment(
    start: Point,
    end: Point,
    color: number,
    width: number,
  ): void {
    this.graphics.lineStyle(width, color, 1)
    this.graphics.lineBetween(start.x, start.y, end.x, end.y)
  }

  private sampleQuadratic(curve: StickCurve, t: number): Point {
    const inverse = 1 - t
    return {
      x:
        inverse * inverse * curve.root.x +
        2 * inverse * t * curve.control.x +
        t * t * curve.tip.x,
      y:
        inverse * inverse * curve.root.y +
        2 * inverse * t * curve.control.y +
        t * t * curve.tip.y,
    }
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

  private getStateColor(state: StickActionState): number {
    switch (state) {
      case 'CATCH_READY':
        return stickConfig.feedbackColors.catchReady
      case 'CRADLED_STABLE':
        return stickConfig.feedbackColors.stable
      case 'CRADLED_CHARGING':
        return stickConfig.feedbackColors.charging
      case 'CRADLED_OVERCHARGED':
        return stickConfig.feedbackColors.overcharged
      case 'SWINGING':
        return stickConfig.feedbackColors.swinging
      case 'RELEASE_RECOVERY':
        return stickConfig.feedbackColors.recovery
      case 'FUMBLED_COOLDOWN':
        return stickConfig.feedbackColors.fumbled
      default:
        return stickConfig.feedbackColors.idle
    }
  }
}
