import Phaser from 'phaser'
import type { ArenaRect } from '../arena/ArenaLayout'
import { arenaLayers } from '../arena/ArenaLayers'
import type { ArenaTeamPresentation } from '../arena/ArenaPresentation'
import { hasVisualAsset } from './VisualAssetOverrides'

export class HomeCrestRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private image: Phaser.GameObjects.Image | null = null
  private readonly scene: Phaser.Scene
  private placement: ArenaRect

  constructor(
    scene: Phaser.Scene,
    placement: ArenaRect,
    team: ArenaTeamPresentation,
  ) {
    this.scene = scene
    this.placement = placement
    this.graphics = scene.add.graphics().setDepth(arenaLayers.homeCrest)
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#fff8df',
        stroke: '#061f3e',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(arenaLayers.homeCrest + 0.2)
      .setAlpha(0.24)
    this.draw(team)
  }

  setPlacement(placement: ArenaRect): void {
    this.placement = placement
  }

  draw(team: ArenaTeamPresentation): void {
    this.graphics.clear()
    this.image?.destroy()
    this.image = null
    this.label.setVisible(false)

    if (team.crestMode === 'none') {
      return
    }

    const centerX = this.placement.x + this.placement.width / 2
    const centerY = this.placement.y + this.placement.height / 2
    const size = Math.min(this.placement.width, this.placement.height)

    if (
      team.crestMode === 'team' &&
      hasVisualAsset(this.scene, team.crestAsset.key)
    ) {
      this.image = this.scene.add
        .image(centerX, centerY, team.crestAsset.key)
        .setDepth(arenaLayers.homeCrest)
        .setAlpha(0.24)
      const scale = Math.min(
        this.placement.width / this.image.width,
        this.placement.height / this.image.height,
      )
      this.image.setScale(scale)
      return
    }

    const leagueCrest = team.crestMode === 'league'
    const shieldWidth = size * (leagueCrest ? 0.68 : 0.76)
    const shieldHeight = size * 0.82
    const points = [
      new Phaser.Geom.Point(centerX, centerY - shieldHeight / 2),
      new Phaser.Geom.Point(centerX + shieldWidth / 2, centerY - shieldHeight * 0.25),
      new Phaser.Geom.Point(centerX + shieldWidth * 0.4, centerY + shieldHeight * 0.3),
      new Phaser.Geom.Point(centerX, centerY + shieldHeight / 2),
      new Phaser.Geom.Point(centerX - shieldWidth * 0.4, centerY + shieldHeight * 0.3),
      new Phaser.Geom.Point(centerX - shieldWidth / 2, centerY - shieldHeight * 0.25),
    ]
    this.graphics.fillStyle(team.primaryColor, 0.18)
    this.graphics.lineStyle(12, team.accentColor, 0.2)
    this.graphics.fillPoints(points, true)
    this.graphics.strokePoints(points, true)
    this.graphics.lineStyle(8, 0xffffff, 0.12)
    this.graphics.strokeCircle(centerX, centerY, size * 0.25)
    this.label
      .setPosition(centerX, centerY)
      .setText(leagueCrest ? 'SC' : team.shortName.slice(0, 3))
      .setVisible(true)
  }

  destroy(): void {
    this.graphics.destroy()
    this.label.destroy()
    this.image?.destroy()
  }
}
