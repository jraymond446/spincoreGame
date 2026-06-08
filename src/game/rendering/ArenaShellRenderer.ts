import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'

export class ArenaShellRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-30)
  }

  draw(simplified: boolean): void {
    const margin = arenaPresentationConfig.sidelineDecorationWidth
    const left = arenaConfig.center.x - arenaConfig.width / 2
    const top = arenaConfig.center.y - arenaConfig.height / 2
    const bottom = top + arenaConfig.height
    const venueLeft = left - margin
    const venueWidth = arenaConfig.width + margin * 2
    const overscan = 1000
    const bottomDepth = simplified ? 88 : 160
    const venue = arenaPresentationConfig.venue

    this.graphics.clear()
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

    this.graphics.fillStyle(venue.courtShadowColor, 0.22)
    this.graphics.fillRoundedRect(
      left - 13,
      top + 16,
      arenaConfig.width + 26,
      arenaConfig.height + 22,
      arenaConfig.cornerRadius + 8,
    )
  }

  destroy(): void {
    this.graphics.destroy()
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
    this.graphics.fillRoundedRect(x - 2, y - 2, width + 4, height + 4, 4)
    this.graphics.fillStyle(color, 0.94)
    this.graphics.fillRoundedRect(x, y, width, height, 3)
    this.graphics.fillStyle(0xffffff, 0.58)
    this.graphics.fillRect(
      x + width * 0.18,
      y + height * 0.42,
      width * 0.64,
      3,
    )
  }
}
