import Phaser from 'phaser'
import { aiConfig } from '../config/aiConfig'
import { stickInteractionConfig } from '../config/entityConfig'
import type { Point } from '../data/geometry'
import type { Core } from '../entities/Core'
import type { CradleZone, Player } from '../entities/Player'

export type CorePossessionState =
  | 'FREE'
  | 'CRADLED_STABLE'
  | 'CRADLED_CHARGING'
  | 'CRADLED_OVERCHARGED'
  | 'FUMBLED'
  | 'RELEASED_COOLDOWN'

export type StickIntent = {
  hold: boolean
  releaseTarget?: Point
}

type CradleTestResult = {
  accepted: boolean
  relativeSpeed: number
}

type DeflectHit = {
  closestPoint: Point
  normal: Point
}

type ReleaseVector = {
  start: Point
  end: Point
  msRemaining: number
}

export class StickInteractionSystem {
  private state: CorePossessionState = 'FREE'
  private carrierId: string | null = null
  private cradleElapsedMs = 0
  private releaseCooldownMsRemaining = 0
  private deflectCooldowns = new Map<string, number>()
  private previousHold = new Map<string, boolean>()
  private debugEnabled = false
  private debugFocusPlayerId: string | null = null
  private debugGraphics: Phaser.GameObjects.Graphics
  private debugText: Phaser.GameObjects.Text
  private releaseVector: ReleaseVector | null = null

  constructor(scene: Phaser.Scene) {
    this.debugGraphics = scene.add.graphics()
    this.debugGraphics.setDepth(20)
    this.debugText = scene.add.text(
      stickInteractionConfig.debug.textX,
      stickInteractionConfig.debug.textY,
      '',
      {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: stickInteractionConfig.debug.textColor,
      },
    )
    this.debugText.setDepth(21)
    this.debugText.setVisible(false)
  }

  update(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
    preferredPlayerId: string,
    deltaMs: number,
  ): void {
    this.debugFocusPlayerId = this.carrierId ?? preferredPlayerId
    this.updateTimers(deltaMs)

    if (this.isCradled()) {
      this.updateCarrier(core, players, intents, deltaMs)
    } else {
      this.tryAcquire(core, players, intents, preferredPlayerId)

      if (!this.isCradled()) {
        this.processDeflections(core, players, intents)
      }
    }

    for (const player of players) {
      this.previousHold.set(player.id, intents.get(player.id)?.hold ?? false)
    }

    this.drawDebug(core, players)
  }

  getCarrierId(): string | null {
    return this.carrierId
  }

  getState(): CorePossessionState {
    return this.state
  }

  getCradleElapsedMs(): number {
    return this.cradleElapsedMs
  }

  forceFumble(core: Core, players: Player[], targetPlayerId: string): boolean {
    if (this.carrierId !== targetPlayerId || !this.isCradled()) {
      return false
    }

    const carrier = players.find((player) => player.id === targetPlayerId)

    if (!carrier) {
      return false
    }

    this.fumble(core, carrier)
    return true
  }

  toggleDebug(): boolean {
    this.debugEnabled = !this.debugEnabled

    if (!this.debugEnabled) {
      this.debugGraphics.clear()
      this.debugText.setVisible(false)
    }

    return this.debugEnabled
  }

  clearForReset(core: Core): void {
    this.state = 'FREE'
    this.carrierId = null
    this.cradleElapsedMs = 0
    this.releaseCooldownMsRemaining = 0
    this.deflectCooldowns.clear()
    this.previousHold.clear()
    this.releaseVector = null
    core.setSensor(false)
  }

  private updateTimers(deltaMs: number): void {
    this.releaseCooldownMsRemaining = Math.max(0, this.releaseCooldownMsRemaining - deltaMs)

    for (const [playerId, cooldown] of this.deflectCooldowns) {
      this.deflectCooldowns.set(playerId, Math.max(0, cooldown - deltaMs))
    }

    if (this.releaseVector) {
      this.releaseVector.msRemaining -= deltaMs

      if (this.releaseVector.msRemaining <= 0) {
        this.releaseVector = null
      }
    }

    if (
      (this.state === 'FUMBLED' || this.state === 'RELEASED_COOLDOWN') &&
      this.releaseCooldownMsRemaining === 0
    ) {
      this.state = 'FREE'
    }
  }

  private updateCarrier(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
    deltaMs: number,
  ): void {
    const carrier = players.find((player) => player.id === this.carrierId)

    if (!carrier) {
      this.clearForReset(core)
      return
    }

    const intent = intents.get(carrier.id) ?? { hold: false }
    const pointerReleased = (this.previousHold.get(carrier.id) ?? false) && !intent.hold

    this.cradleElapsedMs += deltaMs
    core.holdAt(carrier.getCradleSocket())
    this.syncCradleState()

    if (this.cradleElapsedMs >= stickInteractionConfig.chargeTiming.fumbleMs) {
      this.fumble(core, carrier)
      return
    }

    if (intent.releaseTarget && this.cradleElapsedMs >= aiConfig.aiReleaseDelayMs) {
      this.releaseToward(core, carrier, intent.releaseTarget)
      return
    }

    if (pointerReleased) {
      this.releaseAlongAim(core, carrier)
    }
  }

  private tryAcquire(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
    preferredPlayerId: string,
  ): void {
    if (this.releaseCooldownMsRemaining > 0 || this.state !== 'FREE') {
      return
    }

    const candidates = players
      .filter((player) => intents.get(player.id)?.hold)
      .map((player) => ({
        player,
        test: testLegalCradle(core, player),
        socketDistance: distance(core.position, player.getCradleSocket()),
      }))
      .filter((candidate) => candidate.test.accepted)
      .sort((a, b) => {
        if (a.player.id === preferredPlayerId) {
          return -1
        }

        if (b.player.id === preferredPlayerId) {
          return 1
        }

        return a.socketDistance - b.socketDistance
      })

    const selected = candidates[0]

    if (!selected) {
      return
    }

    this.carrierId = selected.player.id
    this.state = 'CRADLED_STABLE'
    this.cradleElapsedMs = 0
    core.setSensor(true)
    core.setVelocity({ x: 0, y: 0 })
    core.holdAt(selected.player.getCradleSocket())
  }

  private processDeflections(
    core: Core,
    players: Player[],
    intents: Map<string, StickIntent>,
  ): void {
    for (const player of players) {
      if ((this.deflectCooldowns.get(player.id) ?? 0) > 0) {
        continue
      }

      const hit = testDeflectZone(core, player)

      if (!hit) {
        continue
      }

      this.deflect(core, player, hit, intents.get(player.id)?.hold ?? false)
      this.deflectCooldowns.set(player.id, stickInteractionConfig.deflect.deflectCooldownMs)
      break
    }
  }

  private syncCradleState(): void {
    if (this.cradleElapsedMs >= stickInteractionConfig.chargeTiming.chargeCradleMs) {
      this.state = 'CRADLED_OVERCHARGED'
      return
    }

    if (this.cradleElapsedMs >= stickInteractionConfig.chargeTiming.stableCradleMs) {
      this.state = 'CRADLED_CHARGING'
      return
    }

    this.state = 'CRADLED_STABLE'
  }

  private releaseAlongAim(core: Core, carrier: Player): void {
    const aim = carrier.getStickForward()
    const releaseSpeed = this.releaseSpeed()

    this.finishPossession(core, carrier, {
      x:
        aim.x * releaseSpeed +
        carrier.velocity.x * stickInteractionConfig.release.playerVelocityReleaseInfluence,
      y:
        aim.y * releaseSpeed +
        carrier.velocity.y * stickInteractionConfig.release.playerVelocityReleaseInfluence,
    }, 'RELEASED_COOLDOWN')
  }

  private releaseToward(core: Core, carrier: Player, target: Point): void {
    const direction = normalized({
      x: target.x - carrier.position.x,
      y: target.y - carrier.position.y,
    })
    const releaseSpeed = this.releaseSpeed()

    this.finishPossession(core, carrier, {
      x:
        direction.x * releaseSpeed +
        carrier.velocity.x * stickInteractionConfig.release.playerVelocityReleaseInfluence,
      y:
        direction.y * releaseSpeed +
        carrier.velocity.y * stickInteractionConfig.release.playerVelocityReleaseInfluence,
    }, 'RELEASED_COOLDOWN')
  }

  private fumble(core: Core, carrier: Player): void {
    const aim = carrier.getStickForward()
    const right = carrier.getStickRight()
    const velocity = {
      x:
        aim.x * stickInteractionConfig.release.fumbleSpeed +
        right.x * stickInteractionConfig.release.fumbleSpeed * 0.55,
      y:
        aim.y * stickInteractionConfig.release.fumbleSpeed +
        right.y * stickInteractionConfig.release.fumbleSpeed * 0.55,
    }

    this.finishPossession(core, carrier, velocity, 'FUMBLED')
  }

  private finishPossession(
    core: Core,
    carrier: Player,
    velocity: Point,
    nextState: 'FUMBLED' | 'RELEASED_COOLDOWN',
  ): void {
    const releasePoint = carrier.getCradleSocket()

    core.setSensor(false)
    core.setPosition(releasePoint)
    core.setVelocity(velocity)
    this.state = nextState
    this.carrierId = null
    this.cradleElapsedMs = 0
    this.releaseCooldownMsRemaining = stickInteractionConfig.cradle.releaseCooldownMs
    this.releaseVector = {
      start: { ...releasePoint },
      end: {
        x: releasePoint.x + velocity.x * stickInteractionConfig.release.vectorScale,
        y: releasePoint.y + velocity.y * stickInteractionConfig.release.vectorScale,
      },
      msRemaining: stickInteractionConfig.release.vectorVisibleSeconds * 1000,
    }
  }

  private releaseSpeed(): number {
    const chargeRatio = Phaser.Math.Clamp(
      this.cradleElapsedMs / stickInteractionConfig.chargeTiming.overchargeMs,
      0,
      1,
    )

    return Phaser.Math.Linear(
      stickInteractionConfig.release.releaseForceMin,
      stickInteractionConfig.release.releaseForceMax,
      chargeRatio,
    )
  }

  private deflect(
    core: Core,
    player: Player,
    hit: DeflectHit,
    pointerHeld: boolean,
  ): void {
    const relativeVelocity = {
      x: core.velocity.x - player.velocity.x,
      y: core.velocity.y - player.velocity.y,
    }
    const normalVelocity = dot(relativeVelocity, hit.normal)
    const reflected =
      normalVelocity < 0
        ? {
            x: relativeVelocity.x - 2 * normalVelocity * hit.normal.x,
            y: relativeVelocity.y - 2 * normalVelocity * hit.normal.y,
          }
        : relativeVelocity
    const force = pointerHeld
      ? stickInteractionConfig.deflect.pointerHeldDeflectForce
      : stickInteractionConfig.deflect.deflectForce

    core.setVelocity({
      x: player.velocity.x + reflected.x + hit.normal.x * force,
      y: player.velocity.y + reflected.y + hit.normal.y * force,
    })
  }

  private isCradled(): boolean {
    return (
      this.state === 'CRADLED_STABLE' ||
      this.state === 'CRADLED_CHARGING' ||
      this.state === 'CRADLED_OVERCHARGED'
    )
  }

  private drawDebug(core: Core, players: Player[]): void {
    if (!this.debugEnabled) {
      return
    }

    const focus = players.find((player) => player.id === this.debugFocusPlayerId)

    this.debugGraphics.clear()

    if (focus) {
      this.drawDeflectZone(focus)
      this.drawCradleZone(focus.getCradleZone())
      const socket = focus.getCradleSocket()
      this.debugGraphics.fillStyle(stickInteractionConfig.debug.socketColor, 0.95)
      this.debugGraphics.fillCircle(
        socket.x,
        socket.y,
        stickInteractionConfig.debug.socketRadius,
      )
      this.debugGraphics.lineStyle(2, stickInteractionConfig.debug.assistRadiusColor, 0.85)
      this.debugGraphics.strokeCircle(
        socket.x,
        socket.y,
        stickInteractionConfig.cradle.cradleAssistSnapRadius,
      )
    }

    if (this.releaseVector) {
      this.debugGraphics.lineStyle(4, stickInteractionConfig.debug.releaseVectorColor, 0.95)
      this.debugGraphics.lineBetween(
        this.releaseVector.start.x,
        this.releaseVector.start.y,
        this.releaseVector.end.x,
        this.releaseVector.end.y,
      )
    }

    this.debugText.setVisible(true)
    this.debugText.setText(
      `CORE ${this.state}\nCHARGE ${(this.cradleElapsedMs / 1000).toFixed(2)}s\nPOSSESSION ${
        this.carrierId ?? 'LOOSE'
      }\nSPEED ${Math.hypot(core.velocity.x, core.velocity.y).toFixed(2)}`,
    )
  }

  private drawCradleZone(zone: CradleZone): void {
    const config = stickInteractionConfig
    const startAngle = zone.aimAngle + zone.minAngle
    const endAngle = zone.aimAngle + zone.maxAngle

    this.debugGraphics.fillStyle(config.debug.zoneFillColor, config.debug.zoneFillAlpha)
    this.debugGraphics.lineStyle(2, config.debug.zoneStrokeColor, config.debug.zoneStrokeAlpha)
    this.debugGraphics.beginPath()

    for (let index = 0; index <= config.cradle.debugSegments; index += 1) {
      const t = index / config.cradle.debugSegments
      const point = radialPoint(
        zone.center,
        Phaser.Math.Linear(startAngle, endAngle, t),
        zone.maxRadius,
      )

      if (index === 0) {
        this.debugGraphics.moveTo(point.x, point.y)
      } else {
        this.debugGraphics.lineTo(point.x, point.y)
      }
    }

    for (let index = config.cradle.debugSegments; index >= 0; index -= 1) {
      const t = index / config.cradle.debugSegments
      const point = radialPoint(
        zone.center,
        Phaser.Math.Linear(startAngle, endAngle, t),
        zone.minRadius,
      )
      this.debugGraphics.lineTo(point.x, point.y)
    }

    this.debugGraphics.closePath()
    this.debugGraphics.fillPath()
    this.debugGraphics.strokePath()
  }

  private drawDeflectZone(player: Player): void {
    const points = player.getStickSamplePoints()

    if (points.length < 2) {
      return
    }

    this.debugGraphics.lineStyle(
      stickInteractionConfig.deflect.deflectRadius * 2,
      stickInteractionConfig.debug.deflectZoneColor,
      stickInteractionConfig.debug.deflectZoneAlpha,
    )
    this.debugGraphics.beginPath()
    this.debugGraphics.moveTo(points[0].x, points[0].y)

    for (let index = 1; index < points.length; index += 1) {
      this.debugGraphics.lineTo(points[index].x, points[index].y)
    }

    this.debugGraphics.strokePath()
  }
}

function testLegalCradle(core: Core, player: Player): CradleTestResult {
  const localPoint = player.worldToStickLocal(core.position)
  const radius = Math.hypot(localPoint.x, localPoint.y)
  const angle = Math.atan2(localPoint.y, localPoint.x)
  const relativeSpeed = distance(core.velocity, player.velocity)
  const zone = player.getCradleZone()
  const assisted =
    localPoint.y > 0 &&
    distance(core.position, player.getCradleSocket()) <=
      stickInteractionConfig.cradle.cradleAssistSnapRadius

  return {
    accepted:
      localPoint.y > 0 &&
      relativeSpeed <= stickInteractionConfig.cradle.maxCradleEntrySpeed &&
      (assisted ||
        (radius >= zone.minRadius &&
          radius <= zone.maxRadius &&
          angle >= zone.minAngle &&
          angle <= zone.maxAngle)),
    relativeSpeed,
  }
}

function testDeflectZone(core: Core, player: Player): DeflectHit | null {
  const closest = findClosestPointOnPolyline(core.position, player.getStickSamplePoints())

  if (!closest || closest.distance > stickInteractionConfig.deflect.deflectRadius) {
    return null
  }

  const localPoint = player.worldToStickLocal(core.position)
  const delta = {
    x: core.position.x - closest.point.x,
    y: core.position.y - closest.point.y,
  }
  const length = Math.hypot(delta.x, delta.y)
  const right = player.getStickRight()
  const normal =
    length === 0
      ? {
          x: right.x * (localPoint.y >= 0 ? 1 : -1),
          y: right.y * (localPoint.y >= 0 ? 1 : -1),
        }
      : {
          x: delta.x / length,
          y: delta.y / length,
        }

  return {
    closestPoint: closest.point,
    normal,
  }
}

function findClosestPointOnPolyline(
  point: Point,
  polyline: Point[],
): { point: Point; distance: number } | null {
  let closest: { point: Point; distance: number } | null = null

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const candidate = closestPointOnSegment(point, polyline[index], polyline[index + 1])

    if (!closest || candidate.distance < closest.distance) {
      closest = candidate
    }
  }

  return closest
}

function closestPointOnSegment(
  point: Point,
  start: Point,
  end: Point,
): { point: Point; distance: number } {
  const segment = {
    x: end.x - start.x,
    y: end.y - start.y,
  }
  const lengthSq = segment.x * segment.x + segment.y * segment.y
  const t =
    lengthSq === 0
      ? 0
      : Phaser.Math.Clamp(
          ((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSq,
          0,
          1,
        )
  const closest = {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  }

  return {
    point: closest,
    distance: distance(point, closest),
  }
}

function radialPoint(center: Point, angle: number, radius: number): Point {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  }
}

function normalized(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y)

  return length === 0 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}
