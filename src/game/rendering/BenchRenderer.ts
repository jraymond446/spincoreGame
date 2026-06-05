import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import {
  hairColorPalette,
  teamVisualPalettes,
} from '../data/visualPalettes'
import type { TeamSide } from '../data/matchTypes'

export class BenchRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[]

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-8)
    this.labels = [
      createLabel(scene, 'A BENCH'),
      createLabel(scene, 'B BENCH'),
      createLabel(scene, 'STATS'),
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
    this.drawTeamBench('A', -1, simplified)
    this.drawTeamBench('B', 1, simplified)

    if (!simplified) {
      this.drawScorekeeperTable()
    }
  }

  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((label) => label.destroy())
  }

  private drawTeamBench(
    side: TeamSide,
    direction: -1 | 1,
    simplified: boolean,
  ): void {
    const palette = teamVisualPalettes[side]
    const courtEdge =
      arenaConfig.center.x + direction * arenaConfig.width / 2
    const benchX =
      courtEdge +
      direction * (simplified ? 55 : 94)
    const benchY = arenaConfig.height * 0.56
    const width = simplified ? 34 : 86
    const height = simplified ? 220 : 390
    const count = simplified
      ? Math.min(3, arenaPresentationConfig.benchHeadCount)
      : arenaPresentationConfig.benchHeadCount

    this.graphics.fillStyle(
      arenaPresentationConfig.venue.seatingColor,
      arenaPresentationConfig.bench.areaAlpha,
    )
    this.graphics.fillRoundedRect(
      benchX - width / 2,
      benchY - height / 2,
      width,
      height,
      8,
    )
    this.graphics.lineStyle(5, palette.shirt, 0.78)
    this.graphics.lineBetween(
      benchX - width / 2,
      benchY - height / 2,
      benchX - width / 2,
      benchY + height / 2,
    )
    this.graphics.lineStyle(4, 0xb7d9dc, 0.48)
    this.graphics.lineBetween(
      benchX - width * 0.22,
      benchY - height * 0.38,
      benchX - width * 0.22,
      benchY + height * 0.38,
    )

    for (let index = 0; index < count; index += 1) {
      const y = Phaser.Math.Linear(
        benchY - height * 0.32,
        benchY + height * 0.32,
        count === 1 ? 0.5 : index / (count - 1),
      )
      this.drawFigure(
        benchX + direction * 5,
        y,
        palette.shirt,
        hairColorPalette[index % hairColorPalette.length],
        0.86,
      )
    }

    if (!simplified) {
      const coachX = courtEdge + direction * 43
      this.drawFigure(
        coachX,
        benchY - 66,
        palette.trim,
        hairColorPalette[(side === 'A' ? 4 : 1) % hairColorPalette.length],
        1.08,
      )
      this.drawFigure(
        coachX,
        benchY + 74,
        palette.shirtShade,
        hairColorPalette[(side === 'A' ? 2 : 5) % hairColorPalette.length],
        1,
      )

      const label = this.labels[side === 'A' ? 0 : 1]
      label
        .setPosition(benchX, benchY - height / 2 - 23)
        .setColor(side === 'A' ? '#9eeeff' : '#ffb5aa')
    }
  }

  private drawScorekeeperTable(): void {
    const x = -82
    const y = arenaConfig.height * 0.84

    this.graphics.fillStyle(0x0b2c37, 0.88)
    this.graphics.fillRoundedRect(x - 43, y - 27, 86, 54, 6)
    this.graphics.lineStyle(3, 0xb7d9dc, 0.5)
    this.graphics.strokeRoundedRect(x - 43, y - 27, 86, 54, 6)
    this.graphics.fillStyle(0xf4f0d6, 0.78)
    this.graphics.fillRect(x - 25, y - 11, 22, 15)
    this.graphics.fillStyle(0xf2c96b, 0.78)
    this.graphics.fillCircle(x + 22, y - 2, 6)
    this.drawFigure(x, y - 40, 0xb8d8db, hairColorPalette[0], 0.82)
    this.labels[2].setPosition(x, y + 39).setColor('#b8d8db')
  }

  private drawFigure(
    x: number,
    y: number,
    shirtColor: number,
    hairColor: number,
    scale: number,
  ): void {
    const alpha = arenaPresentationConfig.bench.figureAlpha

    this.graphics.fillStyle(0x06151b, 0.3)
    this.graphics.fillEllipse(x, y + 10 * scale, 24 * scale, 10 * scale)
    this.graphics.fillStyle(shirtColor, alpha)
    this.graphics.fillRoundedRect(
      x - 9 * scale,
      y - 1 * scale,
      18 * scale,
      17 * scale,
      5 * scale,
    )
    this.graphics.fillStyle(0xe4ad83, alpha)
    this.graphics.fillCircle(x, y - 7 * scale, 8 * scale)
    this.graphics.fillStyle(hairColor, alpha)
    this.graphics.fillCircle(x, y - 10 * scale, 7.5 * scale)
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
      color: '#d9f5f7',
    })
    .setOrigin(0.5)
    .setAlpha(arenaPresentationConfig.bench.labelAlpha)
    .setDepth(-8)
}
