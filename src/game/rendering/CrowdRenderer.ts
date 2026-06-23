import Phaser from 'phaser'
import type {
  ArenaLayout,
  ArenaSeatingSection,
} from '../arena/ArenaLayout'
import { arenaLayers } from '../arena/ArenaLayers'
import {
  seededUnit,
} from '../arena/ArenaAttendance'
import type { ArenaMatchPresentation } from '../arena/ArenaPresentation'
import type { ArenaTheme } from '../arena/ArenaTheme'
import { spectatorUniformMaskAsset } from '../arena/ArenaCharacterAssets'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import {
  crowdVariants,
  type CrowdVariant,
} from '../data/crowdVariants'
import { drawMiniCharacter } from './MiniCharacterRenderer'
import { hasVisualAsset } from './VisualAssetOverrides'

type CrowdMember = {
  x: number
  y: number
  facing: -1 | 1
  rotation: number
  scale: number
  variant: CrowdVariant
  standing: boolean
  cheers: boolean
  cheerPhase: number
  atlasFrame: number
}

export type CrowdDebugState = {
  attendanceRate: number
  occupiedSeats: number
  availableSeats: number
  simplified: boolean
  seed: number
}

export class CrowdRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics
  private assetSprites: Phaser.GameObjects.Image[] = []
  private assetMaskSprites: Phaser.GameObjects.Image[] = []
  private members: CrowdMember[] = []
  private simplified = false
  private lastRedrawBucket = -1
  private usingAssetSprites = false
  private readonly scene: Phaser.Scene
  private layout: ArenaLayout
  private theme: ArenaTheme
  private presentation: ArenaMatchPresentation

  constructor(
    scene: Phaser.Scene,
    layout: ArenaLayout,
    theme: ArenaTheme,
    presentation: ArenaMatchPresentation,
  ) {
    this.scene = scene
    this.layout = layout
    this.theme = theme
    this.presentation = presentation
    this.graphics = scene.add
      .graphics()
      .setDepth(arenaLayers.spectators)
    this.rebuild()
  }

  setSimplified(simplified: boolean): void {
    if (this.simplified === simplified) {
      return
    }

    this.simplified = simplified
    this.rebuild()
  }

  applyPresentation(
    layout: ArenaLayout,
    theme: ArenaTheme,
    presentation: ArenaMatchPresentation,
  ): void {
    this.layout = layout
    this.theme = theme
    this.presentation = presentation
    this.rebuild()
  }

  update(time: number): void {
    if (!arenaPresentationConfig.showCrowd) {
      this.graphics.setVisible(false)
      this.assetSprites.forEach((sprite) => sprite.setVisible(false))
      this.assetMaskSprites.forEach((sprite) => sprite.setVisible(false))
      return
    }

    this.graphics.setVisible(!this.usingAssetSprites)
    this.assetSprites.forEach((sprite, index) =>
      sprite.setVisible(
        this.usingAssetSprites && index < this.members.length,
      ),
    )
    this.assetMaskSprites.forEach((sprite, index) =>
      sprite.setVisible(
        this.usingAssetSprites && index < this.members.length,
      ),
    )

    if (
      this.presentation.reducedMotion ||
      !this.presentation.crowdAnimation
    ) {
      return
    }

    if (this.usingAssetSprites) {
      this.updateAssetSprites(time)
      return
    }

    const bucket = Math.floor(
      time / arenaPresentationConfig.crowd.redrawIntervalMs,
    )

    if (bucket !== this.lastRedrawBucket) {
      this.lastRedrawBucket = bucket
      this.drawGeneratedCrowd(bucket)
    }
  }

  getDebugState(): CrowdDebugState {
    return {
      attendanceRate: this.presentation.attendance.attendanceRate,
      occupiedSeats: this.members.length,
      availableSeats: this.theme.capacity,
      simplified: this.simplified,
      seed: this.presentation.crowdSeed,
    }
  }

  destroy(): void {
    this.graphics.destroy()
    this.destroyAssetSprites()
  }

  private rebuild(): void {
    this.assetSprites.forEach((sprite) => sprite.setVisible(false))
    this.assetMaskSprites.forEach((sprite) => sprite.setVisible(false))
    this.members = this.generateMembers()
    this.lastRedrawBucket = -1

    this.usingAssetSprites = this.buildAssetSprites()
    if (!this.usingAssetSprites) {
      this.drawGeneratedCrowd(0)
    }
  }

  private generateMembers(): CrowdMember[] {
    const anchors = this.theme.seatingSections
      .flatMap((section) => createSeatAnchors(section))
      .filter((anchor) => !pointInside(anchor, this.layout.court))
      .slice(0, this.theme.capacity)
    const seed = this.presentation.crowdSeed
    const densityMultiplier =
      this.simplified && arenaPresentationConfig.mobileCrowdSimplified
        ? arenaPresentationConfig.crowd.mobileDensityMultiplier
        : 1
    const displayRate = Math.min(
      1,
      this.presentation.attendance.attendanceRate * densityMultiplier,
    )

    return anchors.flatMap((anchor, index) => {
      if (seededUnit(seed, index) > displayRate) {
        return []
      }

      const source =
        crowdVariants[
          Math.floor(
            seededUnit(seed + 17, index) * crowdVariants.length,
          )
        ]
      const shirtRoll = seededUnit(seed + 43, index)
      const variant: CrowdVariant = {
        ...source,
        shirtColor:
          shirtRoll < 0.62
            ? this.presentation.teams.A.primaryColor
            : shirtRoll < 0.76
              ? this.presentation.teams.B.primaryColor
              : source.shirtColor,
        shirtTrim:
          shirtRoll < 0.62
            ? this.presentation.teams.A.accentColor
            : shirtRoll < 0.76
              ? this.presentation.teams.B.accentColor
              : source.shirtTrim,
      }

      return [{
        ...anchor,
        scale:
          anchor.scale *
          Phaser.Math.Linear(0.92, 1.08, seededUnit(seed + 59, index)),
        variant,
        standing: seededUnit(seed + 71, index) < 0.12,
        cheers: seededUnit(seed + 83, index) < 0.16,
        cheerPhase: Math.floor(seededUnit(seed + 97, index) * 5),
        atlasFrame: Math.floor(seededUnit(seed + 109, index) * 16),
      }]
    })
  }

  private buildAssetSprites(): boolean {
    const atlas = this.theme.spectatorAtlasAsset

    if (!atlas || !hasVisualAsset(this.scene, atlas.key)) {
      return false
    }

    const frameNames = this.scene.textures
      .get(atlas.key)
      .getFrameNames()
      .filter((frameName) => frameName !== '__BASE')
    const maskAvailable = hasVisualAsset(
      this.scene,
      spectatorUniformMaskAsset.key,
    )
    const maskFrameNames = maskAvailable
      ? this.scene.textures
          .get(spectatorUniformMaskAsset.key)
          .getFrameNames()
          .filter((frameName) => frameName !== '__BASE')
      : []

    if (frameNames.length === 0) {
      return false
    }

    this.graphics.clear()
    this.members.forEach((member, index) => {
      const frame = frameNames[member.atlasFrame % frameNames.length]
      const sprite = this.assetSprites[index] ??
        this.scene.add
          .image(member.x, member.y, atlas.key, frame)
          .setDepth(arenaLayers.spectators)

      if (!this.assetSprites[index]) {
        this.assetSprites[index] = sprite
      } else {
        sprite.setTexture(atlas.key, frame)
      }

      sprite
        .setPosition(member.x, member.y)
        .setDisplaySize(34 * member.scale, 39 * member.scale)
        .setAlpha(arenaPresentationConfig.crowd.alpha)
        .setRotation(0)
        .setVisible(true)

      if (!maskAvailable || maskFrameNames.length === 0) {
        this.assetMaskSprites[index]?.setVisible(false)
      } else {
        const maskFrame =
          maskFrameNames[member.atlasFrame % maskFrameNames.length]
        const maskSprite = this.assetMaskSprites[index] ??
          this.scene.add
            .image(
              member.x,
              member.y,
              spectatorUniformMaskAsset.key,
              maskFrame,
            )
            .setDepth(arenaLayers.spectators + 0.05)

        if (!this.assetMaskSprites[index]) {
          this.assetMaskSprites[index] = maskSprite
        } else {
          maskSprite.setTexture(
            spectatorUniformMaskAsset.key,
            maskFrame,
          )
        }
        const usesTeamTint =
          seededUnit(this.presentation.crowdSeed + 131, index) <
          arenaPresentationConfig.crowd.uniformMaskRate
        maskSprite
          .setPosition(member.x, member.y)
          .setDisplaySize(34 * member.scale, 39 * member.scale)
          .setTint(
            usesTeamTint
              ? member.variant.shirtColor
              : 0xd7d7d7,
          )
          .setBlendMode(Phaser.BlendModes.MULTIPLY)
          .setAlpha(arenaPresentationConfig.crowd.alpha)
          .setRotation(0)
          .setVisible(true)
      }
    })
    this.assetSprites.forEach((sprite, index) => {
      if (index >= this.members.length) {
        sprite.setVisible(false)
      }
    })
    this.assetMaskSprites.forEach((sprite, index) => {
      if (index >= this.members.length) {
        sprite.setVisible(false)
      }
    })
    return true
  }

  private updateAssetSprites(time: number): void {
    this.assetSprites.forEach((sprite, index) => {
      const member = this.members[index]
      if (!member) {
        sprite.setVisible(false)
        return
      }
      const bob = member.cheers
        ? Math.sin(
            time * arenaPresentationConfig.crowd.bobSpeed +
              member.cheerPhase,
          ) * arenaPresentationConfig.crowd.bobAmplitude
        : 0
      sprite.setPosition(member.x, member.y + bob)
      this.assetMaskSprites[index]?.setPosition(
        member.x,
        member.y + bob,
      )
    })
  }

  private drawGeneratedCrowd(bucket: number): void {
    this.graphics.clear()

    for (const member of this.members) {
      const cheering =
        member.cheers && (bucket + member.cheerPhase) % 5 === 0
      drawMiniCharacter(this.graphics, {
        x: member.x,
        y: member.y - (cheering ? 2.5 * member.scale : 0),
        scale: member.scale,
        alpha: arenaPresentationConfig.crowd.alpha,
        variant: member.variant,
        facing: member.facing,
        rotation: member.rotation,
        pose: member.standing || cheering ? 'standing' : 'seated',
      })
    }
  }

  private destroyAssetSprites(): void {
    this.assetSprites.forEach((sprite) => sprite.destroy())
    this.assetMaskSprites.forEach((sprite) => sprite.destroy())
    this.assetSprites = []
    this.assetMaskSprites = []
  }
}

function pointInside(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function createSeatAnchors(section: ArenaSeatingSection): Array<{
  x: number
  y: number
  facing: -1 | 1
  rotation: number
  scale: number
}> {
  const anchors: Array<{
    x: number
    y: number
    facing: -1 | 1
    rotation: number
    scale: number
  }> = []
  const horizontal = section.facing === 'up' || section.facing === 'down'
  const rows = Math.max(
    1,
    Math.floor(
      (horizontal ? section.bounds.height : section.bounds.width) /
        section.rowSpacing,
    ),
  )
  const seats = Math.max(
    1,
    Math.floor(
      (horizontal ? section.bounds.width : section.bounds.height) /
        section.seatSpacing,
    ),
  )
  const rotation =
    section.facing === 'up'
      ? -Math.PI / 2
      : section.facing === 'down'
        ? Math.PI / 2
        : section.facing === 'left'
          ? Math.PI
          : 0
  const facing: -1 | 1 = section.facing === 'left' ? -1 : 1

  for (let row = 0; row < rows; row += 1) {
    for (let seat = 0; seat < seats; seat += 1) {
      const rowRatio = (row + 0.5) / rows
      const seatRatio = (seat + 0.5 + (row % 2) * 0.18) / seats
      const x = horizontal
        ? section.bounds.x + section.bounds.width * seatRatio
        : section.bounds.x + section.bounds.width * rowRatio
      const y = horizontal
        ? section.bounds.y + section.bounds.height * rowRatio
        : section.bounds.y + section.bounds.height * seatRatio
      anchors.push({
        x,
        y,
        facing,
        rotation,
        scale: Phaser.Math.Linear(
          0.88,
          0.88 + section.depthScale,
          rowRatio,
        ),
      })
    }
  }

  return anchors
}
