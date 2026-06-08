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
  } = options
  const bodyY = y + (pose === 'standing' ? 5 : 7) * scale
  const headY = y - 4.5 * scale
  const headRadius = 7.8 * scale
  const bodyWidth = (pose === 'standing' ? 15 : 16.5) * scale
  const bodyHeight = (pose === 'standing' ? 13 : 10.5) * scale

  graphics.fillStyle(visualStyleConfig.venue.shadow, alpha * 0.16)
  graphics.fillEllipse(
    x,
    y + (pose === 'standing' ? 14 : 11) * scale,
    21 * scale,
    7 * scale,
  )

  graphics.fillStyle(visualStyleConfig.outline, alpha * 0.78)
  graphics.fillRoundedRect(
    x - bodyWidth / 2 - 1.5 * scale,
    bodyY - bodyHeight / 2 - 1.5 * scale,
    bodyWidth + 3 * scale,
    bodyHeight + 3 * scale,
    4.5 * scale,
  )
  graphics.fillStyle(variant.shirtColor, alpha)
  graphics.fillRoundedRect(
    x - bodyWidth / 2,
    bodyY - bodyHeight / 2,
    bodyWidth,
    bodyHeight,
    4 * scale,
  )
  graphics.fillStyle(variant.shirtTrim, alpha * 0.9)
  graphics.fillRect(
    x - bodyWidth * 0.34,
    bodyY - bodyHeight * 0.28,
    bodyWidth * 0.68,
    Math.max(1.5, 2.2 * scale),
  )

  if (pose === 'standing') {
    graphics.fillStyle(visualStyleConfig.outline, alpha * 0.72)
    graphics.fillRoundedRect(
      x - bodyWidth * 0.3,
      bodyY + bodyHeight * 0.25,
      bodyWidth * 0.6,
      6 * scale,
      2 * scale,
    )
  }

  graphics.fillStyle(visualStyleConfig.outline, alpha * 0.86)
  graphics.fillCircle(x, headY, headRadius + 1.8 * scale)
  graphics.fillStyle(variant.skinColor, alpha)
  graphics.fillCircle(x, headY, headRadius)
  graphics.fillStyle(variant.skinShade, alpha * 0.3)
  graphics.fillCircle(
    x + facing * headRadius * 0.32,
    headY + headRadius * 0.26,
    headRadius * 0.52,
  )

  drawHair(graphics, x, headY, headRadius, variant, alpha, facing)

  graphics.fillStyle(visualStyleConfig.outline, alpha * 0.78)
  graphics.fillCircle(
    x + facing * headRadius * 0.34,
    headY + headRadius * 0.24,
    Math.max(1, 1.25 * scale),
  )
}

function drawHair(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  variant: CrowdVariant,
  alpha: number,
  facing: -1 | 1,
): void {
  graphics.fillStyle(variant.hairColor, alpha)

  switch (variant.hairStyle) {
    case 'cap':
      graphics.fillEllipse(x, y - radius * 0.34, radius * 1.9, radius * 1.18)
      graphics.fillRoundedRect(
        x - radius * 0.88,
        y - radius * 0.42,
        radius * 1.76,
        radius * 0.42,
        radius * 0.12,
      )
      graphics.fillRect(
        facing > 0
          ? x + radius * 0.35
          : x - radius * 1.17,
        y - radius * 0.05,
        radius * 0.82,
        radius * 0.18,
      )
      break
    case 'bob':
      graphics.fillEllipse(x, y - radius * 0.12, radius * 1.9, radius * 1.72)
      graphics.fillStyle(variant.skinColor, alpha)
      graphics.fillEllipse(
        x + facing * radius * 0.3,
        y + radius * 0.22,
        radius * 0.92,
        radius * 0.72,
      )
      break
    case 'tuft':
      graphics.fillEllipse(x, y - radius * 0.38, radius * 1.82, radius)
      graphics.fillTriangle(
        x - radius * 0.7,
        y - radius * 0.64,
        x - radius * 0.18,
        y - radius * 0.75,
        x - radius * 0.42,
        y - radius * 1.22,
      )
      graphics.fillTriangle(
        x + radius * 0.06,
        y - radius * 0.72,
        x + radius * 0.62,
        y - radius * 0.57,
        x + radius * 0.38,
        y - radius * 1.13,
      )
      break
    case 'spikes':
      graphics.fillEllipse(x, y - radius * 0.34, radius * 1.78, radius * 1.02)
      for (const side of [-1, 0, 1]) {
        const baseX = x + side * radius * 0.48
        graphics.fillTriangle(
          baseX - radius * 0.3,
          y - radius * 0.54,
          baseX + radius * 0.3,
          y - radius * 0.54,
          baseX + side * radius * 0.16,
          y - radius * (1.08 + Math.abs(side) * 0.12),
        )
      }
      break
    default:
      graphics.fillEllipse(x, y - radius * 0.36, radius * 1.82, radius * 1.08)
      graphics.fillRoundedRect(
        x - radius * 0.78,
        y - radius * 0.2,
        radius * 1.1,
        radius * 0.42,
        radius * 0.12,
      )
  }
}
