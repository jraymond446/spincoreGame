import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import {
  crowdVariants,
  type CrowdVariant,
} from '../data/crowdVariants'
import { hasVisualAsset } from './VisualAssetOverrides'
import { drawMiniCharacter } from './MiniCharacterRenderer'

type CrowdMember = {
  x: number
  y: number
  phase: number
  variant: CrowdVariant
  scale: number
  facing: -1 | 1
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
    const sideCount = Math.max(8, Math.round(48 * density))
    const bottomCount = Math.max(12, Math.round(58 * density))

    if (!this.simplified) {
      this.addSideMembers(-1, sideCount, 17)
      this.addSideMembers(1, sideCount, 41)
    } else {
      this.addSideMembers(-1, Math.max(6, Math.round(sideCount * 0.4)), 17)
      this.addSideMembers(1, Math.max(6, Math.round(sideCount * 0.4)), 41)
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
      top + arenaConfig.height * 0.12,
      top + arenaConfig.height * 0.36,
      top + arenaConfig.height * 0.75,
    ]
    const columns = this.simplified ? 2 : 3
    const rowGap = this.simplified ? 31 : 29

    for (let index = 0; index < count; index += 1) {
      const cluster = index % clusterCenters.length
      const localIndex = Math.floor(index / clusterCenters.length)
      const column = localIndex % columns
      const row = Math.floor(localIndex / columns)
      const distance =
        Phaser.Math.Linear(
          minDistance,
          maxDistance,
          column / Math.max(1, columns - 1),
        ) +
        (row % 2) * 5

      this.members.push(
        this.createMember(
          edgeX + side * distance,
          clusterCenters[cluster] +
            row * rowGap +
            seeded(index + seedOffset) * 3,
          index + seedOffset,
          side < 0 ? 1 : -1,
        ),
      )
    }
  }

  private addBottomMembers(count: number, seedOffset: number): void {
    const bottom = arenaConfig.center.y + arenaConfig.height / 2
    const left = arenaConfig.center.x - arenaConfig.width / 2
    const rows = this.simplified ? 1 : 3
    const columns = Math.ceil(count / rows)

    for (let index = 0; index < count; index += 1) {
      const row = index % rows
      const column = Math.floor(index / rows)
      const across =
        (column + 0.5 + (row % 2) * 0.32) /
        Math.max(1, columns)
      const y = bottom + 57 + row * 30 + seeded(index + 211) * 2

      this.members.push(
        this.createMember(
          Phaser.Math.Linear(left + 60, left + arenaConfig.width - 60, across),
          y,
          index + seedOffset,
          seeded(index + 331) > 0.5 ? 1 : -1,
        ),
      )
    }
  }

  private createMember(
    x: number,
    y: number,
    seed: number,
    facing: -1 | 1,
  ): CrowdMember {
    return {
      x,
      y,
      phase: seeded(seed + 401) * Math.PI * 2,
      variant:
        crowdVariants[
          Math.floor(seeded(seed + 17) * crowdVariants.length)
        ],
      scale:
        Phaser.Math.Linear(1.02, 1.28, seeded(seed + 53)) *
        (this.simplified ? 1.22 : 1),
      facing,
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
      drawMiniCharacter(this.graphics, {
        x: member.x,
        y: member.y + bob,
        scale: member.scale,
        alpha: arenaPresentationConfig.crowd.alpha,
        variant: member.variant,
        facing: member.facing,
      })
    }
  }
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
