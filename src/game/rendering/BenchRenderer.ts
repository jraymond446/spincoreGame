import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import {
  teamVisualPalettes,
} from '../data/visualPalettes'
import { crowdVariants } from '../data/crowdVariants'
import type { TeamSide } from '../data/matchTypes'
import { visualStyleConfig } from '../config/visualStyleConfig'
import { drawMiniCharacter } from './MiniCharacterRenderer'
import type { ArenaMatchPresentation } from '../arena/ArenaPresentation'
import { shadeColor } from '../arena/ArenaAppearanceBridge'

export class BenchRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[]
  private simplified = false
  private presentation?: ArenaMatchPresentation

  constructor(
    scene: Phaser.Scene,
    presentation?: ArenaMatchPresentation,
  ) {
    this.presentation = presentation
    this.graphics = scene.add.graphics().setDepth(-8)
    this.labels = [
      createLabel(scene, 'TEAM A'),
      createLabel(scene, 'TEAM B'),
      createLabel(scene, 'OFFICIAL'),
    ]
  }

  draw(simplified: boolean): void {
    this.simplified = simplified
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

  applyPresentation(presentation: ArenaMatchPresentation): void {
    this.presentation = presentation
    this.draw(this.simplified)
  }

  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((label) => label.destroy())
  }

  private drawTeamBench(
    side: TeamSide,
    direction: -1 | 1,
  ): void {
    const identity = this.presentation?.teams[side]
    const palette = identity
      ? {
          shirt: identity.primaryColor,
          shirtShade: shadeColor(identity.primaryColor, 0.68),
          trim: identity.accentColor,
          shorts: shadeColor(identity.primaryColor, 0.58),
        }
      : teamVisualPalettes[side]
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
      benchX - width / 2 + 6,
      benchY - height / 2 + 8,
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
    this.graphics.fillRoundedRect(
      benchX - width / 2 + 4,
      benchY - height / 2 + 4,
      width - 8,
      12,
      3,
    )
    this.graphics.fillStyle(visualStyleConfig.venue.concourse, 0.96)
    this.graphics.fillRoundedRect(
      benchX - width * 0.42,
      benchY - height * 0.22,
      width * 0.84,
      height * 0.58,
      5,
    )
    this.graphics.lineStyle(3, palette.shirtShade, 0.54)
    this.graphics.strokeRoundedRect(
      benchX - width * 0.42,
      benchY - height * 0.22,
      width * 0.84,
      height * 0.58,
      5,
    )
    this.graphics.fillStyle(palette.shirtShade, 0.28)
    this.graphics.fillRoundedRect(
      benchX - width * 0.38,
      benchY + height * 0.03,
      width * 0.76,
      height * 0.25,
      5,
    )
    this.graphics.lineStyle(6, visualStyleConfig.outlineSoft, 0.74)
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
        benchY - height * 0.03,
        index + (side === 'A' ? 0 : 3),
        palette.shirt,
        0.86,
        'seated',
      )
    }

    const coachX = courtEdge + direction * 43
    this.drawFigure(
      coachX,
      benchY + height * 0.34,
      side === 'A' ? 5 : 1,
      palette.trim,
      1,
      'standing',
    )

    this.drawEquipmentRack(
      benchX + direction * width * 0.38,
      benchY + height * 0.34,
      palette.shirt,
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
    this.drawFigure(x, y - 29, 0, 0xb8d8db, 0.68, 'seated')
    this.labels[2].setPosition(x, y + 31).setColor('#16324f')
  }

  private drawFigure(
    x: number,
    y: number,
    variantIndex: number,
    shirtColor: number,
    scale: number,
    pose: 'seated' | 'standing',
  ): void {
    const base = crowdVariants[variantIndex % crowdVariants.length]
    drawMiniCharacter(this.graphics, {
      x,
      y,
      scale,
      alpha: arenaPresentationConfig.bench.figureAlpha,
      variant: {
        ...base,
        shirtColor,
      },
      pose,
      facing: x < arenaConfig.center.x ? 1 : -1,
    })
  }

  private drawEquipmentRack(
    x: number,
    y: number,
    color: number,
  ): void {
    this.graphics.fillStyle(visualStyleConfig.outline, 0.82)
    this.graphics.fillRoundedRect(x - 13, y - 9, 26, 18, 4)
    this.graphics.fillStyle(color, 0.88)
    this.graphics.fillRoundedRect(x - 10, y - 6, 20, 12, 3)
    this.graphics.lineStyle(2, 0xffffff, 0.66)
    this.graphics.lineBetween(x - 5, y - 4, x + 5, y + 4)
    this.graphics.lineBetween(x + 5, y - 4, x - 5, y + 4)
  }
}

function createLabel(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#16324f',
    })
    .setOrigin(0.5)
    .setAlpha(arenaPresentationConfig.bench.labelAlpha)
    .setDepth(-8)
}
