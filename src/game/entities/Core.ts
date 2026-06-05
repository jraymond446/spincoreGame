import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import type { Point } from '../data/geometry'

export class Core {
  readonly body: MatterJS.BodyType

  private scene: Phaser.Scene
  private glow: Phaser.GameObjects.Arc
  private shell: Phaser.GameObjects.Arc
  private trail: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.body = scene.matter.add.circle(coreConfig.spawn.x, coreConfig.spawn.y, coreConfig.radius, {
      label: 'core',
      restitution: coreConfig.restitution,
      friction: coreConfig.friction,
      frictionAir: coreConfig.frictionAir,
      density: coreConfig.density,
    })

    this.trail = scene.add.graphics()
    this.glow = scene.add.circle(
      coreConfig.spawn.x,
      coreConfig.spawn.y,
      coreConfig.radius * 2.15,
      coreConfig.glowColor,
      0.16,
    )
    this.shell = scene.add.circle(
      coreConfig.spawn.x,
      coreConfig.spawn.y,
      coreConfig.radius,
      coreConfig.fillColor,
      1,
    )

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
    const trailAlpha = Phaser.Math.Clamp(speed / 10, 0, 0.55)

    this.trail.clear()
    this.trail.lineStyle(5, coreConfig.trailColor, trailAlpha)
    this.trail.lineBetween(
      position.x - velocity.x * 5,
      position.y - velocity.y * 5,
      position.x,
      position.y,
    )

    this.glow.setPosition(position.x, position.y)
    this.shell.setPosition(position.x, position.y)
  }

  reset(): void {
    this.setSensor(false)
    this.setPosition({
      x: coreConfig.spawn.x,
      y: coreConfig.spawn.y,
    })
    this.setVelocity({ x: 0, y: 0 })
    this.update()
  }

  holdAt(position: Point): void {
    this.setPosition(position)
    this.setVelocity({ x: 0, y: 0 })
  }

  setPosition(position: Point): void {
    this.scene.matter.body.setPosition(this.body, position)
  }

  setVelocity(velocity: Point): void {
    this.scene.matter.body.setVelocity(this.body, velocity)
    this.scene.matter.body.setAngularVelocity(this.body, 0)
  }

  setSensor(isSensor: boolean): void {
    this.scene.matter.body.set(this.body, 'isSensor', isSensor)
  }

  applyForce(force: Point): void {
    this.scene.matter.body.applyForce(this.body, this.body.position, force)
  }
}
