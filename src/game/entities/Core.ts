import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import type { Point } from '../data/geometry'

export class Core {
  readonly body: MatterJS.BodyType

  private scene: Phaser.Scene
  private glow: Phaser.GameObjects.Arc
  private shell: Phaser.GameObjects.Arc
  private trail: Phaser.GameObjects.Graphics
  private chargeAccent: Phaser.GameObjects.Graphics
  private possessionCharge = 0
  private possessionOvercharged = false
  private releaseVisualCharge = 0
  private releaseVisualUntil = 0
  private releaseVisualOvercharged = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.body = scene.matter.add.circle(coreConfig.spawn.x, coreConfig.spawn.y, coreConfig.radius, {
      label: 'core',
      restitution: coreConfig.restitution,
      friction: coreConfig.friction,
      frictionAir: coreConfig.frictionAir,
      density: coreConfig.density,
    })

    this.trail = scene.add.graphics().setDepth(4)
    this.chargeAccent = scene.add.graphics().setDepth(7)
    this.glow = scene.add.circle(
      coreConfig.spawn.x,
      coreConfig.spawn.y,
      coreConfig.radius * 2.15,
      coreConfig.glowColor,
      0.16,
    )
    this.glow.setDepth(7)
    this.shell = scene.add.circle(
      coreConfig.spawn.x,
      coreConfig.spawn.y,
      coreConfig.radius,
      coreConfig.fillColor,
      1,
    )
    this.shell.setDepth(8)

    this.glow.setBlendMode(Phaser.BlendModes.ADD)
    this.shell.setStrokeStyle(3, coreConfig.strokeColor, 1)
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

  update(): void {
    const position = this.position
    const velocity = this.body.velocity
    const speed = Math.hypot(velocity.x, velocity.y)
    const releaseCharge =
      this.scene.time.now < this.releaseVisualUntil
        ? this.releaseVisualCharge
        : 0
    const unstableFlicker =
      this.releaseVisualOvercharged && releaseCharge > 0
        ? 0.72 + Math.sin(this.scene.time.now * 0.065) * 0.28
        : 1
    const trailAlpha =
      Phaser.Math.Clamp(speed / 10, 0, 0.55) *
      Phaser.Math.Linear(1, 1.55, releaseCharge) *
      unstableFlicker
    const trailLength = Phaser.Math.Linear(5, 8.5, releaseCharge)

    this.trail.clear()
    this.trail.lineStyle(
      Phaser.Math.Linear(5, 8, releaseCharge),
      coreConfig.trailColor,
      trailAlpha,
    )
    this.trail.lineBetween(
      position.x - velocity.x * trailLength,
      position.y - velocity.y * trailLength,
      position.x,
      position.y,
    )

    this.glow.setPosition(position.x, position.y)
    this.shell.setPosition(position.x, position.y)
    this.drawChargeAccent(position)
  }

  reset(): void {
    this.setSensor(false)
    this.setPosition({
      x: coreConfig.spawn.x,
      y: coreConfig.spawn.y,
    })
    this.setVelocity({ x: 0, y: 0 })
    this.possessionCharge = 0
    this.possessionOvercharged = false
    this.releaseVisualCharge = 0
    this.releaseVisualUntil = 0
    this.update()
  }

  holdAt(position: Point): void {
    this.setPosition(position)
    this.setVelocity({ x: 0, y: 0 })
    this.trail.clear()
    this.glow.setPosition(position.x, position.y)
    this.shell.setPosition(position.x, position.y)
  }

  setPossessionVisual(charge: number, overcharged: boolean): void {
    this.possessionCharge = Phaser.Math.Clamp(charge, 0, 1)
    this.possessionOvercharged = overcharged
  }

  setReleaseVisualCharge(charge: number, overcharged: boolean): void {
    this.releaseVisualCharge = Phaser.Math.Clamp(charge, 0, 1)
    this.releaseVisualOvercharged = overcharged
    this.releaseVisualUntil = this.scene.time.now + 260
    this.possessionCharge = 0
    this.possessionOvercharged = false
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

  private drawChargeAccent(position: Point): void {
    this.chargeAccent.clear()

    if (this.possessionCharge <= 0) {
      return
    }

    const pulse =
      1 + Math.sin(this.scene.time.now * 0.018) * 0.08
    const instability =
      this.possessionOvercharged
        ? Math.sin(this.scene.time.now * 0.055) * 2
        : 0
    const radius =
      coreConfig.radius *
      Phaser.Math.Linear(1.35, 1.9, this.possessionCharge) *
      pulse
    const color = this.possessionOvercharged
      ? 0xff846f
      : 0xffdc70

    this.chargeAccent.lineStyle(
      2 + this.possessionCharge * 2,
      color,
      0.42 + this.possessionCharge * 0.45,
    )
    this.chargeAccent.strokeCircle(
      position.x + instability,
      position.y - instability,
      radius,
    )
    this.chargeAccent.fillStyle(color, 0.75)

    for (let index = 0; index < 3; index += 1) {
      const angle =
        this.scene.time.now * 0.006 +
        (Math.PI * 2 * index) / 3
      this.chargeAccent.fillCircle(
        position.x + Math.cos(angle) * radius,
        position.y + Math.sin(angle) * radius,
        2 + this.possessionCharge,
      )
    }
  }
}
