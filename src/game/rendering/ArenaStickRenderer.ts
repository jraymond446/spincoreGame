import Phaser from 'phaser'
import {
  arenaStickDefinitions,
  MAX_ARENA_STICK_VISUAL_OFFSET_RADIANS,
  resolveArenaStickTransform,
  type ArenaStickDefinition,
  type ArenaStickId,
  type ArenaStickLayerMode,
  type ArenaStickTransform,
} from '../arena/ArenaCharacterAssets'
import { arenaLayers } from '../arena/ArenaLayers'
import type { Point } from '../data/geometry'
import type { StickActionState } from '../data/matchTypes'
import type { PlayerAnimationPose } from './AnimationState'
import {
  hasVisualAsset,
  useLinearVisualAssetFiltering,
} from './VisualAssetOverrides'

export type ArenaStickRendererUpdate = {
  playerOrigin: Point
  mountPoint: Point
  pocketTarget: Point
  aimAngle: number
  mirrorSign: -1 | 1
  state: StickActionState
  pose: PlayerAnimationPose
  charge: {
    normalized: number
    hardCharge: boolean
    fullyCharged: boolean
  }
  scale: number
  angleOffset: number
  layerMode: ArenaStickLayerMode
  showAnchors: boolean
  showContract: boolean
  chargeVfx: boolean
  reducedMotion: boolean
  visualOffset: Point
  visualRotationOffset: number
  now: number
}

export class ArenaStickRenderer {
  private readonly scene: Phaser.Scene
  private readonly image: Phaser.GameObjects.Image
  private readonly chargeGraphics: Phaser.GameObjects.Graphics
  private readonly anchorGraphics: Phaser.GameObjects.Graphics
  private definition: ArenaStickDefinition
  private lastTransform: ArenaStickTransform
  private visible = false
  private automaticAbove = false

  constructor(scene: Phaser.Scene, stickId: ArenaStickId) {
    this.scene = scene
    this.definition = arenaStickDefinitions[stickId]
    const textureKey = hasVisualAsset(scene, this.definition.asset.key)
      ? this.definition.asset.key
      : this.ensureGeneratedTexture(this.definition)

    if (hasVisualAsset(scene, this.definition.asset.key)) {
      useLinearVisualAssetFiltering(scene, this.definition.asset.key)
    }

    this.image = scene.add
      .image(0, 0, textureKey)
      .setOrigin(
        this.definition.rotationPivot.x / this.definition.canvas.width,
        this.definition.rotationPivot.y / this.definition.canvas.height,
      )
      .setDepth(arenaLayers.players - 0.35)
      .setVisible(false)
    this.chargeGraphics = scene.add
      .graphics()
      .setDepth(arenaLayers.gameplayVfx)
      .setVisible(false)
    this.anchorGraphics = scene.add
      .graphics()
      .setDepth(arenaLayers.geometryOverlay)
      .setVisible(false)
    this.lastTransform = resolveArenaStickTransform(
      this.definition,
      { x: 0, y: 0 },
      0,
      1,
    )
  }

  update(data: ArenaStickRendererUpdate): void {
    const aimAngle = data.aimAngle + data.angleOffset
    const alignPocket = isPossessionState(data.state)
    const visualRotationOffset = Phaser.Math.Clamp(
      data.pose.stickRotationOffset + data.visualRotationOffset,
      -MAX_ARENA_STICK_VISUAL_OFFSET_RADIANS,
      MAX_ARENA_STICK_VISUAL_OFFSET_RADIANS,
    )
    const renderScale = data.pose.stickScaleX * data.scale
    const mountPoint = offsetPoint(data.mountPoint, data.visualOffset)
    const pocketTarget = offsetPoint(
      data.pocketTarget,
      data.visualOffset,
    )
    const transform = resolveArenaStickTransform(
      this.definition,
      mountPoint,
      aimAngle,
      data.mirrorSign,
      renderScale,
      pocketTarget,
      alignPocket,
      visualRotationOffset,
    )
    this.lastTransform = transform
    this.resolveLayer(data.layerMode, data.playerOrigin)

    this.image
      .setPosition(
        this.lastTransform.position.x,
        this.lastTransform.position.y,
      )
      .setRotation(this.lastTransform.rotation)
      .setScale(
        this.lastTransform.scaleX,
        this.lastTransform.scaleY,
      )
      .setAlpha(data.state === 'FUMBLED_COOLDOWN' ? 0.78 : 1)
      .setVisible(this.visible)

    this.drawCharge(data)
    this.drawAnchors(data, mountPoint, pocketTarget)
  }

  getPocketAnchor(): Point {
    return { ...this.lastTransform.pocket }
  }

  isAssetBacked(): boolean {
    return hasVisualAsset(this.scene, this.definition.asset.key)
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.image.setVisible(visible)
    this.chargeGraphics.setVisible(visible)
    if (!visible) {
      this.chargeGraphics.clear()
      this.anchorGraphics.clear().setVisible(false)
    }
  }

  destroy(): void {
    this.image.destroy()
    this.chargeGraphics.destroy()
    this.anchorGraphics.destroy()
  }

  private resolveLayer(
    mode: ArenaStickLayerMode,
    playerOrigin: Point,
  ): void {
    if (mode === 'above') {
      this.automaticAbove = true
    } else if (mode === 'below') {
      this.automaticAbove = false
    } else {
      const deltaY = this.lastTransform.pocket.y - playerOrigin.y

      if (deltaY > 4) {
        this.automaticAbove = true
      } else if (deltaY < -4) {
        this.automaticAbove = false
      }
    }

    this.image.setDepth(
      arenaLayers.players + (this.automaticAbove ? 0.65 : -0.35),
    )
  }

  private drawCharge(data: ArenaStickRendererUpdate): void {
    this.chargeGraphics.clear().setVisible(this.visible)

    if (!data.chargeVfx || data.charge.normalized <= 0) {
      return
    }

    const pocket = this.lastTransform.pocket
    const charge = Phaser.Math.Clamp(data.charge.normalized, 0, 1)
    const color = data.charge.fullyCharged
      ? 0xfff2a0
      : data.charge.hardCharge
        ? 0xffb347
        : 0x71efff
    const pulse = data.reducedMotion
      ? 1
      : 1 + Math.sin(data.now * 0.015) * 0.08

    this.chargeGraphics.fillStyle(color, 0.12 + charge * 0.22)
    this.chargeGraphics.fillCircle(
      pocket.x,
      pocket.y,
      (10 + charge * 7) * pulse,
    )
    this.chargeGraphics.lineStyle(2 + charge * 1.5, color, 0.42 + charge * 0.4)
    this.chargeGraphics.strokeCircle(
      pocket.x,
      pocket.y,
      (8 + charge * 6) * pulse,
    )
  }

  private drawAnchors(
    data: ArenaStickRendererUpdate,
    mountPoint: Point,
    pocketTarget: Point,
  ): void {
    this.anchorGraphics.clear()
    const show = data.showAnchors || data.showContract
    this.anchorGraphics.setVisible(this.visible && show)

    if (!this.visible || !show) {
      return
    }

    this.anchorGraphics.lineStyle(1, 0xffffff, 0.7)
    this.anchorGraphics.lineBetween(
      data.playerOrigin.x,
      data.playerOrigin.y,
      this.lastTransform.pivot.x,
      this.lastTransform.pivot.y,
    )
    this.drawAnchor(data.playerOrigin, 0xffffff, 5)
    this.drawAnchor(mountPoint, 0xff4f87, 4)
    this.drawAnchor(this.lastTransform.grip, 0x70ff9e, 4)
    this.drawAnchor(this.lastTransform.pivot, 0xffcf5a, 4)
    this.drawAnchor(this.lastTransform.pocket, 0x4fe7ff, 5)
    this.drawAnchor(this.lastTransform.tip, 0xb58cff, 4)
    if (data.showContract) {
      this.anchorGraphics.lineStyle(2, 0xffffff, 0.95)
      this.anchorGraphics.strokeCircle(pocketTarget.x, pocketTarget.y, 7)
      this.anchorGraphics.lineBetween(
        pocketTarget.x - 9,
        pocketTarget.y,
        pocketTarget.x + 9,
        pocketTarget.y,
      )
      this.anchorGraphics.lineBetween(
        pocketTarget.x,
        pocketTarget.y - 9,
        pocketTarget.x,
        pocketTarget.y + 9,
      )
    }
  }

  private drawAnchor(point: Point, color: number, radius: number): void {
    this.anchorGraphics.fillStyle(color, 0.95)
    this.anchorGraphics.fillCircle(point.x, point.y, radius)
    this.anchorGraphics.lineStyle(1, 0x071a2f, 0.9)
    this.anchorGraphics.strokeCircle(point.x, point.y, radius)
  }

  private ensureGeneratedTexture(
    definition: ArenaStickDefinition,
  ): string {
    const key = `generated-${definition.id}-technical-fallback`

    if (this.scene.textures.exists(key)) {
      return key
    }

    const graphics = this.scene.add.graphics()
    const grip = definition.gripAnchor
    const pocket = definition.pocketAnchor
    const tip = definition.tipAnchor

    graphics.lineStyle(10, 0x10243c, 1)
    graphics.lineBetween(grip.x, grip.y, pocket.x - 21, pocket.y - 3)
    graphics.lineStyle(6, 0xe7c66e, 1)
    graphics.lineBetween(grip.x, grip.y, pocket.x - 21, pocket.y - 3)
    graphics.lineStyle(12, 0x10243c, 1)
    graphics.beginPath()
    graphics.moveTo(pocket.x - 28, pocket.y - 5)
    graphics.lineTo(pocket.x + 2, pocket.y + 16)
    graphics.lineTo(tip.x, tip.y)
    graphics.strokePath()
    graphics.lineStyle(7, 0x48c9da, 1)
    graphics.beginPath()
    graphics.moveTo(pocket.x - 28, pocket.y - 5)
    graphics.lineTo(pocket.x + 2, pocket.y + 16)
    graphics.lineTo(tip.x, tip.y)
    graphics.strokePath()
    graphics.fillStyle(0xffef9a, 1)
    graphics.fillCircle(pocket.x, pocket.y, 6)
    graphics.generateTexture(
      key,
      definition.canvas.width,
      definition.canvas.height,
    )
    graphics.destroy()
    return key
  }
}

function offsetPoint(
  point: Point,
  offset: Point,
): Point {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
  }
}

function isPossessionState(state: StickActionState): boolean {
  return (
    state === 'CRADLED_STABLE' ||
    state === 'CRADLED_CHARGING' ||
    state === 'CRADLED_OVERCHARGED' ||
    state === 'RELEASE_WINDUP'
  )
}
