import Phaser from 'phaser'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import {
  arenaBodyDefinitions,
  arenaHairDefinitions,
  type ArenaBodyId,
  type ArenaHairId,
  type ArenaStickId,
  type ArenaStickLayerMode,
} from '../arena/ArenaCharacterAssets'
import { arenaLayers } from '../arena/ArenaLayers'
import type { Point } from '../data/geometry'
import type {
  PlayerHandedness,
  PlayerRole,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { PlayerVisualProfile } from '../data/playerVisualProfiles'
import type { TeamVisualPalette } from '../data/visualPalettes'
import type {
  DefensiveVisualState,
  PlayerAnimationPose,
} from './AnimationState'
import {
  ArenaStickRenderer,
  type ArenaStickRendererUpdate,
} from './ArenaStickRenderer'
import type { ArenaProceduralAnimationFrame } from './ArenaProceduralAnimation'
import {
  hasVisualAsset,
  useLinearVisualAssetFiltering,
} from './VisualAssetOverrides'
import { KeeperShieldVisual } from './KeeperShieldVisual'

export type ArenaCharacterRendererUpdate = {
  position: Point
  playerOrigin: Point
  velocity: Point
  bodyRotation: number
  mountPoint: Point
  stickForward: Point
  cradleSocket: Point
  mirrorSign: -1 | 1
  handedness: PlayerHandedness
  role: PlayerRole
  state: StickActionState
  defenseState: DefensiveVisualState
  pose: PlayerAnimationPose
  charge: {
    normalized: number
    hardCharge: boolean
    fullyCharged: boolean
  }
  spriteScale: number
  stickScale: number
  stickAngle: number
  stickLayerMode: ArenaStickLayerMode
  showAnchors: boolean
  showContract: boolean
  chargeVfx: boolean
  reducedMotion: boolean
  controlled: boolean
  animationSpeed: number
  proceduralAnimation: ArenaProceduralAnimationFrame
  now: number
}

export class ArenaCharacterRenderer {
  private readonly scene: Phaser.Scene
  private readonly container: Phaser.GameObjects.Container
  private readonly fallback: Phaser.GameObjects.Graphics
  private readonly fallbackHair: Phaser.GameObjects.Graphics
  private readonly hitFlash: Phaser.GameObjects.Graphics
  private readonly contractGraphics: Phaser.GameObjects.Graphics
  private readonly assetLayers: Phaser.GameObjects.Image[] = []
  private skinLayer: Phaser.GameObjects.Image | null = null
  private primaryLayer: Phaser.GameObjects.Image | null = null
  private accentLayer: Phaser.GameObjects.Image | null = null
  private hairLayer: Phaser.GameObjects.Image | null = null
  private readonly stick: ArenaStickRenderer
  private readonly keeperShield: KeeperShieldVisual
  private bodyId: ArenaBodyId
  private hairId: ArenaHairId
  private profile: PlayerVisualProfile
  private palette: TeamVisualPalette
  private visible = false
  private assetBacked = false
  private lastStateKey = ''
  private hitFlashRemainingMs = 0
  private lastPocket: Point = { x: 0, y: 0 }
  private fallbackSignature = ''
  private displayingShield: boolean

  constructor(
    scene: Phaser.Scene,
    profile: PlayerVisualProfile,
    palette: TeamVisualPalette,
    bodyId: ArenaBodyId,
    hairId: ArenaHairId,
    stickId: ArenaStickId,
    teamSide: TeamSide,
    role: PlayerRole,
  ) {
    this.scene = scene
    this.profile = profile
    this.palette = palette
    this.bodyId = bodyId
    this.hairId = hairId
    this.container = scene.add
      .container(0, 0)
      .setDepth(arenaLayers.players)
      .setVisible(false)
    this.fallback = scene.add.graphics()
    this.fallbackHair = scene.add.graphics().setVisible(false)
    this.hitFlash = scene.add.graphics()
    this.contractGraphics = scene.add
      .graphics()
      .setDepth(arenaLayers.geometryOverlay)
      .setVisible(false)
    this.container.add([
      this.fallback,
      this.fallbackHair,
      this.hitFlash,
    ])
    this.stick = new ArenaStickRenderer(scene, stickId)
    this.keeperShield = new KeeperShieldVisual(scene, teamSide)
    this.displayingShield = usesKeeperShield(role)
    this.keeperShield.setVisible(false)
    this.buildAssetLayers()
    this.container.bringToTop(this.fallbackHair)
    this.container.bringToTop(this.hitFlash)
    this.applyAppearance(profile, palette)
  }

  applyAppearance(
    profile: PlayerVisualProfile,
    palette: TeamVisualPalette,
  ): void {
    this.profile = profile
    this.palette = palette
    this.applyAssetColors()
    this.fallbackSignature = ''
  }

  update(data: ArenaCharacterRendererUpdate): void {
    const definition = arenaBodyDefinitions[this.bodyId]
    const deltaMs = Math.min(50, Math.max(0, this.scene.game.loop.delta))
    const authoredScale =
      definition.displaySize.width / definition.canvas.width
    const roleScale = { x: 1, y: 1 } as const
    const selectedPulse =
      data.controlled && !data.reducedMotion
        ? 1 + Math.sin(data.now * 0.006 * data.animationSpeed) * 0.018
        : data.controlled
          ? 1.015
          : 1
    const fullyChargedShake =
      data.proceduralAnimation.enabled &&
      data.charge.fullyCharged &&
      !data.reducedMotion
        ? {
            x: Math.sin(data.now * 0.21) * 0.75,
            y: Math.cos(data.now * 0.18) * 0.55,
          }
        : { x: 0, y: 0 }

    this.container
      .setPosition(
        data.position.x + fullyChargedShake.x,
        data.position.y + fullyChargedShake.y,
      )
      .setRotation(data.bodyRotation - definition.authoredForwardAngle)
      .setScale(
        authoredScale *
          data.spriteScale *
          roleScale.x *
          data.pose.bodyScaleX *
          selectedPulse,
        authoredScale *
          data.spriteScale *
          roleScale.y *
          data.pose.bodyScaleY *
          selectedPulse,
      )
      .setVisible(this.visible)

    this.drawFallback(data.role)
    this.updateHitFlash(data.state, data.defenseState, deltaMs)

    const visualMountPoint = this.resolveGripAnchorWorld(data, definition)
    const stickUpdate: ArenaStickRendererUpdate = {
      playerOrigin: data.playerOrigin,
      mountPoint: visualMountPoint,
      pocketTarget: data.cradleSocket,
      aimAngle: Math.atan2(data.stickForward.y, data.stickForward.x),
      mirrorSign: data.mirrorSign,
      state: data.state,
      pose: data.pose,
      charge: data.charge,
      scale: data.stickScale,
      angleOffset: data.stickAngle,
      layerMode: data.stickLayerMode,
      showAnchors: data.showAnchors,
      showContract: data.showContract,
      chargeVfx: data.chargeVfx,
      reducedMotion: data.reducedMotion,
      visualOffset: fullyChargedShake,
      visualRotationOffset: data.proceduralAnimation.stickActionAngle,
      actionState: data.proceduralAnimation.stickActionState,
      releaseTier: data.proceduralAnimation.releaseTier,
      slashTrailAlpha: data.proceduralAnimation.slashTrailAlpha,
      releaseTrailAlpha: data.proceduralAnimation.releaseTrailAlpha,
      fullChargeBurstAlpha:
        data.proceduralAnimation.fullChargeBurstAlpha,
      now: data.now,
    }
    this.displayingShield = usesKeeperShield(data.role)

    if (this.displayingShield) {
      this.stick.setVisible(false)
      this.keeperShield.setVisible(this.visible)
      this.keeperShield.update(
        visualMountPoint,
        {
          x: Math.cos(data.bodyRotation),
          y: Math.sin(data.bodyRotation),
        },
        data.state,
        data.defenseState,
      )
      this.lastPocket = { ...data.cradleSocket }
    } else {
      this.keeperShield.setVisible(false)
      this.stick.setVisible(this.visible)
      this.stick.update(stickUpdate)
      this.lastPocket = this.stick.getPocketAnchor()
    }
    this.drawContractOverlay(data, definition)
  }

  getPocketAnchor(): Point {
    return { ...this.lastPocket }
  }

  isAssetBacked(): boolean {
    return this.assetBacked && this.stick.isAssetBacked()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.container.setVisible(visible)
    this.stick.setVisible(visible && !this.displayingShield)
    this.keeperShield.setVisible(visible && this.displayingShield)
    if (!visible) {
      this.contractGraphics.clear().setVisible(false)
    }
  }

  destroy(): void {
    this.container.destroy(true)
    this.contractGraphics.destroy()
    this.stick.destroy()
    this.keeperShield.destroy()
  }

  private buildAssetLayers(): void {
    const body = arenaBodyDefinitions[this.bodyId]
    const hair = arenaHairDefinitions[this.hairId]
    this.assetBacked = hasVisualAsset(this.scene, body.body.key)

    if (!this.assetBacked) {
      this.fallback.setVisible(true)
      this.fallbackHair.setVisible(false)
      return
    }

    this.fallback.setVisible(false)
    const originX = body.origin.x / body.canvas.width
    const originY = body.origin.y / body.canvas.height
    const bodyBase = this.scene.add
      .image(0, 0, body.body.key)
      .setOrigin(originX, originY)
    useLinearVisualAssetFiltering(this.scene, body.body.key)
    this.skinLayer = this.createMaskLayer(
      body.skinMask.key,
      originX,
      originY,
    )
    this.primaryLayer = this.createMaskLayer(
      body.uniformPrimaryMask.key,
      originX,
      originY,
    )
    this.accentLayer = this.createMaskLayer(
      body.uniformAccentMask.key,
      originX,
      originY,
    )

    if (hasVisualAsset(this.scene, hair.asset.key)) {
      useLinearVisualAssetFiltering(this.scene, hair.asset.key)
      this.hairLayer = this.scene.add
        .image(0, 0, hair.asset.key)
        .setOrigin(
          hair.origin.x / hair.canvas.width,
          hair.origin.y / hair.canvas.height,
        )
    } else {
      this.drawFallbackHair(body)
    }

    this.assetLayers.push(
      bodyBase,
      ...[
        this.skinLayer,
        this.primaryLayer,
        this.accentLayer,
        this.hairLayer,
      ].filter((layer): layer is Phaser.GameObjects.Image => Boolean(layer)),
    )
    this.container.add(this.assetLayers)
  }

  private applyAssetColors(): void {
    if (!this.assetBacked) {
      return
    }

    this.skinLayer?.setTint(this.profile.skinColor ?? 0xd59a6f)
    this.primaryLayer?.setTint(this.palette.shirt)
    this.accentLayer?.setTint(this.palette.trim)
    this.hairLayer?.setTint(this.profile.hairColor)
    if (!this.hairLayer) {
      this.drawFallbackHair(arenaBodyDefinitions[this.bodyId])
    }
  }

  private drawFallback(role: PlayerRole): void {
    if (this.assetBacked) {
      return
    }

    const signature = [
      role,
      this.profile.skinColor,
      this.profile.hairColor,
      this.palette.shirt,
      this.palette.trim,
      this.palette.shorts,
    ].join(':')

    if (signature === this.fallbackSignature) {
      return
    }

    this.fallbackSignature = signature
    const outline = 0x0b2038
    const skin = this.profile.skinColor ?? 0xd59a6f
    const width = role === 'brute' ? 29 : role === 'striker' ? 22 : 25

    this.fallback.clear()
    this.fallback.fillStyle(outline, 1)
    this.fallback.fillRoundedRect(-width - 3, -14, width * 2 + 6, 58, 14)
    this.fallback.fillStyle(this.palette.shirt, 1)
    this.fallback.fillRoundedRect(-width, -11, width * 2, 42, 11)
    this.fallback.fillStyle(this.palette.trim, 1)
    this.fallback.fillRect(-width, 8, width * 2, 7)
    this.fallback.fillStyle(this.palette.shorts, 1)
    this.fallback.fillRoundedRect(-width + 3, 25, width * 2 - 6, 20, 7)

    this.fallback.fillStyle(outline, 1)
    this.fallback.fillCircle(0, -42, 26)
    this.fallback.fillStyle(skin, 1)
    this.fallback.fillCircle(0, -42, 22)
    this.fallback.fillStyle(this.profile.hairColor, 1)
    this.fallback.fillEllipse(0, -52, 39, 23)
    this.fallback.fillTriangle(-18, -51, -7, -67, -2, -49)
    this.fallback.fillTriangle(2, -52, 12, -68, 17, -49)

    this.fallback.fillStyle(outline, 1)
    this.fallback.fillCircle(-9, -42, 3)
    this.fallback.fillCircle(9, -42, 3)
    this.fallback.fillStyle(this.palette.trim, 1)
    this.fallback.fillCircle(0, 7, 5)

    this.fallback.lineStyle(10, outline, 1)
    this.fallback.lineBetween(-width + 3, -2, -width - 13, 17)
    this.fallback.lineBetween(width - 3, -2, width + 13, 17)
    this.fallback.lineStyle(6, skin, 1)
    this.fallback.lineBetween(-width + 3, -2, -width - 13, 17)
    this.fallback.lineBetween(width - 3, -2, width + 13, 17)
  }

  private updateHitFlash(
    state: StickActionState,
    defenseState: DefensiveVisualState,
    deltaMs: number,
  ): void {
    const stateKey = `${state}:${defenseState}`

    if (
      stateKey !== this.lastStateKey &&
      (state === 'FUMBLED_COOLDOWN' ||
        defenseState === 'KNOCKED_DOWN')
    ) {
      this.hitFlashRemainingMs = 110
    }

    this.lastStateKey = stateKey
    this.hitFlashRemainingMs = Math.max(
      0,
      this.hitFlashRemainingMs - deltaMs,
    )
    this.hitFlash.clear()

    if (this.hitFlashRemainingMs <= 0) {
      return
    }

    this.hitFlash.fillStyle(
      0xffffff,
      Phaser.Math.Clamp(this.hitFlashRemainingMs / 110, 0, 0.65),
    )
    this.hitFlash.fillEllipse(0, -6, 72, 98)
  }

  private createMaskLayer(
    textureKey: string,
    originX: number,
    originY: number,
  ): Phaser.GameObjects.Image | null {
    if (!hasVisualAsset(this.scene, textureKey)) {
      return null
    }

    useLinearVisualAssetFiltering(this.scene, textureKey)
    return this.scene.add
      .image(0, 0, textureKey)
      .setOrigin(originX, originY)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
  }

  private drawFallbackHair(
    body: (typeof arenaBodyDefinitions)[ArenaBodyId],
  ): void {
    const x = body.headAnchor.x - body.origin.x
    const y = body.headAnchor.y - body.origin.y - 5

    this.fallbackHair.clear().setVisible(this.assetBacked)
    this.fallbackHair.fillStyle(0x101b2b, 1)
    this.fallbackHair.fillCircle(x, y, 21)
    this.fallbackHair.fillStyle(this.profile.hairColor, 1)
    this.fallbackHair.fillCircle(x, y - 1, 18)
    this.fallbackHair.fillTriangle(x - 15, y - 5, x - 5, y - 25, x, y - 5)
    this.fallbackHair.fillTriangle(x - 2, y - 8, x + 8, y - 27, x + 13, y - 4)
  }

  private drawContractOverlay(
    data: ArenaCharacterRendererUpdate,
    body: (typeof arenaBodyDefinitions)[ArenaBodyId],
  ): void {
    this.contractGraphics.clear()
    this.contractGraphics.setVisible(this.visible && data.showContract)

    if (!this.visible || !data.showContract) {
      return
    }

    const matrix = this.container.getWorldTransformMatrix()
    const origin = matrix.transformPoint(0, 0)
    const head = matrix.transformPoint(
      body.headAnchor.x - body.origin.x,
      body.headAnchor.y - body.origin.y,
    )
    const hand = this.resolveGripAnchorWorld(data, body)

    this.contractGraphics.lineStyle(1, 0xffffff, 0.7)
    this.contractGraphics.lineBetween(origin.x, origin.y, head.x, head.y)
    this.contractGraphics.lineBetween(origin.x, origin.y, hand.x, hand.y)
    this.drawContractAnchor(origin, 0xff5b6e, 5)
    this.drawContractAnchor(head, 0x74ff8f, 4)
    this.drawContractAnchor(hand, 0x40dcff, 4)
  }

  private drawContractAnchor(
    point: Phaser.Types.Math.Vector2Like,
    color: number,
    radius: number,
  ): void {
    this.contractGraphics.fillStyle(color, 0.95)
    this.contractGraphics.fillCircle(point.x, point.y, radius)
    this.contractGraphics.lineStyle(1, 0x071a2f, 0.9)
    this.contractGraphics.strokeCircle(point.x, point.y, radius)
  }

  private resolveGripAnchorWorld(
    data: ArenaCharacterRendererUpdate,
    body: (typeof arenaBodyDefinitions)[ArenaBodyId],
  ): Point {
    const matrix = this.container.getWorldTransformMatrix()
    const handSign = data.handedness === 'left' ? -1 : 1
    const point = matrix.transformPoint(
      (body.gripAnchor.x - body.origin.x) * handSign,
      body.gripAnchor.y - body.origin.y,
    )

    return { x: point.x, y: point.y }
  }
}

function usesKeeperShield(role: PlayerRole): boolean {
  return (
    role === 'keeper' &&
    keeperShieldConfig.keeperUsesShieldDefault &&
    keeperShieldConfig.keeperEquipmentType === 'shield'
  )
}
