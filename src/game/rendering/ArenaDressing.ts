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
    const bottomDepth = this.simplified ? 104 : 170
    const venue = arenaPresentationConfig.venue

    this.backdrop.clear()
    this.backdrop.fillStyle(venue.floorColor, 1)
    this.backdrop.fillRect(
      left - backdropOverscan,
      top - backdropOverscan,
      arenaConfig.width + backdropOverscan * 2,
      arenaConfig.height + backdropOverscan * 2,
    )

    this.backdrop.fillStyle(venue.seatingColor, 0.92)
    this.backdrop.fillRect(
      venueLeft,
      top + arenaConfig.height * 0.3,
      margin - 34,
      arenaConfig.height * 0.7 + bottomDepth,
    )
    this.backdrop.fillRect(
      left + arenaConfig.width + 34,
      top + arenaConfig.height * 0.3,
      margin - 34,
      arenaConfig.height * 0.7 + bottomDepth,
    )
    this.backdrop.fillRect(
      venueLeft,
      bottom + 22,
      venueWidth,
      bottomDepth,
    )

    this.backdrop.fillStyle(venue.concourseColor, 0.78)
    this.backdrop.fillRect(venueLeft, bottom + 7, venueWidth, 24)

    this.backdrop.lineStyle(3, venue.seatingStripeColor, 0.62)
    for (let y = top + arenaConfig.height * 0.38; y < bottom; y += 74) {
      this.backdrop.lineBetween(venueLeft + 10, y, left - 38, y)
      this.backdrop.lineBetween(
        left + arenaConfig.width + 38,
        y,
        venueLeft + venueWidth - 10,
        y,
      )
    }

    for (let y = bottom + 54; y < bottom + bottomDepth; y += 34) {
      this.backdrop.lineBetween(venueLeft + 12, y, venueLeft + venueWidth - 12, y)
    }

    this.backdrop.fillStyle(venue.courtShadowColor, 0.34)
    this.backdrop.fillRoundedRect(
      left - 13,
      top + 16,
      arenaConfig.width + 26,
      arenaConfig.height + 22,
      arenaConfig.cornerRadius + 8,
    )

    this.backdrop.lineStyle(4, venue.railColor, 0.42)
    this.backdrop.lineBetween(left - 34, top + 420, left - 34, bottom + 8)
    this.backdrop.lineBetween(
      left + arenaConfig.width + 34,
      top + 420,
      left + arenaConfig.width + 34,
      bottom + 8,
    )
    this.backdrop.lineBetween(
      venueLeft,
      bottom + 30,
      venueLeft + venueWidth,
      bottom + 30,
    )
  }
}
