import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import { hairColorPalette } from '../data/visualPalettes'
import { hasVisualAsset } from './VisualAssetOverrides'

type CrowdMember = {
  x: number
  y: number
  phase: number
  shirtColor: number
  hairColor: number
  scale: number
}

export class CrowdRenderer {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private assetSprites: Phaser.GameObjects.Image[] = []
  private members: CrowdMember[] = []
  private simplified = false
  private lastDrawTime = Number.NEGATIVE_INFINITY

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(-14)
    this.rebuild()
  }

  setSimplified(simplified: boolean): void {
    if (this.simplified === simplified) {
      return
    }

    this.simplified = simplified
    this.rebuild()
  }

  update(time: number): void {
    if (!arenaPresentationConfig.showCrowd) {
      this.graphics.setVisible(false)
      this.assetSprites.forEach((sprite) => sprite.setVisible(false))
      return
    }

    const usingAsset = this.assetSprites.length > 0
    this.graphics.setVisible(!usingAsset)
    this.assetSprites.forEach((sprite) => sprite.setVisible(usingAsset))

    if (usingAsset) {
      this.updateAssetSprites(time)
      return
    }

    if (
      time - this.lastDrawTime <
      arenaPresentationConfig.crowd.redrawIntervalMs
    ) {
      return
    }

    this.lastDrawTime = time
    this.draw(time)
  }

  destroy(): void {
    this.graphics.destroy()
    this.destroyAssetSprites()
  }

  private rebuild(): void {
    this.destroyAssetSprites()
    this.members = []
    const density =
      arenaPresentationConfig.crowdDensity *
      (this.simplified &&
      arenaPresentationConfig.mobileCrowdSimplified
        ? arenaPresentationConfig.crowd.mobileDensityMultiplier
        : 1)
    const sideCount = Math.max(6, Math.round(42 * density))
    const bottomCount = Math.max(10, Math.round(52 * density))

    if (!this.simplified) {
      this.addSideMembers(-1, sideCount, 17)
      this.addSideMembers(1, sideCount, 41)
    } else {
      this.addSideMembers(-1, Math.max(5, Math.round(sideCount * 0.42)), 17)
      this.addSideMembers(1, Math.max(5, Math.round(sideCount * 0.42)), 41)
    }

    this.addBottomMembers(bottomCount, 83)
    this.buildAssetSprites()
    this.lastDrawTime = Number.NEGATIVE_INFINITY
  }

  private buildAssetSprites(): void {
    const config = assetOverrideConfig.crowd

    if (!hasVisualAsset(this.scene, config.key)) {
      return
    }

    const frameNames = this.scene.textures.get(config.key).getFrameNames()

    if (frameNames.length === 0) {
      return
    }

    this.assetSprites = this.members.map((member, index) =>
      this.scene.add
        .image(
          member.x,
          member.y,
          config.key,
          frameNames[index % frameNames.length],
        )
        .setDisplaySize(
          config.displayWidth * member.scale,
          config.displayHeight * member.scale,
        )
        .setAlpha(arenaPresentationConfig.crowd.alpha)
        .setDepth(-14),
    )
  }

  private updateAssetSprites(time: number): void {
    this.assetSprites.forEach((sprite, index) => {
      const member = this.members[index]
      const bob =
        Math.sin(
          time * arenaPresentationConfig.crowd.bobSpeed +
            member.phase,
        ) * arenaPresentationConfig.crowd.bobAmplitude

      sprite.setPosition(member.x, member.y + bob)
    })
  }

  private destroyAssetSprites(): void {
    this.assetSprites.forEach((sprite) => sprite.destroy())
    this.assetSprites = []
  }

  private addSideMembers(
    side: -1 | 1,
    count: number,
    seedOffset: number,
  ): void {
    const edgeX =
      arenaConfig.center.x + side * arenaConfig.width / 2
    const top = arenaConfig.center.y - arenaConfig.height / 2
    const minDistance = 54
    const maxDistance =
      arenaPresentationConfig.sidelineDecorationWidth - 34
    const clusterCenters = [
      top + arenaConfig.height * 0.13,
      top + arenaConfig.height * 0.37,
      top + arenaConfig.height * 0.75,
    ]
    const columns = this.simplified ? 2 : 4

    for (let index = 0; index < count; index += 1) {
      const cluster = index % clusterCenters.length
      const localIndex = Math.floor(index / clusterCenters.length)
      const column = localIndex % columns
      const row = Math.floor(localIndex / columns)
      const distance = Phaser.Math.Linear(
        minDistance,
        maxDistance,
        column / Math.max(1, columns - 1),
      )

      this.members.push(
        this.createMember(
          edgeX + side * distance,
          clusterCenters[cluster] + row * 25 + seeded(index + seedOffset) * 5,
          index + seedOffset,
        ),
      )
    }
  }

  private addBottomMembers(count: number, seedOffset: number): void {
    const bottom = arenaConfig.center.y + arenaConfig.height / 2
    const left = arenaConfig.center.x - arenaConfig.width / 2
    const rows = this.simplified ? 1 : 3

    for (let index = 0; index < count; index += 1) {
      const row = index % rows
      const across = seeded(index + seedOffset)
      const y = bottom + 56 + row * 27 + seeded(index + 211) * 4

      this.members.push(
        this.createMember(
          Phaser.Math.Linear(left + 60, left + arenaConfig.width - 60, across),
          y,
          index + seedOffset,
        ),
      )
    }
  }

  private createMember(
    x: number,
    y: number,
    seed: number,
  ): CrowdMember {
    const shirtColors = arenaPresentationConfig.crowd.shirtColors

    return {
      x,
      y,
      phase: seeded(seed + 401) * Math.PI * 2,
      shirtColor:
        shirtColors[Math.floor(seeded(seed + 17) * shirtColors.length)],
      hairColor:
        hairColorPalette[
          Math.floor(seeded(seed + 29) * hairColorPalette.length)
        ],
      scale: Phaser.Math.Linear(0.98, 1.3, seeded(seed + 53)),
    }
  }

  private draw(time: number): void {
    this.graphics.clear()

    for (const member of this.members) {
      const bob =
        Math.sin(
          time * arenaPresentationConfig.crowd.bobSpeed +
            member.phase,
        ) * arenaPresentationConfig.crowd.bobAmplitude
      const alpha = arenaPresentationConfig.crowd.alpha
      const bodyY = member.y + bob + 4.5 * member.scale
      const headY = member.y + bob - 4 * member.scale

      this.graphics.fillStyle(0x31566c, alpha * 0.18)
      this.graphics.fillEllipse(
        member.x,
        member.y + 9,
        19 * member.scale,
        7 * member.scale,
      )
      this.graphics.lineStyle(2, 0x31566c, alpha * 0.58)
      this.graphics.fillStyle(member.shirtColor, alpha * 0.82)
      this.graphics.fillRoundedRect(
        member.x - 7.5 * member.scale,
        bodyY - 2.5 * member.scale,
        15 * member.scale,
        10 * member.scale,
        4 * member.scale,
      )
      this.graphics.strokeRoundedRect(
        member.x - 7.5 * member.scale,
        bodyY - 2.5 * member.scale,
        15 * member.scale,
        10 * member.scale,
        4 * member.scale,
      )
      this.graphics.fillStyle(0xe4aa7d, alpha * 0.9)
      this.graphics.fillCircle(
        member.x,
        headY,
        7 * member.scale,
      )
      this.graphics.lineStyle(2, 0x31566c, alpha * 0.64)
      this.graphics.strokeCircle(
        member.x,
        headY,
        7 * member.scale,
      )
      this.graphics.fillStyle(member.hairColor, alpha)
      this.graphics.fillEllipse(
        member.x,
        headY - 2.8 * member.scale,
        13.5 * member.scale,
        9 * member.scale,
      )
      this.graphics.fillStyle(0xf6d4b4, alpha * 0.72)
      this.graphics.fillCircle(
        member.x,
        headY + 2.2 * member.scale,
        1.5 * member.scale,
      )
    }
  }
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
