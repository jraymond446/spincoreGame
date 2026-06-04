import Phaser from 'phaser'
import { playerConfig } from '../config/entityConfig'
import type { Point } from '../data/geometry'

export class Player {
  readonly body: MatterJS.BodyType

  private scene: Phaser.Scene
  private base: Phaser.GameObjects.Arc
  private facing: Phaser.GameObjects.Graphics
  private stick: Phaser.GameObjects.Graphics
  private aimAngle = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.body = scene.matter.add.circle(
      playerConfig.spawn.x,
      playerConfig.spawn.y,
      playerConfig.radius,
      {
        label: 'player',
        restitution: playerConfig.restitution,
        frictionAir: playerConfig.frictionAir,
      },
    )

    this.scene.matter.body.setInertia(this.body, Infinity)

    this.stick = scene.add.graphics()
    this.base = scene.add.circle(
      playerConfig.spawn.x,
      playerConfig.spawn.y,
      playerConfig.radius,
      playerConfig.fillColor,
      1,
    )
    this.facing = scene.add.graphics()
    this.base.setStrokeStyle(3, playerConfig.strokeColor, 1)
  }

  get position(): Point {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
    }
  }

  update(moveVector: Phaser.Math.Vector2, aimAngle: number): void {
    this.aimAngle = aimAngle

    this.scene.matter.body.setVelocity(this.body, {
      x: moveVector.x * playerConfig.maxSpeed,
      y: moveVector.y * playerConfig.maxSpeed,
    })

    this.syncVisuals()
  }

  getStickSamplePoints(): Point[] {
    const points: Point[] = []
    const curve = this.getStickCurve()

    for (let index = 0; index <= playerConfig.stick.sampleCount; index += 1) {
      const t = index / playerConfig.stick.sampleCount
      points.push(quadraticPoint(curve.root, curve.control, curve.tip, t))
    }

    return points
  }

  getStickForward(): Point {
    return {
      x: Math.cos(this.aimAngle),
      y: Math.sin(this.aimAngle),
    }
  }

  private syncVisuals(): void {
    const position = this.position
    const forward = this.getStickForward()

    this.base.setPosition(position.x, position.y)

    this.facing.clear()
    this.facing.lineStyle(3, playerConfig.aimColor, 0.95)
    this.facing.lineBetween(
      position.x,
      position.y,
      position.x + forward.x * playerConfig.radius,
      position.y + forward.y * playerConfig.radius,
    )

    this.drawStick()
  }

  private drawStick(): void {
    const curve = this.getStickCurve()

    this.stick.clear()
    this.stick.lineStyle(
      playerConfig.stick.width + 5,
      playerConfig.stick.shadowColor,
      0.5,
    )
    this.stick.beginPath()
    this.drawStickPath(curve, 24)

    this.stick.lineStyle(playerConfig.stick.width, playerConfig.stick.color, 0.98)
    this.stick.beginPath()
    this.drawStickPath(curve, 24)
  }

  private drawStickPath(curve: { root: Point; control: Point; tip: Point }, pointsTotal: number): void {
    const path = new Phaser.Curves.Path(curve.root.x, curve.root.y)

    path.quadraticBezierTo(curve.tip.x, curve.tip.y, curve.control.x, curve.control.y)
    path.draw(this.stick, pointsTotal)
  }

  private getStickCurve(): { root: Point; control: Point; tip: Point } {
    const position = this.position
    const forward = this.getStickForward()
    const right = {
      x: -forward.y,
      y: forward.x,
    }
    const rootDistance = playerConfig.radius - playerConfig.stick.rootOffset
    const tipDistance = playerConfig.radius + playerConfig.stick.length
    const controlDistance = playerConfig.radius + playerConfig.stick.length * 0.5

    return {
      root: {
        x: position.x + forward.x * rootDistance,
        y: position.y + forward.y * rootDistance,
      },
      control: {
        x: position.x + forward.x * controlDistance + right.x * playerConfig.stick.curve,
        y: position.y + forward.y * controlDistance + right.y * playerConfig.stick.curve,
      },
      tip: {
        x: position.x + forward.x * tipDistance,
        y: position.y + forward.y * tipDistance,
      },
    }
  }
}

function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const inverse = 1 - t

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  }
}
