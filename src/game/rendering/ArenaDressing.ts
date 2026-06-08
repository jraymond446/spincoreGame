import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { BenchRenderer } from './BenchRenderer'
import { CrowdRenderer } from './CrowdRenderer'

export class ArenaDressing {
  private readonly backdrop: Phaser.GameObjects.Graphics
  private readonly crowd: CrowdRenderer
  private readonly benches: BenchRenderer
  private simplified = false

  constructor(scene: Phaser.Scene) {
    this.backdrop = scene.add.graphics().setDepth(-30)
    this.crowd = new CrowdRenderer(scene)
    this.benches = new BenchRenderer(scene)
    this.layout(scene.scale.width)
  }

  layout(viewportWidth: number): void {
    const simplified =
      viewportWidth <= arenaPresentationConfig.mobileBreakpoint

    this.simplified = simplified
    this.drawBackdrop()
    this.crowd.setSimplified(simplified)
    this.benches.draw(simplified)
  }

  update(time: number): void {
    this.crowd.update(time)
  }

  destroy(): void {
    this.backdrop.destroy()
    this.crowd.destroy()
    this.benches.destroy()
  }

  private drawBackdrop(): void {
    const margin = arenaPresentationConfig.sidelineDecorationWidth
    const left = arenaConfig.center.x - arenaConfig.width / 2
    const top = arenaConfig.center.y - arenaConfig.height / 2
    const bottom = top + arenaConfig.height
    const venueLeft = left - margin
    const venueWidth = arenaConfig.width + margin * 2
    const backdropOverscan = 1000
    const bottomDepth = this.simplified ? 82 : 154
    const venue = arenaPresentationConfig.venue

    this.backdrop.clear()
    this.backdrop.fillStyle(venue.floorColor, 1)
    this.backdrop.fillRect(
      left - backdropOverscan,
      top - backdropOverscan,
      arenaConfig.width + backdropOverscan * 2,
      arenaConfig.height + backdropOverscan * 2,
    )

    this.drawSideStandBays(-1, venueLeft, top)
    this.drawSideStandBays(1, left + arenaConfig.width, top)

    if (!this.simplified) {
      const benchTop = top + arenaConfig.height * 0.49
      const benchHeight = arenaPresentationConfig.bench.height + 32

      this.backdrop.fillStyle(venue.concourseColor, 0.96)
      this.backdrop.fillRoundedRect(
        venueLeft + 10,
        benchTop,
        margin - 32,
        benchHeight,
        10,
      )
      this.backdrop.fillRoundedRect(
        left + arenaConfig.width + 22,
        benchTop,
        margin - 32,
        benchHeight,
        10,
      )
    }

    this.drawBottomStand(venueLeft, venueWidth, bottom, bottomDepth)

    this.backdrop.fillStyle(venue.courtShadowColor, 0.22)
    this.backdrop.fillRoundedRect(
      left - 13,
      top + 16,
      arenaConfig.width + 26,
      arenaConfig.height + 22,
      arenaConfig.cornerRadius + 8,
    )

  }

  private drawSideStandBays(
    side: -1 | 1,
    baseX: number,
    top: number,
  ): void {
    const bayLayouts = this.simplified
      ? [
          { y: 0.11, height: 0.22 },
          { y: 0.72, height: 0.2 },
        ]
      : [
          { y: 0.07, height: 0.24 },
          { y: 0.34, height: 0.13 },
          { y: 0.69, height: 0.24 },
        ]

    bayLayouts.forEach((layout, index) => {
      this.drawStandBay(
        side,
        baseX,
        top + arenaConfig.height * layout.y,
        arenaConfig.height * layout.height,
        index,
      )
    })
  }

  private drawStandBay(
    side: -1 | 1,
    baseX: number,
    y: number,
    height: number,
    index: number,
  ): void {
    const venue = arenaPresentationConfig.venue
    const width = arenaPresentationConfig.sidelineDecorationWidth
    const outerX = side < 0 ? baseX + 8 : baseX + 24
    const bayWidth = width - 32
    const courtEdgeX = side < 0 ? baseX + width : baseX

    this.backdrop.fillStyle(venue.courtShadowColor, 0.2)
    this.backdrop.fillRoundedRect(
      outerX + (side < 0 ? -4 : 4),
      y + 8,
      bayWidth,
      height,
      12,
    )

    this.backdrop.fillStyle(venue.seatingColor, 1)
    this.backdrop.fillRoundedRect(outerX, y, bayWidth, height, 10)

    for (let tier = 0; tier < 3; tier += 1) {
      const inset = 8 + tier * 11
      const tierY = y + 10 + tier * (height / 3)
      const tierHeight = Math.max(18, height / 3 - 7)
      const tierX =
        side < 0 ? outerX + inset : outerX + bayWidth - inset - (bayWidth - 36 - tier * 11)
      const tierWidth = bayWidth - 36 - tier * 11

      this.backdrop.fillStyle(
        tier % 2 === 0 ? venue.seatingColor : venue.concourseColor,
        1,
      )
      this.backdrop.fillRoundedRect(
        tierX,
        tierY,
        tierWidth,
        tierHeight,
        6,
      )
      this.backdrop.lineStyle(3, venue.seatingStripeColor, 0.7)
      this.backdrop.lineBetween(
        tierX + 7,
        tierY + tierHeight - 4,
        tierX + tierWidth - 7,
        tierY + tierHeight - 4,
      )
    }

    this.backdrop.fillStyle(
      index % 2 === 0 ? 0x1aa3b1 : 0x3289c8,
      0.88,
    )
    this.backdrop.fillRoundedRect(
      side < 0 ? courtEdgeX - 12 : courtEdgeX + 4,
      y + 14,
      8,
      height - 28,
      4,
    )
    this.backdrop.lineStyle(5, venue.railColor, 0.98)
    this.backdrop.lineBetween(
      side < 0 ? courtEdgeX - 3 : courtEdgeX + 3,
      y + 10,
      side < 0 ? courtEdgeX - 3 : courtEdgeX + 3,
      y + height - 10,
    )
  }

  private drawBottomStand(
    x: number,
    width: number,
    bottom: number,
    depth: number,
  ): void {
    const venue = arenaPresentationConfig.venue

    this.backdrop.fillStyle(venue.courtShadowColor, 0.2)
    this.backdrop.fillRoundedRect(x + 8, bottom + 38, width - 16, depth, 12)
    this.backdrop.fillStyle(venue.seatingColor, 1)
    this.backdrop.fillRoundedRect(x, bottom + 28, width, depth, 10)

    for (let tier = 0; tier < 3; tier += 1) {
      const inset = 16 + tier * 26
      const tierY = bottom + 40 + tier * 35
      this.backdrop.fillStyle(
        tier % 2 === 0 ? venue.seatingColor : venue.concourseColor,
        1,
      )
      this.backdrop.fillRoundedRect(
        x + inset,
        tierY,
        width - inset * 2,
        28,
        6,
      )
      this.backdrop.lineStyle(3, venue.seatingStripeColor, 0.68)
      this.backdrop.lineBetween(
        x + inset + 10,
        tierY + 24,
        x + width - inset - 10,
        tierY + 24,
      )
    }

    this.backdrop.fillStyle(0x1aa3b1, 0.9)
    this.backdrop.fillRoundedRect(x + 14, bottom + 29, width - 28, 8, 4)
    this.backdrop.lineStyle(5, venue.railColor, 0.96)
    this.backdrop.lineBetween(x + 14, bottom + 28, x + width - 14, bottom + 28)
  }
}
