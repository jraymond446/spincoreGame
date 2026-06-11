import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import { viewConfig } from '../config/viewConfig'
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
  rotation: number
}

export class CrowdRenderer {
  private readonly scene: Phaser.Scene
  private assetSprites: Phaser.GameObjects.Image[] = []
  private generatedCrowd: Phaser.GameObjects.Image | null = null
  private members: CrowdMember[] = []
  private simplified = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
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
      this.generatedCrowd?.setVisible(false)
      this.assetSprites.forEach((sprite) => sprite.setVisible(false))
      return
    }

    const usingAsset = this.assetSprites.length > 0
    this.generatedCrowd?.setVisible(!usingAsset)
    this.assetSprites.forEach((sprite) => sprite.setVisible(usingAsset))

    if (usingAsset) {
      this.updateAssetSprites(time)
    }
  }

  destroy(): void {
    this.generatedCrowd?.destroy()
    this.destroyAssetSprites()
  }

  private rebuild(): void {
    this.destroyAssetSprites()
    this.generatedCrowd?.destroy()
    this.generatedCrowd = null
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
    this.buildGeneratedCrowd()
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
        .setRotation(member.rotation)
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

  private buildGeneratedCrowd(): void {
    if (this.assetSprites.length > 0) {
      return
    }

    const textureKey = this.simplified
      ? 'generated-crowd-mobile'
      : 'generated-crowd-full'
    const padding = 150

    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics()
      for (const member of this.members) {
        drawMiniCharacter(graphics, {
          x: member.x + padding,
          y: member.y + padding,
          scale: member.scale,
          alpha: arenaPresentationConfig.crowd.alpha,
          variant: member.variant,
          facing: member.facing,
          rotation: member.rotation,
        })
      }
      graphics.generateTexture(
        textureKey,
        viewConfig.width + padding * 2,
        viewConfig.height + padding * 2,
      )
      graphics.destroy()
    }

    this.generatedCrowd = this.scene.add
      .image(-padding, -padding, textureKey)
      .setOrigin(0)
      .setDepth(-14)
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
          side < 0 ? 0 : Math.PI,
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
          -Math.PI / 2 +
            Phaser.Math.Linear(
              -0.16,
              0.16,
              seeded(index + 377),
            ),
        ),
      )
    }
  }

  private createMember(
    x: number,
    y: number,
    seed: number,
    facing: -1 | 1,
    rotation: number,
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
      rotation,
    }
  }

}

function seeded(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453

  return value - Math.floor(value)
}
