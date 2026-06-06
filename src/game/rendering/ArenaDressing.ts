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
    const bottomDepth = this.simplified ? 88 : 142
    const venue = arenaPresentationConfig.venue

    this.backdrop.clear()
    this.backdrop.fillStyle(venue.floorColor, 1)
    this.backdrop.fillRect(
      left - backdropOverscan,
      top - backdropOverscan,
      arenaConfig.width + backdropOverscan * 2,
      arenaConfig.height + backdropOverscan * 2,
    )

    if (!this.simplified) {
      const benchTop = top + arenaConfig.height * 0.48
      const benchHeight = arenaPresentationConfig.bench.height + 44

      this.backdrop.fillStyle(venue.concourseColor, 0.42)
      this.backdrop.fillRoundedRect(
        venueLeft + 12,
        benchTop,
        margin - 48,
        benchHeight,
        12,
      )
      this.backdrop.fillRoundedRect(
        left + arenaConfig.width + 36,
        benchTop,
        margin - 48,
        benchHeight,
        12,
      )
    }

    this.backdrop.fillStyle(venue.seatingColor, 0.7)
    this.backdrop.fillRect(
      venueLeft,
      bottom + 28,
      venueWidth,
      bottomDepth,
    )

    this.backdrop.fillStyle(venue.concourseColor, 0.7)
    this.backdrop.fillRoundedRect(
      venueLeft,
      bottom + 10,
      venueWidth,
      24,
      7,
    )

    this.backdrop.fillStyle(venue.courtShadowColor, 0.34)
    this.backdrop.fillRoundedRect(
      left - 13,
      top + 16,
      arenaConfig.width + 26,
      arenaConfig.height + 22,
      arenaConfig.cornerRadius + 8,
    )

    this.backdrop.lineStyle(2, venue.seatingStripeColor, 0.46)
    for (let y = bottom + 58; y < bottom + bottomDepth; y += 32) {
      this.backdrop.lineBetween(
        venueLeft + 18,
        y,
        venueLeft + venueWidth - 18,
        y,
      )
    }
  }
}
