import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'

export class CourtRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-10)
    scene.add
      .text(arenaConfig.center.x, arenaConfig.center.y + 3, 'SPINCORE', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '48px',
        fontStyle: '900',
        color: '#d9f3ff',
      })
      .setOrigin(0.5)
      .setAlpha(0.13)
      .setDepth(-9)

    this.draw()
  }

  private draw(): void {
    const x = arenaConfig.center.x - arenaConfig.width / 2
    const y = arenaConfig.center.y - arenaConfig.height / 2
    const inset = arenaConfig.courtInset
    const innerX = x + inset
    const innerY = y + inset
    const innerWidth = arenaConfig.width - inset * 2
    const innerHeight = arenaConfig.height - inset * 2
    const centerY = arenaConfig.center.y
    const topServiceY = y + arenaConfig.serviceLineDepth
    const bottomServiceY =
      y + arenaConfig.height - arenaConfig.serviceLineDepth

    this.graphics.clear()
    this.graphics.fillStyle(arenaConfig.outerSurfaceColor, 1)
    this.graphics.fillRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.fillStyle(visualStyleConfig.court.shellShade, 1)
    this.graphics.fillRoundedRect(
      x + 9,
      y + 9,
      arenaConfig.width - 18,
      arenaConfig.height - 18,
      Math.max(8, arenaConfig.cornerRadius - 3),
    )

    this.graphics.fillStyle(arenaConfig.floorColor, 1)
    this.graphics.fillRoundedRect(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      Math.max(6, arenaConfig.cornerRadius - 6),
    )

    this.drawSurfacePanels(innerX, innerY, innerWidth, innerHeight)

    this.graphics.fillStyle(arenaConfig.floorAccentColor, 0.24)
    this.graphics.fillRect(
      innerX,
      topServiceY,
      innerWidth,
      bottomServiceY - topServiceY,
    )

    this.graphics.fillStyle(visualStyleConfig.court.surfaceShade, 0.2)
    this.graphics.fillRect(innerX, innerY, 18, innerHeight)
    this.graphics.fillRect(innerX + innerWidth - 18, innerY, 18, innerHeight)

    this.graphics.fillStyle(visualStyleConfig.court.surfaceLight, 0.16)
    this.graphics.fillRect(
      arenaConfig.center.x - 78,
      innerY,
      156,
      innerHeight,
    )

    this.graphics.lineStyle(5, arenaConfig.wallStrokeColor, 0.94)
    this.graphics.strokeRoundedRect(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      arenaConfig.cornerRadius,
    )

    this.graphics.lineStyle(5, arenaConfig.boundaryLineColor, 0.94)
    this.graphics.strokeRoundedRect(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      Math.max(6, arenaConfig.cornerRadius - 6),
    )

    this.graphics.lineStyle(3, arenaConfig.boundaryLineColor, 0.82)
    this.graphics.lineBetween(innerX, centerY, innerX + innerWidth, centerY)
    this.graphics.strokeCircle(
      arenaConfig.center.x,
      centerY,
      arenaConfig.centerCircleRadius,
    )

    this.drawCenterEmblem(centerY)

    this.graphics.lineStyle(3, arenaConfig.secondaryLineColor, 0.68)
    this.graphics.lineBetween(
      innerX,
      topServiceY,
      innerX + innerWidth,
      topServiceY,
    )
    this.graphics.lineBetween(
      innerX,
      bottomServiceY,
      innerX + innerWidth,
      bottomServiceY,
    )
    this.graphics.lineBetween(
      arenaConfig.center.x,
      innerY,
      arenaConfig.center.x,
      topServiceY,
    )
    this.graphics.lineBetween(
      arenaConfig.center.x,
      bottomServiceY,
      arenaConfig.center.x,
      innerY + innerHeight,
    )

    this.graphics.fillStyle(arenaConfig.boundaryLineColor, 0.94)
    this.graphics.fillCircle(
      arenaConfig.center.x,
      centerY,
      arenaConfig.faceoffMarkRadius,
    )
    this.graphics.fillCircle(
      arenaConfig.center.x,
      topServiceY,
      arenaConfig.faceoffMarkRadius * 0.62,
    )
    this.graphics.fillCircle(
      arenaConfig.center.x,
      bottomServiceY,
      arenaConfig.faceoffMarkRadius * 0.62,
    )

    this.drawCornerTicks(innerX, innerY, innerWidth, innerHeight)
  }

  private drawSurfacePanels(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const columns = 4
    const rows = 10
    const cellWidth = width / columns
    const cellHeight = height / rows

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const light = (row + column) % 2 === 0
        this.graphics.fillStyle(
          light
            ? visualStyleConfig.court.surfaceLight
            : visualStyleConfig.court.surfaceShade,
          light ? 0.035 : 0.025,
        )
        this.graphics.fillRect(
          x + column * cellWidth,
          y + row * cellHeight,
          cellWidth,
          cellHeight,
        )
      }
    }

    this.graphics.lineStyle(1, visualStyleConfig.court.lineSoft, 0.07)
    for (let row = 1; row < rows; row += 1) {
      const panelY = y + row * cellHeight
      this.graphics.lineBetween(x + 20, panelY, x + width - 20, panelY)
    }
  }

  private drawCenterEmblem(centerY: number): void {
    const centerX = arenaConfig.center.x

    this.graphics.lineStyle(5, visualStyleConfig.court.emblem, 0.74)
    this.graphics.strokeCircle(
      centerX,
      centerY,
      arenaConfig.centerCircleRadius - 18,
    )
    this.graphics.beginPath()
    this.graphics.moveTo(centerX - 150, centerY)
    this.graphics.lineTo(centerX - 118, centerY - 22)
    this.graphics.lineTo(centerX - 92, centerY - 22)
    this.graphics.moveTo(centerX - 150, centerY)
    this.graphics.lineTo(centerX - 118, centerY + 22)
    this.graphics.lineTo(centerX - 92, centerY + 22)
    this.graphics.moveTo(centerX + 150, centerY)
    this.graphics.lineTo(centerX + 118, centerY - 22)
    this.graphics.lineTo(centerX + 92, centerY - 22)
    this.graphics.moveTo(centerX + 150, centerY)
    this.graphics.lineTo(centerX + 118, centerY + 22)
    this.graphics.lineTo(centerX + 92, centerY + 22)
    this.graphics.strokePath()

    this.graphics.lineStyle(3, visualStyleConfig.court.emblem, 0.58)
    this.graphics.lineBetween(centerX - 142, centerY, centerX - 110, centerY)
    this.graphics.lineBetween(centerX + 110, centerY, centerX + 142, centerY)
  }

  private drawCornerTicks(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const length = 40
    const inset = 13

    this.graphics.lineStyle(6, arenaConfig.secondaryLineColor, 0.8)
    for (const horizontal of [-1, 1] as const) {
      for (const vertical of [-1, 1] as const) {
        const cornerX = horizontal < 0 ? x + inset : x + width - inset
        const cornerY = vertical < 0 ? y + inset : y + height - inset

        this.graphics.lineBetween(
          cornerX,
          cornerY,
          cornerX - horizontal * length,
          cornerY,
        )
        this.graphics.lineBetween(
          cornerX,
          cornerY,
          cornerX,
          cornerY - vertical * length,
        )
      }
    }
  }
}
