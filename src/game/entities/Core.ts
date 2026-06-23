import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import type { Point } from '../data/geometry'
import { resolveArenaCoreVisualState } from '../arena/ArenaCharacterAssets'
import { ArenaCoreRenderer } from '../rendering/ArenaCoreRenderer'

export type CorePresentationSettings = {
  chargeOverride: number | null
  forceFullyCharged: boolean
  spinEnabled: boolean
  chargeVfx: boolean
  reducedMotion: boolean
  contractOverlay: boolean
}

const defaultPresentationSettings: CorePresentationSettings = {
  chargeOverride: null,
  forceFullyCharged: false,
  spinEnabled: true,
  chargeVfx: true,
  reducedMotion: false,
  contractOverlay: false,
}

export class Core {
  readonly body: MatterJS.BodyType

  private readonly scene: Phaser.Scene
  private readonly renderer: ArenaCoreRenderer
  private visualAttachment: Point | null = null
  private possessionCharge = 0
  private possessionHardCharge = false
  private possessionOvercharged = false
  private possessionActive = false
  private releaseVisualCharge = 0
  private releaseVisualUntil = 0
  private releaseVisualOvercharged = false
  private disruptedVisualUntil = 0
  private presentation = { ...defaultPresentationSettings }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.body = scene.matter.add.circle(
      coreConfig.spawn.x,
      coreConfig.spawn.y,
      coreConfig.radius,
      {
        label: 'core',
        restitution: coreConfig.restitution,
        friction: coreConfig.friction,
        frictionAir: coreConfig.frictionAir,
        density: coreConfig.density,
      },
    )
    this.renderer = new ArenaCoreRenderer(scene)
  }

  get position(): Point {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
    }
  }

  get velocity(): Point {
    return {
      x: this.body.velocity.x,
      y: this.body.velocity.y,
    }
  }

  get renderedPosition(): Point {
    return this.renderer.getPosition()
  }

  update(deltaMs = this.scene.game.loop.delta): void {
    const now = this.scene.time.now
    const released = now < this.releaseVisualUntil
    const disrupted = now < this.disruptedVisualUntil
    const overrideCharge = this.presentation.chargeOverride
    const charge = this.presentation.forceFullyCharged
      ? 1
      : overrideCharge === null
        ? released
          ? this.releaseVisualCharge
          : this.possessionCharge
        : Phaser.Math.Clamp(overrideCharge, 0, 1)
    const fullyCharged =
      this.presentation.forceFullyCharged ||
      (this.possessionActive && charge >= 0.995)
    const state = resolveArenaCoreVisualState({
      possessed: this.possessionActive || overrideCharge !== null,
      charge,
      fullyCharged,
      released,
      disrupted,
    })

    this.renderer.update({
      position: this.visualAttachment ?? this.position,
      velocity: this.velocity,
      angularVelocity: this.body.angularVelocity,
      state,
      charge,
      hardCharge:
        this.presentation.forceFullyCharged || this.possessionHardCharge,
      overcharged:
        this.possessionOvercharged ||
        (released && this.releaseVisualOvercharged),
      spinEnabled: this.presentation.spinEnabled,
      chargeVfx: this.presentation.chargeVfx,
      reducedMotion: this.presentation.reducedMotion,
      contractOverlay: this.presentation.contractOverlay,
      deltaMs: Math.min(50, Math.max(0, deltaMs)),
      now,
    })
  }

  reset(): void {
    this.setSensor(false)
    this.setPosition({ ...coreConfig.spawn })
    this.setVelocity({ x: 0, y: 0 })
    this.visualAttachment = null
    this.possessionCharge = 0
    this.possessionHardCharge = false
    this.possessionOvercharged = false
    this.possessionActive = false
    this.releaseVisualCharge = 0
    this.releaseVisualUntil = 0
    this.disruptedVisualUntil = 0
    this.presentation = { ...defaultPresentationSettings }
    this.update()
  }

  holdAt(position: Point): void {
    this.setPosition(position)
    this.setVelocity({ x: 0, y: 0 })
  }

  setPossessionVisual(
    charge: number,
    hardCharge: boolean,
    overcharged: boolean,
    possessed = false,
  ): void {
    this.possessionCharge = Phaser.Math.Clamp(charge, 0, 1)
    this.possessionHardCharge = hardCharge
    this.possessionOvercharged = overcharged
    this.possessionActive = possessed
  }

  setReleaseVisualCharge(charge: number, overcharged: boolean): void {
    this.releaseVisualCharge = Phaser.Math.Clamp(charge, 0, 1)
    this.releaseVisualOvercharged = overcharged
    this.releaseVisualUntil = this.scene.time.now + 260
    this.possessionCharge = 0
    this.possessionHardCharge = false
    this.possessionOvercharged = false
    this.possessionActive = false
    this.visualAttachment = null
  }

  setDisruptedVisual(): void {
    this.disruptedVisualUntil = this.scene.time.now + 220
    this.visualAttachment = null
  }

  setVisualAttachment(position: Point | null): void {
    this.visualAttachment = position ? { ...position } : null
  }

  setPresentationSettings(settings: CorePresentationSettings): void {
    this.presentation = { ...settings }
  }

  setPosition(position: Point): void {
    this.scene.matter.body.setPosition(this.body, position)
  }

  setVelocity(velocity: Point): void {
    this.scene.matter.body.setVelocity(this.body, velocity)
    this.scene.matter.body.setAngularVelocity(this.body, 0)
  }

  setAngularVelocity(angularVelocity: number): void {
    this.scene.matter.body.setAngularVelocity(this.body, angularVelocity)
  }

  setSensor(isSensor: boolean): void {
    this.scene.matter.body.set(this.body, 'isSensor', isSensor)
  }

  applyForce(force: Point): void {
    this.scene.matter.body.applyForce(this.body, this.body.position, force)
  }
}
