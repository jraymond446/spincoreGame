import Phaser from 'phaser'
import type { ArenaLayout, ArenaRect } from '../arena/ArenaLayout'
import { arenaLayers } from '../arena/ArenaLayers'

export class ArenaGeometryOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[] = []
  private readonly scene: Phaser.Scene
  private layout: ArenaLayout

  constructor(
    scene: Phaser.Scene,
    layout: ArenaLayout,
  ) {
    this.scene = scene
    this.layout = layout
    this.graphics = scene.add.graphics().setDepth(arenaLayers.geometryOverlay)
    this.setVisible(false)
  }

  setLayout(layout: ArenaLayout): void {
    this.layout = layout
    this.draw()
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible)
    this.labels.forEach((label) => label.setVisible(visible))

    if (visible) {
      this.draw()
    }
  }

  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((label) => label.destroy())
  }

  private draw(): void {
    this.graphics.clear()
    this.labels.forEach((label) => label.destroy())
    this.labels.length = 0

    this.strokeRect(this.layout.court, 0x8df0cf, 0.86, 4)
    this.strokeRect(this.layout.crestPlacement, 0xf2c84b, 0.88, 3)
    this.graphics.lineStyle(3, 0xffffff, 0.9)
    this.graphics.lineBetween(
      this.layout.midfieldLine.start.x,
      this.layout.midfieldLine.start.y,
      this.layout.midfieldLine.end.x,
      this.layout.midfieldLine.end.y,
    )
    this.graphics.strokeCircle(
      this.layout.centerCircle.center.x,
      this.layout.centerCircle.center.y,
      this.layout.centerCircle.radius,
    )

    for (const wall of this.layout.boundaryWalls) {
      this.strokeRect(wall, 0xe54872, 0.72, 2)
    }

    for (const goal of this.layout.goals) {
      this.graphics.lineStyle(5, 0xffd36b, 0.96)
      this.graphics.lineBetween(
        goal.center.x - goal.length / 2,
        goal.center.y,
        goal.center.x + goal.length / 2,
        goal.center.y,
      )
    }

    for (const area of Object.values(this.layout.keeperAreas)) {
      this.graphics.lineStyle(3, 0x78e5ff, 0.82)
      this.graphics.strokeCircle(
        area.center.x,
        area.center.y,
        area.outerRadius,
      )
      this.graphics.strokeCircle(
        area.center.x,
        area.center.y,
        area.innerRadius,
      )
    }

    for (const section of this.layout.seatingSections) {
      this.strokeRect(section.bounds, 0xc986ff, 0.78, 2)
      const label = this.scene.add
        .text(
          section.bounds.x + section.bounds.width / 2,
          section.bounds.y + section.bounds.height / 2,
          section.id,
          {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            backgroundColor: '#32174fcc',
            padding: { x: 4, y: 2 },
          },
        )
        .setOrigin(0.5)
        .setDepth(arenaLayers.geometryOverlay + 1)
      this.labels.push(label)
    }
  }

  private strokeRect(
    rect: ArenaRect,
    color: number,
    alpha: number,
    width: number,
  ): void {
    this.graphics.lineStyle(width, color, alpha)
    this.graphics.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }
}
