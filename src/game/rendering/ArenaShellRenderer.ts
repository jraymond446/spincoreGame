import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'
import type { ArenaLayout } from '../arena/ArenaLayout'
import { arenaLayers } from '../arena/ArenaLayers'
import type { ArenaTheme } from '../arena/ArenaTheme'
import { hasVisualAsset } from './VisualAssetOverrides'

export class ArenaShellRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly shellAsset: Phaser.GameObjects.Image | null
  private readonly venueSign: Phaser.GameObjects.Text
  private readonly layout: ArenaLayout

  constructor(
    scene: Phaser.Scene,
    layout: ArenaLayout,
    theme: ArenaTheme,
  ) {
    this.layout = layout
    this.graphics = scene.add
      .graphics()
      .setDepth(arenaLayers.venueShell)
    this.shellAsset =
      theme.shellAsset && hasVisualAsset(scene, theme.shellAsset.key)
        ? scene.add
            .image(
              layout.venueBounds.x,
              layout.venueBounds.y,
              theme.shellAsset.key,
            )
            .setOrigin(0)
            .setDisplaySize(
              layout.venueBounds.width,
              layout.venueBounds.height,
            )
            .setDepth(arenaLayers.venueShell + 0.5)
        : null
    this.venueSign = scene.add
      .text(
        layout.court.x + layout.court.width / 2,
        layout.court.y - 56,
        theme.leagueId.replaceAll('_', ' ').toUpperCase(),
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#f2c84b',
          stroke: '#091f38',
          strokeThickness: 4,
          padding: { x: 12, y: 4 },
        },
      )
      .setOrigin(0.5)
      .setDepth(arenaLayers.venueShell + 0.75)
      .setAlpha(0.96)
  }

  draw(simplified: boolean): void {
    const left = this.layout.court.x
    const top = this.layout.court.y
    const bottom = top + this.layout.court.height
    const venueLeft = this.layout.venueBounds.x
    const venueWidth = this.layout.venueBounds.width
    const overscan = 1000
    const bottomDepth = simplified ? 88 : 160
    const venue = arenaPresentationConfig.venue

    this.graphics.clear()
    this.venueSign
      .setVisible(!simplified)
      .setPosition(left + arenaConfig.width / 2, top - 56)
    this.graphics.fillStyle(venue.floorColor, 1)
    this.graphics.fillRect(
      left - overscan,
      top - overscan,
      arenaConfig.width + overscan * 2,
      arenaConfig.height + overscan * 2,
    )

    this.drawArenaWall(left, top, simplified)
    this.drawSideStandBays(-1, venueLeft, top, simplified)
    this.drawSideStandBays(1, left + arenaConfig.width, top, simplified)
    this.drawBottomStand(
      venueLeft,
      venueWidth,
      bottom,
      bottomDepth,
      simplified,
    )
    this.drawPixelVenueTrim(left, top, bottom, simplified)

    this.graphics.fillStyle(venue.courtShadowColor, 0.22)
    this.graphics.fillRect(
      left - 13,
      top + 16,
      arenaConfig.width + 26,
      arenaConfig.height + 22,
    )
  }

  destroy(): void {
    this.graphics.destroy()
    this.shellAsset?.destroy()
    this.venueSign.destroy()
  }

  private drawArenaWall(
    left: number,
    top: number,
    simplified: boolean,
  ): void {
    const margin = arenaPresentationConfig.sidelineDecorationWidth
    const totalWidth = arenaConfig.width + margin * 2
    const wallX = left - margin
    const wallY = top - (simplified ? 34 : 52)

    this.graphics.fillStyle(visualStyleConfig.venue.shadow, 0.18)
    this.graphics.fillRoundedRect(
      wallX + 8,
      wallY + 9,
      totalWidth - 16,
      simplified ? 42 : 58,
      9,
    )
    this.graphics.fillStyle(visualStyleConfig.venue.stand, 1)
    this.graphics.fillRoundedRect(
      wallX,
      wallY,
      totalWidth,
      simplified ? 42 : 58,
      9,
    )
    this.graphics.fillStyle(visualStyleConfig.venue.standShade, 1)
    this.graphics.fillRect(
      wallX + 12,
      wallY + (simplified ? 27 : 39),
      totalWidth - 24,
      simplified ? 9 : 12,
    )
    this.graphics.fillStyle(0x1aa3b1, 0.9)
    this.graphics.fillRect(
      wallX + 28,
      wallY + (simplified ? 31 : 44),
      totalWidth - 56,
      5,
    )

    if (!simplified) {
      const panelWidth = 86
      const gap = 42
      const panelCount = Math.floor((totalWidth - 150) / (panelWidth + gap))

      for (let index = 0; index < panelCount; index += 1) {
        const x =
          wallX +
          75 +
          index * (panelWidth + gap)
        this.drawSignPanel(
          x,
          wallY + 10,
          panelWidth,
          22,
          index % 2 === 0 ? 0x1aa3b1 : 0x3289c8,
        )
      }
    }
  }

  private drawSideStandBays(
    side: -1 | 1,
    baseX: number,
    top: number,
    simplified: boolean,
  ): void {
    const bays = simplified
      ? [
          { y: 0.1, height: 0.23 },
          { y: 0.71, height: 0.21 },
        ]
      : [
          { y: 0.065, height: 0.245 },
          { y: 0.335, height: 0.14 },
          { y: 0.68, height: 0.25 },
        ]

    bays.forEach((bay, index) => {
      this.drawStandBay(
        side,
        baseX,
        top + arenaConfig.height * bay.y,
        arenaConfig.height * bay.height,
        index,
        simplified,
      )
    })
  }

  private drawStandBay(
    side: -1 | 1,
    baseX: number,
    y: number,
    height: number,
    index: number,
    simplified: boolean,
  ): void {
    const venue = arenaPresentationConfig.venue
    const width = arenaPresentationConfig.sidelineDecorationWidth
    const outerX = side < 0 ? baseX + 7 : baseX + 25
    const bayWidth = width - 32
    const courtEdgeX = side < 0 ? baseX + width : baseX
    const tierCount = simplified ? 2 : 3

    this.graphics.fillStyle(venue.courtShadowColor, 0.2)
    this.graphics.fillRoundedRect(
      outerX + (side < 0 ? -5 : 5),
      y + 9,
      bayWidth,
      height,
      10,
    )
    this.graphics.fillStyle(venue.seatingColor, 1)
    this.graphics.fillRoundedRect(outerX, y, bayWidth, height, 9)
    this.graphics.lineStyle(3, visualStyleConfig.venue.standInset, 0.88)
    this.graphics.strokeRoundedRect(outerX, y, bayWidth, height, 9)

    const aisleWidth = simplified ? 12 : 15
    const aisleX =
      outerX + bayWidth * (index % 2 === 0 ? 0.42 : 0.56)

    for (let tier = 0; tier < tierCount; tier += 1) {
      const inset = 8 + tier * 9
      const tierY = y + 9 + tier * ((height - 18) / tierCount)
      const tierHeight = Math.max(23, (height - 18) / tierCount - 5)
      const tierWidth = bayWidth - 16 - tier * 10
      const tierX =
        side < 0
          ? outerX + inset
          : outerX + bayWidth - tierWidth - inset

      this.graphics.fillStyle(
        tier % 2 === 0
          ? venue.seatingColor
          : venue.concourseColor,
        1,
      )
      this.graphics.fillRoundedRect(
        tierX,
        tierY,
        tierWidth,
        tierHeight,
        5,
      )
      this.graphics.fillStyle(venue.standShade, 0.72)
      this.graphics.fillRect(
        tierX + 5,
        tierY + tierHeight - 7,
        tierWidth - 10,
        5,
      )
      this.graphics.lineStyle(2, venue.seatingStripeColor, 0.74)
      for (
        let rowY = tierY + 8;
        rowY < tierY + tierHeight - 7;
        rowY += 14
      ) {
        this.graphics.lineBetween(
          tierX + 7,
          rowY,
          tierX + tierWidth - 7,
          rowY,
        )
      }
    }

    this.graphics.fillStyle(venue.aisleColor, 0.86)
    this.graphics.fillRoundedRect(
      aisleX - aisleWidth / 2,
      y + 8,
      aisleWidth,
      height - 16,
      3,
    )
    this.graphics.lineStyle(2, venue.railColor, 0.92)
    for (let step = 0; step < 4; step += 1) {
      const railY = y + 18 + step * ((height - 36) / 3)
      this.graphics.lineBetween(
        aisleX - aisleWidth / 2 - 2,
        railY,
        aisleX + aisleWidth / 2 + 2,
        railY,
      )
    }

    this.graphics.fillStyle(
      index % 2 === 0 ? 0x1aa3b1 : 0x3289c8,
      0.92,
    )
    this.graphics.fillRoundedRect(
      side < 0 ? courtEdgeX - 15 : courtEdgeX + 5,
      y + 12,
      10,
      height - 24,
      4,
    )
    this.graphics.lineStyle(5, venue.railColor, 0.98)
    this.graphics.lineBetween(
      side < 0 ? courtEdgeX - 3 : courtEdgeX + 3,
      y + 8,
      side < 0 ? courtEdgeX - 3 : courtEdgeX + 3,
      y + height - 8,
    )

    if (!simplified && height > 180) {
      this.drawSignPanel(
        outerX + 20,
        y + height - 36,
        bayWidth - 40,
        18,
        index % 2 === 0 ? 0x3289c8 : 0x1aa3b1,
      )
    }
  }

  private drawBottomStand(
    x: number,
    width: number,
    bottom: number,
    depth: number,
    simplified: boolean,
  ): void {
    const venue = arenaPresentationConfig.venue
    const tiers = simplified ? 2 : 3

    this.graphics.fillStyle(venue.courtShadowColor, 0.2)
    this.graphics.fillRoundedRect(x + 8, bottom + 39, width - 16, depth, 11)
    this.graphics.fillStyle(venue.seatingColor, 1)
    this.graphics.fillRoundedRect(x, bottom + 28, width, depth, 10)
    this.graphics.lineStyle(3, venue.seatingStripeColor, 0.82)
    this.graphics.strokeRoundedRect(x, bottom + 28, width, depth, 10)

    for (let tier = 0; tier < tiers; tier += 1) {
      const inset = 18 + tier * 30
      const tierY = bottom + 40 + tier * 36
      this.graphics.fillStyle(
        tier % 2 === 0 ? venue.seatingColor : venue.concourseColor,
        1,
      )
      this.graphics.fillRoundedRect(
        x + inset,
        tierY,
        width - inset * 2,
        29,
        5,
      )
      this.graphics.fillStyle(venue.standShade, 0.7)
      this.graphics.fillRect(
        x + inset + 7,
        tierY + 23,
        width - inset * 2 - 14,
        5,
      )
    }

    this.graphics.fillStyle(0x1aa3b1, 0.92)
    this.graphics.fillRoundedRect(x + 14, bottom + 29, width - 28, 8, 4)
    this.graphics.lineStyle(5, venue.railColor, 0.98)
    this.graphics.lineBetween(x + 14, bottom + 28, x + width - 14, bottom + 28)

    if (!simplified) {
      const aisleWidth = 28
      for (const ratio of [0.24, 0.5, 0.76]) {
        const aisleX = x + width * ratio
        this.graphics.fillStyle(venue.aisleColor, 0.82)
        this.graphics.fillRoundedRect(
          aisleX - aisleWidth / 2,
          bottom + 39,
          aisleWidth,
          depth - 20,
          4,
        )
      }
    }
  }

  private drawSignPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): void {
    this.graphics.fillStyle(visualStyleConfig.outline, 0.92)
    this.graphics.fillRect(x - 3, y - 3, width + 6, height + 6)
    this.graphics.fillStyle(visualStyleConfig.venue.rail, 0.92)
    this.graphics.fillRect(x - 1, y - 1, width + 2, height + 2)
    this.graphics.fillStyle(color, 0.94)
    this.graphics.fillRect(x, y, width, height)
    this.graphics.fillStyle(0xffffff, 0.58)
    this.graphics.fillRect(
      x + width * 0.18,
      y + height * 0.42,
      width * 0.64,
      3,
    )
  }

  private drawPixelVenueTrim(
    left: number,
    top: number,
    bottom: number,
    simplified: boolean,
  ): void {
    const margin = arenaPresentationConfig.sidelineDecorationWidth
    const right = left + arenaConfig.width
    const trimWidth = simplified ? 15 : 22
    const railOffset = simplified ? 18 : 24
    const markerStep = simplified ? 126 : 92

    this.graphics.fillStyle(visualStyleConfig.outline, 0.86)
    this.graphics.fillRect(
      left - railOffset,
      top - 6,
      trimWidth,
      arenaConfig.height + 12,
    )
    this.graphics.fillRect(
      right + railOffset - trimWidth,
      top - 6,
      trimWidth,
      arenaConfig.height + 12,
    )
    this.graphics.fillStyle(visualStyleConfig.venue.rail, 1)
    this.graphics.fillRect(
      left - railOffset + 4,
      top,
      trimWidth - 8,
      arenaConfig.height,
    )
    this.graphics.fillRect(
      right + railOffset - trimWidth + 4,
      top,
      trimWidth - 8,
      arenaConfig.height,
    )

    this.graphics.fillStyle(0x1aa3b1, 0.9)
    for (let y = top + 58; y < bottom - 58; y += markerStep) {
      this.graphics.fillRect(left - railOffset - 5, y, 7, 34)
      this.graphics.fillRect(right + railOffset - 2, y, 7, 34)
      this.graphics.fillStyle(visualStyleConfig.venue.rail, 0.8)
      this.graphics.fillRect(left - railOffset - 7, y + 12, 11, 4)
      this.graphics.fillRect(right + railOffset - 4, y + 12, 11, 4)
      this.graphics.fillStyle(0x1aa3b1, 0.9)
    }

    const cornerPad = 42
    this.drawPixelPlanter(left - margin + 28, top - 28, 1)
    this.drawPixelPlanter(right + margin - 64, top - 28, -1)
    this.drawPixelPlanter(left - margin + cornerPad, bottom + 18, 1)
    this.drawPixelPlanter(right + margin - cornerPad - 36, bottom + 18, -1)
  }

  private drawPixelPlanter(x: number, y: number, direction: -1 | 1): void {
    this.graphics.fillStyle(visualStyleConfig.outline, 0.82)
    this.graphics.fillRect(x - 3, y + 24, 38, 18)
    this.graphics.fillStyle(0xd7b06a, 1)
    this.graphics.fillRect(x, y + 26, 32, 12)
    this.graphics.fillStyle(0x1d7048, 1)
    this.graphics.fillRect(x + 7, y + 12, 18, 18)
    this.graphics.fillStyle(0x36a958, 1)
    this.graphics.fillRect(x + 3, y + 19, 15, 12)
    this.graphics.fillRect(x + 17, y + 17, 17, 13)
    this.graphics.fillStyle(0x72c86c, 1)
    this.graphics.fillRect(x + 12 + direction * 2, y + 8, 12, 12)
  }
}
