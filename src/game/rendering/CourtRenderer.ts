import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { visualStyleConfig } from '../config/visualStyleConfig'

export class CourtRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-10)
    scene.add
      .text(arenaConfig.center.x, arenaConfig.center.y + 3, 'SPINCORE', {
        fontFamily: '"Courier New", monospace',
        fontSize: '46px',
        fontStyle: '900',
        color: '#bcecff',
        stroke: '#0b5b9d',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0.2)
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

    this.drawNotchedPanel(
      x - 13,
      y - 13,
      arenaConfig.width + 26,
      arenaConfig.height + 26,
      42,
      visualStyleConfig.outline,
      1,
    )
    this.drawNotchedPanel(
      x - 7,
      y - 7,
      arenaConfig.width + 14,
      arenaConfig.height + 14,
      36,
      visualStyleConfig.court.shellEdge,
      1,
    )
    this.drawNotchedPanel(
      x,
      y,
      arenaConfig.width,
      arenaConfig.height,
      32,
      arenaConfig.outerSurfaceColor,
      1,
    )

    this.drawShellTiles(x, y, arenaConfig.width, arenaConfig.height)

    this.drawNotchedPanel(
      x + 13,
      y + 13,
      arenaConfig.width - 26,
      arenaConfig.height - 26,
      27,
      visualStyleConfig.court.shellShade,
      1,
    )
    this.drawNotchedPanel(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      25,
      arenaConfig.floorColor,
      1,
      arenaConfig.boundaryLineColor,
      0.96,
      5,
    )

    this.drawSurfaceTiles(innerX, innerY, innerWidth, innerHeight)
    this.drawCourtBands(innerX, innerY, innerWidth, innerHeight)
    this.drawPrimaryMarkings(innerX, innerY, innerWidth, centerY)
    this.drawServiceMarkings(
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      topServiceY,
      bottomServiceY,
    )
    this.drawCenterEmblem(centerY)
    this.drawFaceoffDots(topServiceY, centerY, bottomServiceY)
    this.drawCornerTicks(innerX, innerY, innerWidth, innerHeight)
  }

  private drawShellTiles(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tile = 78
    const edge = 23

    this.graphics.fillStyle(visualStyleConfig.court.shell, 1)
    this.graphics.fillRect(x + 34, y + edge, width - 68, 6)
    this.graphics.fillRect(x + 34, y + height - edge - 6, width - 68, 6)
    this.graphics.fillRect(x + edge, y + 34, 6, height - 68)
    this.graphics.fillRect(x + width - edge - 6, y + 34, 6, height - 68)

    this.graphics.lineStyle(2, visualStyleConfig.court.shellEdge, 0.54)
    for (let offset = 56; offset < width - 56; offset += tile) {
      this.graphics.lineBetween(x + offset, y + 10, x + offset - 13, y + 24)
      this.graphics.lineBetween(
        x + offset,
        y + height - 10,
        x + offset - 13,
        y + height - 24,
      )
    }
    for (let offset = 62; offset < height - 62; offset += tile) {
      this.graphics.lineBetween(x + 10, y + offset, x + 24, y + offset - 13)
      this.graphics.lineBetween(
        x + width - 10,
        y + offset,
        x + width - 24,
        y + offset - 13,
      )
    }
  }

  private drawSurfaceTiles(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const columns = 6
    const rows = 16
    const cellWidth = width / columns
    const cellHeight = height / rows

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const light = (row + column) % 2 === 0
        this.graphics.fillStyle(
          light
            ? visualStyleConfig.court.surfaceLight
            : visualStyleConfig.court.surfaceShade,
          light ? 0.055 : 0.045,
        )
        this.graphics.fillRect(
          Math.round(x + column * cellWidth),
          Math.round(y + row * cellHeight),
          Math.ceil(cellWidth),
          Math.ceil(cellHeight),
        )
      }
    }

    this.graphics.lineStyle(1, visualStyleConfig.court.lineSoft, 0.14)
    for (let row = 1; row < rows; row += 1) {
      const panelY = Math.round(y + row * cellHeight)
      this.graphics.lineBetween(x + 28, panelY, x + width - 28, panelY)
    }

    this.graphics.lineStyle(1, visualStyleConfig.court.surfaceShade, 0.14)
    for (let column = 1; column < columns; column += 1) {
      const panelX = Math.round(x + column * cellWidth)
      this.graphics.lineBetween(panelX, y + 32, panelX, y + height - 32)
    }

    for (let index = 0; index < 180; index += 1) {
      const px = x + 32 + seeded(index + 19) * (width - 64)
      const py = y + 32 + seeded(index + 47) * (height - 64)
      const size = seeded(index + 71) > 0.8 ? 5 : 3
      this.graphics.fillStyle(
        seeded(index + 103) > 0.55
          ? visualStyleConfig.court.surfaceLight
          : visualStyleConfig.court.surfaceShade,
        0.1,
      )
      this.graphics.fillRect(
        Math.round(px / 4) * 4,
        Math.round(py / 4) * 4,
        size,
        size,
      )
    }
  }

  private drawCourtBands(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.graphics.fillStyle(visualStyleConfig.court.surfaceShade, 0.18)
    this.graphics.fillRect(x, y, 17, height)
    this.graphics.fillRect(x + width - 17, y, 17, height)
    this.graphics.fillRect(x, y, width, 15)
    this.graphics.fillRect(x, y + height - 15, width, 15)

    this.graphics.fillStyle(visualStyleConfig.court.surfaceLight, 0.12)
    this.graphics.fillRect(arenaConfig.center.x - 74, y, 148, height)
    this.graphics.fillRect(x + 26, y + 26, width - 52, 8)
    this.graphics.fillRect(x + 26, y + height - 34, width - 52, 8)
  }

  private drawPrimaryMarkings(
    x: number,
    y: number,
    width: number,
    centerY: number,
  ): void {
    this.drawPixelLine(
      x,
      centerY + 2,
      x + width,
      centerY + 2,
      7,
      0x0d5a95,
      0.22,
    )
    this.drawPixelLine(
      x,
      centerY,
      x + width,
      centerY,
      4,
      arenaConfig.boundaryLineColor,
      0.92,
    )
    this.drawPixelLine(
      arenaConfig.center.x,
      y,
      arenaConfig.center.x,
      centerY - arenaConfig.centerCircleRadius - 16,
      4,
      arenaConfig.secondaryLineColor,
      0.82,
    )
    this.drawPixelLine(
      arenaConfig.center.x,
      centerY + arenaConfig.centerCircleRadius + 16,
      arenaConfig.center.x,
      y + arenaConfig.height - arenaConfig.courtInset * 2,
      4,
      arenaConfig.secondaryLineColor,
      0.82,
    )

    this.graphics.lineStyle(8, 0x0d5a95, 0.18)
    this.graphics.strokeCircle(
      arenaConfig.center.x,
      centerY + 3,
      arenaConfig.centerCircleRadius,
    )
    this.graphics.lineStyle(5, arenaConfig.boundaryLineColor, 0.9)
    this.graphics.strokeCircle(
      arenaConfig.center.x,
      centerY,
      arenaConfig.centerCircleRadius,
    )
  }

  private drawServiceMarkings(
    x: number,
    y: number,
    width: number,
    height: number,
    topServiceY: number,
    bottomServiceY: number,
  ): void {
    this.drawPixelLine(
      x,
      topServiceY,
      x + width,
      topServiceY,
      4,
      arenaConfig.secondaryLineColor,
      0.78,
    )
    this.drawPixelLine(
      x,
      bottomServiceY,
      x + width,
      bottomServiceY,
      4,
      arenaConfig.secondaryLineColor,
      0.78,
    )

    for (const serviceY of [topServiceY, bottomServiceY]) {
      this.graphics.lineStyle(4, arenaConfig.secondaryLineColor, 0.62)
      this.graphics.strokeCircle(arenaConfig.center.x, serviceY, 44)
      this.graphics.lineStyle(2, visualStyleConfig.court.surfaceShade, 0.24)
      this.graphics.strokeCircle(arenaConfig.center.x, serviceY + 3, 44)
    }

    this.drawPixelLine(
      arenaConfig.center.x,
      y,
      arenaConfig.center.x,
      topServiceY - 44,
      3,
      arenaConfig.secondaryLineColor,
      0.58,
    )
    this.drawPixelLine(
      arenaConfig.center.x,
      bottomServiceY + 44,
      arenaConfig.center.x,
      y + height,
      3,
      arenaConfig.secondaryLineColor,
      0.58,
    )
  }

  private drawCenterEmblem(centerY: number): void {
    const centerX = arenaConfig.center.x

    this.graphics.lineStyle(5, visualStyleConfig.court.emblem, 0.58)
    this.graphics.strokeCircle(
      centerX,
      centerY,
      arenaConfig.centerCircleRadius - 20,
    )
    this.graphics.lineStyle(4, visualStyleConfig.court.emblem, 0.44)
    this.graphics.strokeCircle(
      centerX,
      centerY,
      arenaConfig.centerCircleRadius - 34,
    )

    this.graphics.lineStyle(5, visualStyleConfig.court.emblem, 0.48)
    this.graphics.beginPath()
    this.graphics.moveTo(centerX - 152, centerY)
    this.graphics.lineTo(centerX - 118, centerY - 22)
    this.graphics.lineTo(centerX - 82, centerY - 22)
    this.graphics.moveTo(centerX - 152, centerY)
    this.graphics.lineTo(centerX - 118, centerY + 22)
    this.graphics.lineTo(centerX - 82, centerY + 22)
    this.graphics.moveTo(centerX + 152, centerY)
    this.graphics.lineTo(centerX + 118, centerY - 22)
    this.graphics.lineTo(centerX + 82, centerY - 22)
    this.graphics.moveTo(centerX + 152, centerY)
    this.graphics.lineTo(centerX + 118, centerY + 22)
    this.graphics.lineTo(centerX + 82, centerY + 22)
    this.graphics.strokePath()

    this.graphics.fillStyle(visualStyleConfig.court.emblem, 0.34)
    this.graphics.fillRect(centerX - 118, centerY - 5, 55, 10)
    this.graphics.fillRect(centerX + 63, centerY - 5, 55, 10)
  }

  private drawFaceoffDots(
    topServiceY: number,
    centerY: number,
    bottomServiceY: number,
  ): void {
    for (const mark of [
      { y: centerY, radius: arenaConfig.faceoffMarkRadius + 2 },
      { y: topServiceY, radius: arenaConfig.faceoffMarkRadius },
      { y: bottomServiceY, radius: arenaConfig.faceoffMarkRadius },
    ]) {
      this.graphics.fillStyle(visualStyleConfig.outline, 0.92)
      this.graphics.fillRect(
        arenaConfig.center.x - mark.radius,
        mark.y - mark.radius,
        mark.radius * 2,
        mark.radius * 2,
      )
      this.graphics.fillStyle(arenaConfig.boundaryLineColor, 1)
      this.graphics.fillRect(
        arenaConfig.center.x - mark.radius + 3,
        mark.y - mark.radius + 3,
        (mark.radius - 3) * 2,
        (mark.radius - 3) * 2,
      )
    }
  }

  private drawCornerTicks(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const length = 42
    const inset = 14

    for (const horizontal of [-1, 1] as const) {
      for (const vertical of [-1, 1] as const) {
        const cornerX = horizontal < 0 ? x + inset : x + width - inset
        const cornerY = vertical < 0 ? y + inset : y + height - inset

        this.drawPixelLine(
          cornerX,
          cornerY,
          cornerX - horizontal * length,
          cornerY,
          7,
          arenaConfig.secondaryLineColor,
          0.86,
        )
        this.drawPixelLine(
          cornerX,
          cornerY,
          cornerX,
          cornerY - vertical * length,
          7,
          arenaConfig.secondaryLineColor,
          0.86,
        )
      }
    }
  }

  private drawNotchedPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    cut: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor?: number,
    strokeAlpha = 1,
    strokeWidth = 0,
  ): void {
    const corner = Math.min(cut, width * 0.22, height * 0.22)

    this.graphics.fillStyle(fillColor, fillAlpha)
    if (strokeColor !== undefined && strokeWidth > 0) {
      this.graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha)
    }
    this.graphics.beginPath()
    this.graphics.moveTo(x + corner, y)
    this.graphics.lineTo(x + width - corner, y)
    this.graphics.lineTo(x + width, y + corner)
    this.graphics.lineTo(x + width, y + height - corner)
    this.graphics.lineTo(x + width - corner, y + height)
    this.graphics.lineTo(x + corner, y + height)
    this.graphics.lineTo(x, y + height - corner)
    this.graphics.lineTo(x, y + corner)
    this.graphics.closePath()
    this.graphics.fillPath()
    if (strokeColor !== undefined && strokeWidth > 0) {
      this.graphics.strokePath()
    }
  }

  private drawPixelLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: number,
    alpha: number,
  ): void {
    this.graphics.fillStyle(color, alpha)
    if (Math.abs(y1 - y2) < 0.001) {
      const left = Math.min(x1, x2)
      this.graphics.fillRect(left, y1 - width / 2, Math.abs(x2 - x1), width)
      return
    }

    if (Math.abs(x1 - x2) < 0.001) {
      const top = Math.min(y1, y2)
      this.graphics.fillRect(x1 - width / 2, top, width, Math.abs(y2 - y1))
      return
    }

    this.graphics.lineStyle(width, color, alpha)
    this.graphics.lineBetween(x1, y1, x2, y2)
  }
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
