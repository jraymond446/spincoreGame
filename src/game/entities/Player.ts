import Phaser from 'phaser'
import { playerRuntimeConfig } from '../config/playerConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'
import type {
  AIState,
  PlayerAttributes,
  PlayerControllerType,
  PlayerDefenseTendencies,
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
  ResolvedPlayerRosterEntry,
  StickActionState,
  StickStyle,
  TeamSide,
} from '../data/matchTypes'
import type { PlayerArchetype } from '../data/matchTypes'
import { createPlayerVisualProfile } from '../data/playerVisualProfiles'
import type { DefensiveVisualState } from '../rendering/AnimationState'
import { PlayerVisual } from '../rendering/PlayerVisual'
import {
  getHandednessFrame,
  type HandednessSign,
} from '../rules/Handedness'

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
  readonly handedness: PlayerHandedness
  readonly playStyle: PlayerPlayStyle
  readonly stickStyle: StickStyle
  readonly attributes: PlayerAttributes
  readonly defenseTendencies: PlayerDefenseTendencies
  readonly body: MatterJS.BodyType

  private scene: Phaser.Scene
  private spawn: Point
  private visual: PlayerVisual
  private releaseAimAngle = 0
  private bodyFacingAngle = 0
  private stickVisualRotation = 0
  private carrySocket: Point | null = null
  private chargeVisual = {
    normalized: 0,
    hardCharge: false,
    overcharged: false,
  }
  private aiState: AIState = 'IDLE'
  private stickState: StickActionState = 'IDLE'
  private defenseVisualState: DefensiveVisualState = 'IDLE'

  constructor(
    scene: Phaser.Scene,
    rosterEntry: ResolvedPlayerRosterEntry,
    archetype: PlayerArchetype,
    defenseTendencies: PlayerDefenseTendencies,
  ) {
    this.scene = scene
    this.id = rosterEntry.id
    this.teamId = rosterEntry.teamId
    this.teamSide = rosterEntry.teamSide
    this.role = rosterEntry.role
    this.controllerType = rosterEntry.controllerType
    this.handedness = rosterEntry.handedness
    this.playStyle = rosterEntry.playStyle
    this.stickStyle = rosterEntry.stickStyle
    this.attributes = archetype.attributes
    this.defenseTendencies = defenseTendencies
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
      handedness: this.handedness,
      playStyle: this.playStyle,
      controllerType: this.controllerType,
      teamSide: this.teamSide,
      profile: createPlayerVisualProfile(
        this.id,
        this.role,
        rosterEntry.stickStyle,
      ),
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
    if (moveVector.lengthSq() > 0.02) {
      const movementAngle = Math.atan2(moveVector.y, moveVector.x)
      const turn = Phaser.Math.Clamp(
        Phaser.Math.Angle.Wrap(movementAngle - this.bodyFacingAngle),
        -0.16,
        0.16,
      )

      this.bodyFacingAngle = Phaser.Math.Angle.Wrap(
        this.bodyFacingAngle + turn,
      )
    }
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

  reset(spawn?: Point): void {
    if (spawn) {
      this.spawn = { ...spawn }
    }

    this.scene.matter.body.setPosition(this.body, this.spawn)
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 })
    this.scene.matter.body.setAngularVelocity(this.body, 0)
    this.releaseAimAngle = this.teamSide === 'A' ? -Math.PI / 2 : Math.PI / 2
    this.bodyFacingAngle = this.releaseAimAngle
    this.stickVisualRotation = this.releaseAimAngle
    this.carrySocket = null
    this.chargeVisual = {
      normalized: 0,
      hardCharge: false,
      overcharged: false,
    }
    this.aiState = 'IDLE'
    this.stickState = 'IDLE'
    this.defenseVisualState = 'IDLE'
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

  setDefenseVisualState(state: DefensiveVisualState): void {
    if (this.defenseVisualState === state) {
      return
    }

    this.defenseVisualState = state
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

  getBodyFacingAngle(): number {
    return this.bodyFacingAngle
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

  getHandednessMountSign(): HandednessSign {
    return getHandednessFrame(this.handedness).mountSign
  }

  getPocketFacingSign(): HandednessSign {
    return getHandednessFrame(this.handedness).pocketFacingSign
  }

  getVisualMirrorSign(): HandednessSign {
    return getHandednessFrame(this.handedness).visualMirrorSign
  }

  getCradleSocketSign(): HandednessSign {
    return getHandednessFrame(this.handedness).cradleSocketSign
  }

  getHandednessMountScale(): number {
    return (
      this.getHandednessMountSign() *
      stickConfig.handednessMirrorMultiplier
    )
  }

  getPocketFacingScale(): number {
    return (
      this.getPocketFacingSign() *
      stickConfig.handednessMirrorMultiplier
    )
  }

  getCradleSideDirection(): Point {
    const right = this.getStickRight()
    const pocketFacingSign = this.getPocketFacingSign()

    return {
      x: right.x * pocketFacingSign,
      y: right.y * pocketFacingSign,
    }
  }

  getHandednessMountDirection(): Point {
    const right = this.getStickRight()
    const mountSign = this.getHandednessMountSign()

    return {
      x: right.x * mountSign,
      y: right.y * mountSign,
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
    const pocketFacingScale = this.getPocketFacingScale()
    const configuredOffset =
      this.handedness === 'right'
        ? stickConfig.rightHandedStickOffset
        : stickConfig.leftHandedStickOffset
    const sideOffset =
      this.getPocketFacingSign() * Math.abs(configuredOffset)
    const curveOffset = stickConfig.visual.curve * pocketFacingScale

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
          right.x * (curveOffset + sideOffset),
        y:
          position.y +
          forward.y * controlDistance +
          right.y * (curveOffset + sideOffset),
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

  getBaseCradleSocket(): Point {
    return this.stickLocalToWorld({
      x: stickConfig.cradleSocketOffset.forward,
      y:
        stickConfig.cradleSocketOffset.side *
        this.getHandednessMountScale(),
    })
  }

  getCradleSocket(): Point {
    return this.carrySocket
      ? { ...this.carrySocket }
      : this.getBaseCradleSocket()
  }

  setCarrySocket(socket: Point | null): void {
    this.carrySocket = socket ? { ...socket } : null
    this.syncVisuals()
  }

  setChargeVisual(
    normalized: number,
    hardCharge: boolean,
    overcharged: boolean,
  ): void {
    const next = {
      normalized: Phaser.Math.Clamp(normalized, 0, 1),
      hardCharge,
      overcharged,
    }

    if (
      this.chargeVisual.normalized === next.normalized &&
      this.chargeVisual.hardCharge === next.hardCharge &&
      this.chargeVisual.overcharged === next.overcharged
    ) {
      return
    }

    this.chargeVisual = next
    this.syncVisuals()
  }

  getCradleZone(): CradleZone {
    const pocketFacingSign = this.getPocketFacingSign()
    const minimum = Phaser.Math.DegToRad(stickConfig.cradleMinAngle)
    const maximum = Phaser.Math.DegToRad(stickConfig.cradleMaxAngle)

    return {
      center: this.position,
      minRadius: stickConfig.cradleMinRadius,
      maxRadius: stickConfig.cradleMaxRadius,
      minAngle: pocketFacingSign > 0 ? minimum : -maximum,
      maxAngle: pocketFacingSign > 0 ? maximum : -minimum,
      aimAngle: this.stickVisualRotation,
    }
  }

  getVisualStickMountPoint(): Point {
    const configuredOffset =
      this.handedness === 'right'
        ? stickConfig.rightHandedStickOffset
        : stickConfig.leftHandedStickOffset

    return this.stickLocalToWorld({
      x: playerRuntimeConfig.radius - stickConfig.visual.rootOffset,
      y:
        this.getHandednessMountSign() *
        Math.abs(configuredOffset) *
        stickConfig.handednessMirrorMultiplier,
    })
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
      facingRotation: this.bodyFacingAngle,
      stickMountPoint: this.getVisualStickMountPoint(),
      stickForward: this.getStickForward(),
      stickSide: this.getCradleSideDirection(),
      handednessMountSign: this.getHandednessMountSign(),
      pocketFacingSign: this.getPocketFacingSign(),
      visualMirrorSign: this.getVisualMirrorSign(),
      cradleSocketSign: this.getCradleSocketSign(),
      cradleSocket: this.getCradleSocket(),
      chargeVisual: this.chargeVisual,
      stickState: this.stickState,
      defenseState: this.defenseVisualState,
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
