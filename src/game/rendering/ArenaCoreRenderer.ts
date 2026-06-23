import Phaser from 'phaser'
import {
  arenaCoreDefinition,
  type ArenaCoreVisualState,
} from '../arena/ArenaCharacterAssets'
import { arenaLayers } from '../arena/ArenaLayers'
import { coreConfig } from '../config/entityConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import type { Point } from '../data/geometry'
import {
  hasVisualAsset,
  useLinearVisualAssetFiltering,
} from './VisualAssetOverrides'

export type ArenaCoreRendererUpdate = {
  position: Point
  velocity: Point
  angularVelocity: number
  state: ArenaCoreVisualState
  charge: number
  hardCharge: boolean
  overcharged: boolean
  spinEnabled: boolean
  chargeVfx: boolean
  reducedMotion: boolean
  contractOverlay: boolean
  deltaMs: number
  now: number
}

export class ArenaCoreRenderer {
  private readonly shell: Phaser.GameObjects.Arc
  private readonly assetImage: Phaser.GameObjects.Image | null
  private readonly glow: Phaser.GameObjects.Arc
  private readonly trail: Phaser.GameObjects.Graphics
  private readonly marking: Phaser.GameObjects.Graphics
  private readonly chargeEffects: Phaser.GameObjects.Graphics
  private readonly contractGraphics: Phaser.GameObjects.Graphics
  private position: Point = { x: 0, y: 0 }
  private rotation = 0
  private previousState: ArenaCoreVisualState = 'free'
  private confirmationRingAgeMs = Number.POSITIVE_INFINITY

  constructor(scene: Phaser.Scene) {
    this.trail = scene.add.graphics().setDepth(arenaLayers.gameplayVfx)
    this.chargeEffects = scene.add
      .graphics()
      .setDepth(arenaLayers.gameplayVfx + 1)
    this.glow = scene.add
      .circle(0, 0, coreConfig.radius * 2.15, coreConfig.glowColor, 0.16)
      .setDepth(arenaLayers.core - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.shell = scene.add
      .circle(0, 0, coreConfig.radius, coreConfig.fillColor, 1)
      .setDepth(arenaLayers.core)
      .setStrokeStyle(3, coreConfig.strokeColor, 1)
    if (hasVisualAsset(scene, arenaCoreDefinition.asset.key)) {
      useLinearVisualAssetFiltering(scene, arenaCoreDefinition.asset.key)
    }
    this.assetImage = hasVisualAsset(scene, arenaCoreDefinition.asset.key)
      ? scene.add
          .image(0, 0, arenaCoreDefinition.asset.key)
          .setDisplaySize(
            arenaCoreDefinition.displaySize,
            arenaCoreDefinition.displaySize,
          )
          .setDepth(arenaLayers.core + 0.1)
      : null
    this.shell.setVisible(!this.assetImage)
    this.marking = scene.add
      .graphics()
      .setDepth(arenaLayers.core + 0.2)
    this.contractGraphics = scene.add
      .graphics()
      .setDepth(arenaLayers.geometryOverlay)
      .setVisible(false)
  }

  update(data: ArenaCoreRendererUpdate): void {
    this.position = { ...data.position }
    this.advanceRotation(data)

    if (
      data.state === 'fullyCharged' &&
      this.previousState !== 'fullyCharged'
    ) {
      this.confirmationRingAgeMs = 0
    } else if (data.state !== 'fullyCharged') {
      this.confirmationRingAgeMs = Number.POSITIVE_INFINITY
    }
    this.previousState = data.state
    this.confirmationRingAgeMs += data.deltaMs

    this.drawTrail(data)
    this.updateCoreBody(data)
    this.drawMarking(data)
    this.drawChargeEffects(data)
    this.drawContractOverlay(data)
  }

  getPosition(): Point {
    return { ...this.position }
  }

  destroy(): void {
    this.trail.destroy()
    this.chargeEffects.destroy()
    this.glow.destroy()
    this.shell.destroy()
    this.assetImage?.destroy()
    this.marking.destroy()
    this.contractGraphics.destroy()
  }

  private advanceRotation(data: ArenaCoreRendererUpdate): void {
    if (!data.spinEnabled) {
      return
    }

    const speed = Math.hypot(data.velocity.x, data.velocity.y)
    const radiansPerMs = data.reducedMotion
      ? 0.0018
      : data.state === 'fullyCharged'
        ? 0.021
        : data.state === 'charging'
          ? Phaser.Math.Linear(0.004, 0.017, data.charge)
          : data.state === 'possessed'
            ? 0.0035
            : data.state === 'released'
              ? 0.006 + Math.min(0.016, speed * 0.0012)
              : 0.002 + Math.min(0.009, speed * 0.0008)
    const physicsSpin = Number.isFinite(data.angularVelocity)
      ? data.angularVelocity * 0.012
      : 0
    this.rotation = Phaser.Math.Angle.Wrap(
      this.rotation +
        (radiansPerMs + physicsSpin) * Math.min(50, data.deltaMs),
    )
  }

  private drawTrail(data: ArenaCoreRendererUpdate): void {
    const speed = Math.hypot(data.velocity.x, data.velocity.y)
    const released = data.state === 'released'
    const trailAlpha =
      Phaser.Math.Clamp(speed / 10, 0, 0.55) *
      (released ? Phaser.Math.Linear(1, 1.55, data.charge) : 1)
    const trailLength = released
      ? Phaser.Math.Linear(5, 8.5, data.charge)
      : 5

    this.trail.clear()
    this.trail.lineStyle(
      released ? Phaser.Math.Linear(5, 8, data.charge) : 5,
      coreConfig.trailColor,
      trailAlpha,
    )
    this.trail.lineBetween(
      data.position.x - data.velocity.x * trailLength,
      data.position.y - data.velocity.y * trailLength,
      data.position.x,
      data.position.y,
    )
  }

  private updateCoreBody(data: ArenaCoreRendererUpdate): void {
    const color = chargeColor(data)
    const chargeAlpha = data.charge > 0
      ? Phaser.Math.Linear(0.18, 0.36, data.charge)
      : 0.16

    this.glow
      .setPosition(data.position.x, data.position.y)
      .setFillStyle(color, chargeAlpha)
    this.shell
      .setPosition(data.position.x, data.position.y)
      .setFillStyle(
        data.charge > 0
          ? Phaser.Display.Color.Interpolate.ColorWithColor(
              Phaser.Display.Color.ValueToColor(coreConfig.fillColor),
              Phaser.Display.Color.ValueToColor(color),
              100,
              Math.round(data.charge * 44),
            ).color
          : coreConfig.fillColor,
        1,
      )
    this.assetImage
      ?.setPosition(data.position.x, data.position.y)
      .setRotation(this.rotation)
      .setTint(data.charge > 0 ? color : 0xffffff)
  }

  private drawMarking(data: ArenaCoreRendererUpdate): void {
    const radius = coreConfig.radius * 0.72
    const forward = {
      x: Math.cos(this.rotation),
      y: Math.sin(this.rotation),
    }
    const right = { x: -forward.y, y: forward.x }
    const color = data.state === 'fullyCharged' ? 0xffffff : 0x173b5a

    this.marking.clear()
    this.marking.lineStyle(2, color, this.assetImage ? 0.7 : 0.9)
    this.marking.lineBetween(
      data.position.x - forward.x * radius,
      data.position.y - forward.y * radius,
      data.position.x + forward.x * radius,
      data.position.y + forward.y * radius,
    )
    this.marking.fillStyle(color, 0.92)
    this.marking.fillCircle(
      data.position.x + right.x * radius * 0.55,
      data.position.y + right.y * radius * 0.55,
      2.2,
    )
  }

  private drawChargeEffects(data: ArenaCoreRendererUpdate): void {
    this.chargeEffects.clear()

    if (!data.chargeVfx || data.charge <= 0) {
      return
    }

    const color = chargeColor(data)
    const pulse = data.reducedMotion
      ? 1
      : 1 + Math.sin(data.now * 0.016) * 0.07
    const radius =
      coreConfig.radius * Phaser.Math.Linear(1.45, 2.15, data.charge) * pulse

    this.chargeEffects.lineStyle(
      data.state === 'fullyCharged' ? 4 : 2 + data.charge * 1.5,
      color,
      0.48 + data.charge * 0.38,
    )
    this.chargeEffects.strokeCircle(data.position.x, data.position.y, radius)

    if (data.reducedMotion) {
      this.chargeEffects.lineStyle(2, 0xffffff, 0.78)
      this.chargeEffects.strokeCircle(
        data.position.x,
        data.position.y,
        radius * 0.76,
      )
      return
    }

    if (data.charge >= 0.55) {
      for (let index = 0; index < 4; index += 1) {
        const phase = (data.now * 0.07 + index * 17) % 38
        const x = data.position.x + (index - 1.5) * 6
        const y = data.position.y + 22 - phase
        this.chargeEffects.lineStyle(2, color, 0.24 + data.charge * 0.42)
        this.chargeEffects.lineBetween(x, y, x + (index % 2 ? 2 : -2), y - 8)
      }
    }

    if (data.state === 'fullyCharged') {
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6 + data.now * 0.002
        const inner = radius * 0.9
        const outer = radius * 1.32
        this.chargeEffects.lineStyle(2, 0xfff5b0, 0.72)
        this.chargeEffects.lineBetween(
          data.position.x + Math.cos(angle) * inner,
          data.position.y + Math.sin(angle) * inner,
          data.position.x + Math.cos(angle) * outer,
          data.position.y + Math.sin(angle) * outer,
        )
      }
    }

    if (this.confirmationRingAgeMs <= 360) {
      const progress = this.confirmationRingAgeMs / 360
      this.chargeEffects.lineStyle(
        3,
        0xffffff,
        Phaser.Math.Linear(0.85, 0, progress),
      )
      this.chargeEffects.strokeCircle(
        data.position.x,
        data.position.y,
        Phaser.Math.Linear(radius, radius * 2.25, progress),
      )
    }
  }

  private drawContractOverlay(data: ArenaCoreRendererUpdate): void {
    this.contractGraphics.clear().setVisible(data.contractOverlay)

    if (!data.contractOverlay) {
      return
    }

    this.contractGraphics.lineStyle(2, 0xff63de, 0.95)
    this.contractGraphics.strokeCircle(data.position.x, data.position.y, 6)
    this.contractGraphics.lineBetween(
      data.position.x - 9,
      data.position.y,
      data.position.x + 9,
      data.position.y,
    )
    this.contractGraphics.lineBetween(
      data.position.x,
      data.position.y - 9,
      data.position.x,
      data.position.y + 9,
    )
  }
}

function chargeColor(data: ArenaCoreRendererUpdate): number {
  if (data.state === 'fullyCharged') {
    return 0xfff2a0
  }
  if (data.overcharged) {
    return possessionFeelConfig.chargeCoreColorOvercharged
  }
  if (data.hardCharge) {
    return possessionFeelConfig.chargeCoreColorHard
  }
  if (data.charge >= 0.4) {
    return possessionFeelConfig.chargeCoreColorCharging
  }
  if (data.charge > 0) {
    return possessionFeelConfig.chargeCoreColorStable
  }
  return coreConfig.glowColor
}
