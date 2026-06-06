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
    const benchY = arenaConfig.height * 0.55
    const count = arenaPresentationConfig.benchHeadCount

    this.graphics.fillStyle(
      arenaPresentationConfig.venue.concourseColor,
      arenaPresentationConfig.bench.areaAlpha,
    )
    this.graphics.fillRoundedRect(
      benchX - width / 2,
      benchY - height / 2,
      width,
      height,
      8,
    )
    this.graphics.lineStyle(4, palette.shirt, 0.6)
    this.graphics.strokeRoundedRect(
      benchX - width / 2,
      benchY - height / 2,
      width,
      height,
      8,
    )
    this.graphics.lineStyle(5, arenaPresentationConfig.venue.railColor, 0.42)
    this.graphics.lineBetween(
      benchX - width * 0.37,
      benchY + height * 0.14,
      benchX + width * 0.37,
      benchY + height * 0.14,
    )

    for (let index = 0; index < count; index += 1) {
      const x = Phaser.Math.Linear(
        benchX - width * 0.32,
        benchX + width * 0.32,
        index / Math.max(1, count - 1),
      )
      this.drawFigure(
        x,
        benchY - height * 0.05,
        palette.shirt,
        hairColorPalette[index % hairColorPalette.length],
        0.72,
      )
    }

    const coachX = courtEdge + direction * 46
    this.drawFigure(
      coachX,
      benchY + height * 0.23,
      palette.trim,
      hairColorPalette[(side === 'A' ? 4 : 1) % hairColorPalette.length],
      0.9,
    )

    const label = this.labels[side === 'A' ? 0 : 1]
    label
      .setPosition(benchX, benchY - height / 2 - 17)
      .setColor(side === 'A' ? '#9eeeff' : '#ffb5aa')
  }

  private drawScorekeeperTable(): void {
    const x = arenaConfig.center.x
    const y = arenaConfig.center.y + arenaConfig.height / 2 + 82

    this.graphics.fillStyle(0x1a5262, 0.68)
    this.graphics.fillRoundedRect(x - 54, y - 20, 108, 40, 6)
    this.graphics.lineStyle(2, 0xb7d9dc, 0.42)
    this.graphics.strokeRoundedRect(x - 54, y - 20, 108, 40, 6)
    this.graphics.fillStyle(0xf4f0d6, 0.78)
    this.graphics.fillRect(x - 27, y - 8, 24, 13)
    this.graphics.fillStyle(0xf2c96b, 0.78)
    this.graphics.fillCircle(x + 24, y - 1, 5)
    this.drawFigure(x, y - 29, 0xb8d8db, hairColorPalette[0], 0.68)
    this.labels[2].setPosition(x, y + 31).setColor('#b8d8db')
  }

  private drawFigure(
    x: number,
    y: number,
    shirtColor: number,
    hairColor: number,
    scale: number,
  ): void {
    const alpha = arenaPresentationConfig.bench.figureAlpha

    this.graphics.fillStyle(0x06151b, 0.2)
    this.graphics.fillEllipse(x, y + 7 * scale, 19 * scale, 7 * scale)
    this.graphics.fillStyle(shirtColor, alpha)
    this.graphics.fillRoundedRect(
      x - 7 * scale,
      y,
      14 * scale,
      11 * scale,
      5 * scale,
    )
    this.graphics.fillStyle(0xe4ad83, alpha)
    this.graphics.fillCircle(x, y - 5 * scale, 6.5 * scale)
    this.graphics.fillStyle(hairColor, alpha)
    this.graphics.fillCircle(x, y - 7 * scale, 6 * scale)
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
