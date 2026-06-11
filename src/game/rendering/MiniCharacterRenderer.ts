import Phaser from 'phaser'
import { visualStyleConfig } from '../config/visualStyleConfig'
import type { CrowdVariant } from '../data/crowdVariants'

export type MiniCharacterPose = 'seated' | 'standing'

export type MiniCharacterOptions = {
  x: number
  y: number
  scale: number
  alpha: number
  variant: CrowdVariant
  pose?: MiniCharacterPose
  facing?: -1 | 1
  rotation?: number
}

export function drawMiniCharacter(
  graphics: Phaser.GameObjects.Graphics,
  options: MiniCharacterOptions,
): void {
  const {
    x,
    y,
    scale,
    alpha,
    variant,
    pose = 'seated',
    facing = 1,
    rotation = facing > 0 ? 0 : Math.PI,
  } = options
  const forward = {
    x: Math.cos(rotation),
    y: Math.sin(rotation),
  }
  const right = { x: -forward.y, y: forward.x }
  const bodyLength = (pose === 'standing' ? 18 : 15) * scale
  const bodyWidth = (pose === 'standing' ? 17 : 18) * scale
  const headRadius = 6.4 * scale
  const bodyCenter = offset(
    { x, y },
    forward,
    -2.5 * scale,
    right,
    0,
  )
  const headCenter = offset(
    { x, y },
    forward,
    9 * scale,
    right,
    0,
  )
  const rear = offset(
    bodyCenter,
    forward,
    -bodyLength * 0.58,
    right,
    0,
  )

  graphics.fillStyle(visualStyleConfig.venue.shadow, alpha * 0.16)
  graphics.fillEllipse(
    x,
    y + 4 * scale,
    24 * scale,
    10 * scale,
  )

  const lowerBody = [
    offset(rear, forward, bodyLength * 0.2, right, -bodyWidth * 0.34),
    offset(rear, forward, bodyLength * 0.2, right, bodyWidth * 0.34),
    offset(rear, forward, -bodyLength * 0.2, right, bodyWidth * 0.24),
    offset(rear, forward, -bodyLength * 0.28, right, 0),
    offset(rear, forward, -bodyLength * 0.2, right, -bodyWidth * 0.24),
  ]
  fillAndStrokePolygon(
    graphics,
    lowerBody,
    variant.shirtTrim,
    alpha,
    scale,
  )

  const halfLength = bodyLength * 0.5
  const halfWidth = bodyWidth * 0.5
  const torso = [
    offset(bodyCenter, forward, halfLength, right, -halfWidth * 0.7),
    offset(bodyCenter, forward, halfLength, right, halfWidth * 0.7),
    offset(bodyCenter, forward, -halfLength * 0.76, right, halfWidth),
    offset(bodyCenter, forward, -halfLength, right, halfWidth * 0.58),
    offset(bodyCenter, forward, -halfLength, right, -halfWidth * 0.58),
    offset(bodyCenter, forward, -halfLength * 0.76, right, -halfWidth),
  ]
  fillAndStrokePolygon(
    graphics,
    torso,
    variant.shirtColor,
    alpha,
    scale,
  )

  const armWidth = Math.max(2.5, 3.5 * scale)
  for (const side of [-1, 1]) {
    const hand = offset(
      bodyCenter,
      forward,
      bodyLength * (pose === 'standing' ? 0.22 : 0.08),
      right,
      bodyWidth * 0.62 * side,
    )
    graphics.lineStyle(
      armWidth + 2 * scale,
      visualStyleConfig.outline,
      alpha * 0.82,
    )
    graphics.lineBetween(bodyCenter.x, bodyCenter.y, hand.x, hand.y)
    graphics.lineStyle(armWidth, variant.skinColor, alpha)
    graphics.lineBetween(bodyCenter.x, bodyCenter.y, hand.x, hand.y)
    graphics.fillStyle(variant.shirtTrim, alpha)
    graphics.fillCircle(hand.x, hand.y, armWidth * 0.54)
  }

  const stripeStart = offset(
    bodyCenter,
    forward,
    halfLength * 0.3,
    right,
    -halfWidth * 0.55,
  )
  const stripeEnd = offset(
    bodyCenter,
    forward,
    halfLength * 0.3,
    right,
    halfWidth * 0.55,
  )
  graphics.lineStyle(Math.max(1.5, 2.2 * scale), variant.shirtTrim, alpha)
  graphics.lineBetween(stripeStart.x, stripeStart.y, stripeEnd.x, stripeEnd.y)

  graphics.fillStyle(visualStyleConfig.outline, alpha * 0.88)
  graphics.fillCircle(
    headCenter.x,
    headCenter.y,
    headRadius + 1.8 * scale,
  )
  graphics.fillStyle(variant.skinColor, alpha)
  graphics.fillCircle(headCenter.x, headCenter.y, headRadius)
  graphics.fillStyle(variant.skinShade, alpha * 0.3)
  graphics.fillCircle(
    headCenter.x + right.x * headRadius * 0.3,
    headCenter.y + right.y * headRadius * 0.3,
    headRadius * 0.52,
  )

  drawTopDownHair(
    graphics,
    headCenter,
    forward,
    right,
    headRadius,
    variant,
    alpha,
  )
  graphics.fillStyle(visualStyleConfig.outline, alpha * 0.76)
  graphics.fillCircle(
    headCenter.x + forward.x * headRadius * 0.38,
    headCenter.y + forward.y * headRadius * 0.38,
    Math.max(1, 1.25 * scale),
  )
}

function drawTopDownHair(
  graphics: Phaser.GameObjects.Graphics,
  center: { x: number; y: number },
  forward: { x: number; y: number },
  right: { x: number; y: number },
  radius: number,
  variant: CrowdVariant,
  alpha: number,
): void {
  const rear = offset(center, forward, -radius * 0.34, right, 0)
  graphics.fillStyle(variant.hairColor, alpha)
  const hairRadius =
    variant.hairStyle === 'bob' ? radius * 0.9 : radius * 0.76
  graphics.fillCircle(rear.x, rear.y, hairRadius)

  if (variant.hairStyle === 'cap') {
    const brim = offset(center, forward, radius * 0.55, right, 0)
    graphics.lineStyle(radius * 0.34, variant.hairColor, alpha)
    graphics.lineBetween(center.x, center.y, brim.x, brim.y)
  } else if (
    variant.hairStyle === 'tuft' ||
    variant.hairStyle === 'spikes'
  ) {
    for (const side of [-1, 1]) {
      const base = offset(
        rear,
        forward,
        -radius * 0.34,
        right,
        radius * 0.32 * side,
      )
      const tip = offset(
        base,
        forward,
        -radius * 0.6,
        right,
        radius * 0.18 * side,
      )
      graphics.fillTriangle(
        base.x - right.x * radius * 0.2,
        base.y - right.y * radius * 0.2,
        base.x + right.x * radius * 0.2,
        base.y + right.y * radius * 0.2,
        tip.x,
        tip.y,
      )
    }
  }
}

function offset(
  origin: { x: number; y: number },
  forward: { x: number; y: number },
  forwardDistance: number,
  right: { x: number; y: number },
  rightDistance: number,
): { x: number; y: number } {
  return {
    x:
      origin.x +
      forward.x * forwardDistance +
      right.x * rightDistance,
    y:
      origin.y +
      forward.y * forwardDistance +
      right.y * rightDistance,
  }
}

function fillAndStrokePolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: { x: number; y: number }[],
  color: number,
  alpha: number,
  scale: number,
): void {
  graphics.fillStyle(color, alpha)
  graphics.lineStyle(
    Math.max(1.5, 2.2 * scale),
    visualStyleConfig.outline,
    alpha * 0.82,
  )
  graphics.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      graphics.moveTo(point.x, point.y)
    } else {
      graphics.lineTo(point.x, point.y)
    }
  })
  graphics.closePath()
  graphics.fillPath()
  graphics.strokePath()
}
