import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import {
  hairColorPalette,
  teamVisualPalettes,
} from '../data/visualPalettes'
import type { TeamSide } from '../data/matchTypes'
import { visualStyleConfig } from '../config/visualStyleConfig'

export class BenchRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[]

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-8)
    this.labels = [
      createLabel(scene, 'TEAM A'),
      createLabel(scene, 'TEAM B'),
      createLabel(scene, 'OFFICIAL'),
    ]
  }

  draw(simplified: boolean): void {
    const visible = arenaPresentationConfig.showBenches

    this.graphics.setVisible(visible)
    this.labels.forEach((label) => label.setVisible(visible && !simplified))

    if (!visible) {
      return
    }

    this.graphics.clear()

    if (simplified) {
      return
    }

    this.drawTeamBench('A', -1)
    this.drawTeamBench('B', 1)
    this.drawScorekeeperTable()
  }

  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((label) => label.destroy())
  }

  private drawTeamBench(
    side: TeamSide,
    direction: -1 | 1,
  ): void {
    const palette = teamVisualPalettes[side]
    const courtEdge =
      arenaConfig.center.x + direction * arenaConfig.width / 2
    const width = arenaPresentationConfig.bench.width
    const height = arenaPresentationConfig.bench.height
    const benchX =
      courtEdge +
      direction *
        (arenaPresentationConfig.bench.courtGap + width / 2)
    const benchY = arenaConfig.center.y + arenaConfig.height * 0.075
    const count = arenaPresentationConfig.benchHeadCount

    this.graphics.fillStyle(visualStyleConfig.venue.shadow, 0.18)
    this.graphics.fillRoundedRect(
      benchX - width / 2 + 5,
      benchY - height / 2 + 7,
      width,
      height,
      9,
    )
    this.graphics.fillStyle(
      visualStyleConfig.venue.stand,
      arenaPresentationConfig.bench.areaAlpha,
    )
    this.graphics.fillRoundedRect(
      benchX - width / 2,
      benchY - height / 2,
      width,
      height,
      9,
    )
    this.graphics.lineStyle(3, visualStyleConfig.outline, 0.72)
    this.graphics.strokeRoundedRect(
      benchX - width / 2,
      benchY - height / 2,
      width,
      height,
      9,
    )
    this.graphics.fillStyle(palette.shirt, 0.9)
    this.graphics.fillRect(
      benchX - width / 2 + 4,
      benchY - height / 2 + 4,
      width - 8,
      10,
    )
    this.graphics.fillStyle(palette.shirtShade, 0.2)
    this.graphics.fillRoundedRect(
      benchX - width * 0.39,
      benchY + height * 0.04,
      width * 0.78,
      height * 0.28,
      5,
    )
    this.graphics.lineStyle(6, visualStyleConfig.outlineSoft, 0.78)
    this.graphics.lineBetween(
      benchX - width * 0.37,
      benchY + height * 0.24,
      benchX + width * 0.37,
      benchY + height * 0.24,
    )

    for (let index = 0; index < count; index += 1) {
      const x = Phaser.Math.Linear(
        benchX - width * 0.32,
        benchX + width * 0.32,
        index / Math.max(1, count - 1),
      )
      this.drawFigure(
        x,
        benchY - height * 0.04,
        palette.shirt,
        hairColorPalette[index % hairColorPalette.length],
        0.86,
      )
    }

    const coachX = courtEdge + direction * 43
    this.drawFigure(
      coachX,
      benchY + height * 0.34,
      palette.trim,
      hairColorPalette[(side === 'A' ? 4 : 1) % hairColorPalette.length],
      1,
    )

    const label = this.labels[side === 'A' ? 0 : 1]
    label
      .setPosition(benchX, benchY - height / 2 - 15)
      .setColor(side === 'A' ? '#9eeeff' : '#ffb5aa')
  }

  private drawScorekeeperTable(): void {
    const x = arenaConfig.center.x
    const y = arenaConfig.center.y + arenaConfig.height / 2 + 82

    this.graphics.fillStyle(visualStyleConfig.venue.stand, 0.96)
    this.graphics.fillRoundedRect(x - 54, y - 20, 108, 40, 6)
    this.graphics.lineStyle(3, visualStyleConfig.outline, 0.68)
    this.graphics.strokeRoundedRect(x - 54, y - 20, 108, 40, 6)
    this.graphics.fillStyle(0xf2c84b, 0.9)
    this.graphics.fillRect(x - 27, y - 8, 24, 13)
    this.graphics.fillStyle(0x1a9aa3, 0.9)
    this.graphics.fillCircle(x + 24, y - 1, 5)
    this.drawFigure(x, y - 29, 0xb8d8db, hairColorPalette[0], 0.68)
    this.labels[2].setPosition(x, y + 31).setColor('#16324f')
  }

  private drawFigure(
    x: number,
    y: number,
    shirtColor: number,
    hairColor: number,
    scale: number,
  ): void {
    const alpha = arenaPresentationConfig.bench.figureAlpha

    this.graphics.fillStyle(visualStyleConfig.venue.shadow, 0.18)
    this.graphics.fillEllipse(x, y + 7 * scale, 19 * scale, 7 * scale)
    this.graphics.lineStyle(1.5, visualStyleConfig.outline, 0.66)
    this.graphics.fillStyle(shirtColor, alpha)
    this.graphics.fillRoundedRect(
      x - 7 * scale,
      y,
      14 * scale,
      11 * scale,
      5 * scale,
    )
    this.graphics.strokeRoundedRect(
      x - 7 * scale,
      y,
      14 * scale,
      11 * scale,
      5 * scale,
    )
    this.graphics.fillStyle(0xe4ad83, alpha)
    this.graphics.fillCircle(x, y - 5 * scale, 6.5 * scale)
    this.graphics.lineStyle(1.5, visualStyleConfig.outline, 0.68)
    this.graphics.strokeCircle(x, y - 5 * scale, 6.5 * scale)
    this.graphics.fillStyle(hairColor, alpha)
    this.graphics.fillEllipse(x, y - 7.5 * scale, 12 * scale, 8 * scale)
  }
}

function createLabel(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#16324f',
    })
    .setOrigin(0.5)
    .setAlpha(arenaPresentationConfig.bench.labelAlpha)
    .setDepth(-8)
}
