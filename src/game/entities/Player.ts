import Phaser from 'phaser'
import { stickInteractionConfig } from '../config/entityConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import type { Point } from '../data/geometry'
import type {
  AIState,
  PlayerAttributes,
  PlayerControllerType,
  PlayerRole,
  PlayerRosterEntry,
  TeamSide,
} from '../data/matchTypes'
import type { PlayerArchetype } from '../data/matchTypes'

export type StickCurve = {
  root: Point
  control: Point
  tip: Point
}

export type CradleZone = {
  center: Point
  minRadius: number
  maxRadius: number
  minAngle: number
  maxAngle: number
  aimAngle: number
}

export class Player {
  readonly id: string
  readonly teamId: string
  readonly teamSide: TeamSide
  readonly role: PlayerRole
  readonly controllerType: PlayerControllerType
  readonly attributes: PlayerAttributes
  readonly body: MatterJS.BodyType

  private scene: Phaser.Scene
  private spawn: Point
  private base: Phaser.GameObjects.Arc
  private facing: Phaser.GameObjects.Graphics
  private stick: Phaser.GameObjects.Graphics
  private controlledIndicator: Phaser.GameObjects.Arc
  private roleLabel: Phaser.GameObjects.Text
  private aiStateLabel: Phaser.GameObjects.Text
  private aimAngle = 0
  private aiState: AIState = 'IDLE'

  constructor(
    scene: Phaser.Scene,
    rosterEntry: PlayerRosterEntry,
    archetype: PlayerArchetype,
    teamColor: number,
    accentColor: number,
  ) {
    this.scene = scene
    this.id = rosterEntry.id
    this.teamId = rosterEntry.teamId
    this.teamSide = rosterEntry.teamSide
    this.role = rosterEntry.role
    this.controllerType = rosterEntry.controllerType
    this.attributes = archetype.attributes
    this.spawn = { ...rosterEntry.spawn }
    this.body = scene.matter.add.circle(
      rosterEntry.spawn.x,
      rosterEntry.spawn.y,
      playerRuntimeConfig.radius,
      {
        label: `player:${this.id}`,
        restitution: playerRuntimeConfig.restitution,
        frictionAir: playerRuntimeConfig.frictionAir,
      },
    )

    this.scene.matter.body.setInertia(this.body, Infinity)

    this.stick = scene.add.graphics()
    this.base = scene.add.circle(
      rosterEntry.spawn.x,
      rosterEntry.spawn.y,
      playerRuntimeConfig.radius,
      teamColor,
      1,
    )
    this.base.setStrokeStyle(4, accentColor, 1)
    this.facing = scene.add.graphics()
    this.controlledIndicator = scene.add.circle(
      rosterEntry.spawn.x,
      rosterEntry.spawn.y,
      playerRuntimeConfig.controlledIndicatorRadius,
    )
    this.controlledIndicator.setStrokeStyle(4, 0xffffff, 0.95)
    this.controlledIndicator.setVisible(false)
    this.roleLabel = scene.add.text(0, 0, roleLabel(this.role), {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: '800',
      color: '#ffffff',
      align: 'center',
    })
    this.roleLabel.setOrigin(0.5)
    this.aiStateLabel = scene.add.text(0, 0, '', {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: '700',
      color: '#c9f9ff',
      align: 'center',
    })
    this.aiStateLabel.setOrigin(0.5)
    this.aiStateLabel.setVisible(false)
    this.syncVisuals()
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

  update(moveVector: Phaser.Math.Vector2, aimAngle: number): void {
    this.aimAngle = aimAngle
    const maxSpeed = playerRuntimeConfig.baseMaxSpeed * this.attributes.speed

    this.scene.matter.body.setVelocity(this.body, {
      x: moveVector.x * maxSpeed,
      y: moveVector.y * maxSpeed,
    })
    this.syncVisuals()
  }

  updateVisuals(): void {
    this.syncVisuals()
  }

  reset(): void {
    this.scene.matter.body.setPosition(this.body, this.spawn)
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 })
    this.scene.matter.body.setAngularVelocity(this.body, 0)
    this.aimAngle = this.teamSide === 'A' ? -Math.PI / 2 : Math.PI / 2
    this.aiState = 'IDLE'
    this.syncVisuals()
  }

  setControlled(isControlled: boolean): void {
    this.controlledIndicator.setVisible(isControlled)
  }

  setDebugVisible(isVisible: boolean): void {
    this.aiStateLabel.setVisible(isVisible && this.controllerType === 'ai')
  }

  setAIState(state: AIState): void {
    this.aiState = state
    this.aiStateLabel.setText(state)
  }

  getAIState(): AIState {
    return this.aiState
  }

  getAimAngle(): number {
    return this.aimAngle
  }

  getStickForward(): Point {
    return {
      x: Math.cos(this.aimAngle),
      y: Math.sin(this.aimAngle),
    }
  }

  getStickRight(): Point {
    const forward = this.getStickForward()

    return {
      x: -forward.y,
      y: forward.x,
    }
  }

  getStickCurve(): StickCurve {
    const position = this.position
    const forward = this.getStickForward()
    const right = this.getStickRight()
    const rootDistance = playerRuntimeConfig.radius - stickInteractionConfig.visual.rootOffset
    const tipDistance = playerRuntimeConfig.radius + stickInteractionConfig.visual.length
    const controlDistance =
      playerRuntimeConfig.radius + stickInteractionConfig.visual.length * 0.5

    return {
      root: {
        x: position.x + forward.x * rootDistance,
        y: position.y + forward.y * rootDistance,
      },
      control: {
        x:
          position.x +
          forward.x * controlDistance +
          right.x * stickInteractionConfig.visual.curve,
        y:
          position.y +
          forward.y * controlDistance +
          right.y * stickInteractionConfig.visual.curve,
      },
      tip: {
        x: position.x + forward.x * tipDistance,
        y: position.y + forward.y * tipDistance,
      },
    }
  }

  getStickSamplePoints(): Point[] {
    const points: Point[] = []
    const curve = this.getStickCurve()

    for (
      let index = 0;
      index <= stickInteractionConfig.visual.sampleCount;
      index += 1
    ) {
      const t = index / stickInteractionConfig.visual.sampleCount
      points.push(quadraticPoint(curve.root, curve.control, curve.tip, t))
    }

    return points
  }

  getCradleSocket(): Point {
    return this.stickLocalToWorld({
      x: stickInteractionConfig.cradle.cradleSocketOffset.forward,
      y: stickInteractionConfig.cradle.cradleSocketOffset.side,
    })
  }

  getCradleZone(): CradleZone {
    return {
      center: this.position,
      minRadius: stickInteractionConfig.cradle.cradleMinRadius,
      maxRadius: stickInteractionConfig.cradle.cradleMaxRadius,
      minAngle: Phaser.Math.DegToRad(stickInteractionConfig.cradle.cradleMinAngle),
      maxAngle: Phaser.Math.DegToRad(stickInteractionConfig.cradle.cradleMaxAngle),
      aimAngle: this.aimAngle,
    }
  }

  worldToStickLocal(point: Point): Point {
    const position = this.position
    const forward = this.getStickForward()
    const right = this.getStickRight()
    const dx = point.x - position.x
    const dy = point.y - position.y

    return {
      x: dx * forward.x + dy * forward.y,
      y: dx * right.x + dy * right.y,
    }
  }

  stickLocalToWorld(point: Point): Point {
    const position = this.position
    const forward = this.getStickForward()
    const right = this.getStickRight()

    return {
      x: position.x + forward.x * point.x + right.x * point.y,
      y: position.y + forward.y * point.x + right.y * point.y,
    }
  }

  private syncVisuals(): void {
    const position = this.position
    const forward = this.getStickForward()

    this.base.setPosition(position.x, position.y)
    this.controlledIndicator.setPosition(position.x, position.y)
    this.roleLabel.setPosition(
      position.x,
      position.y - playerRuntimeConfig.roleLabelOffsetY,
    )
    this.aiStateLabel.setPosition(
      position.x,
      position.y - playerRuntimeConfig.aiStateLabelOffsetY,
    )

    this.facing.clear()
    this.facing.lineStyle(3, 0xffffff, 0.85)
    this.facing.lineBetween(
      position.x,
      position.y,
      position.x + forward.x * playerRuntimeConfig.radius,
      position.y + forward.y * playerRuntimeConfig.radius,
    )

    this.drawStick()
  }

  private drawStick(): void {
    const curve = this.getStickCurve()

    this.stick.clear()
    this.stick.lineStyle(
      stickInteractionConfig.visual.width + 5,
      stickInteractionConfig.visual.shadowColor,
      0.5,
    )
    this.drawStickPath(curve, 24)
    this.stick.lineStyle(
      stickInteractionConfig.visual.width,
      stickInteractionConfig.visual.color,
      0.98,
    )
    this.drawStickPath(curve, 24)
  }

  private drawStickPath(curve: StickCurve, pointsTotal: number): void {
    const path = new Phaser.Curves.Path(curve.root.x, curve.root.y)

    path.quadraticBezierTo(curve.tip.x, curve.tip.y, curve.control.x, curve.control.y)
    path.draw(this.stick, pointsTotal)
  }
}

function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const inverse = 1 - t

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  }
}

function roleLabel(role: PlayerRole): string {
  if (role === 'keeper') {
    return 'K'
  }

  if (role === 'striker') {
    return 'S'
  }

  if (role === 'support') {
    return 'Sup'
  }

  return 'B'
}
