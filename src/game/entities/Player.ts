import Phaser from 'phaser'
import { playerRuntimeConfig } from '../config/playerConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'
import type {
  AIState,
  PlayerAttributes,
  PlayerControllerType,
  PlayerRole,
  PlayerRosterEntry,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { PlayerArchetype } from '../data/matchTypes'
import { createPlayerVisualProfile } from '../data/playerVisualProfiles'
import { PlayerVisual } from '../rendering/PlayerVisual'

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
  private visual: PlayerVisual
  private releaseAimAngle = 0
  private stickVisualRotation = 0
  private aiState: AIState = 'IDLE'
  private stickState: StickActionState = 'IDLE'

  constructor(
    scene: Phaser.Scene,
    rosterEntry: PlayerRosterEntry,
    archetype: PlayerArchetype,
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

    this.visual = new PlayerVisual(scene, {
      id: this.id,
      role: this.role,
      controllerType: this.controllerType,
      teamSide: this.teamSide,
      profile: createPlayerVisualProfile(this.id, this.role),
    })
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
    this.releaseAimAngle = aimAngle
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
    this.releaseAimAngle = this.teamSide === 'A' ? -Math.PI / 2 : Math.PI / 2
    this.stickVisualRotation = this.releaseAimAngle
    this.aiState = 'IDLE'
    this.stickState = 'IDLE'
    this.syncVisuals()
  }

  setControlled(isControlled: boolean): void {
    this.visual.setControlled(isControlled)
    this.syncVisuals()
  }

  setDebugVisible(isVisible: boolean): void {
    this.visual.setDebugVisible(isVisible)
  }

  setAIState(state: AIState): void {
    this.aiState = state
    this.visual.setAIState(state)
  }

  setStickState(state: StickActionState): void {
    if (this.stickState === state) {
      return
    }

    this.stickState = state
    this.syncVisuals()
  }

  getAIState(): AIState {
    return this.aiState
  }

  getAimAngle(): number {
    return this.releaseAimAngle
  }

  getReleaseAimAngle(): number {
    return this.releaseAimAngle
  }

  getStickVisualRotation(): number {
    return this.stickVisualRotation
  }

  setStickVisualRotation(rotation: number): void {
    this.stickVisualRotation = Phaser.Math.Angle.Wrap(rotation)
    this.syncVisuals()
  }

  getReleaseAimForward(): Point {
    return {
      x: Math.cos(this.releaseAimAngle),
      y: Math.sin(this.releaseAimAngle),
    }
  }

  getStickForward(): Point {
    return {
      x: Math.cos(this.stickVisualRotation),
      y: Math.sin(this.stickVisualRotation),
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
    const rootDistance = playerRuntimeConfig.radius - stickConfig.visual.rootOffset
    const tipDistance = playerRuntimeConfig.radius + stickConfig.visual.length
    const controlDistance =
      playerRuntimeConfig.radius + stickConfig.visual.length * 0.5
    const sideOffset = stickConfig.visual.stanceSideOffset

    return {
      root: {
        x:
          position.x +
          forward.x * rootDistance +
          right.x * sideOffset,
        y:
          position.y +
          forward.y * rootDistance +
          right.y * sideOffset,
      },
      control: {
        x:
          position.x +
          forward.x * controlDistance +
          right.x * (stickConfig.visual.curve + sideOffset),
        y:
          position.y +
          forward.y * controlDistance +
          right.y * (stickConfig.visual.curve + sideOffset),
      },
      tip: {
        x:
          position.x +
          forward.x * tipDistance +
          right.x * sideOffset,
        y:
          position.y +
          forward.y * tipDistance +
          right.y * sideOffset,
      },
    }
  }

  getStickSamplePoints(): Point[] {
    const points: Point[] = []
    const curve = this.getStickCurve()

    for (
      let index = 0;
      index <= stickConfig.visual.sampleCount;
      index += 1
    ) {
      const t = index / stickConfig.visual.sampleCount
      points.push(quadraticPoint(curve.root, curve.control, curve.tip, t))
    }

    return points
  }

  getCradleSocket(): Point {
    return this.stickLocalToWorld({
      x: stickConfig.cradleSocketOffset.forward,
      y: stickConfig.cradleSocketOffset.side,
    })
  }

  getCradleZone(): CradleZone {
    return {
      center: this.position,
      minRadius: stickConfig.cradleMinRadius,
      maxRadius: stickConfig.cradleMaxRadius,
      minAngle: Phaser.Math.DegToRad(stickConfig.cradleMinAngle),
      maxAngle: Phaser.Math.DegToRad(stickConfig.cradleMaxAngle),
      aimAngle: this.stickVisualRotation,
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
    this.visual.update({
      position: this.position,
      velocity: this.velocity,
      facingRotation: this.releaseAimAngle,
      stickCurve: this.getStickCurve(),
      stickForward: this.getStickForward(),
      stickRight: this.getStickRight(),
      cradleSocket: this.getCradleSocket(),
      stickState: this.stickState,
    })
  }
}

function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const inverse = 1 - t

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  }
}
