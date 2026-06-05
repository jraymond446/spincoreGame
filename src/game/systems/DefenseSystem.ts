import Phaser from 'phaser'
import { defenseConfig } from '../config/defenseConfig'
import type { Point } from '../data/geometry'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import type { FumbleSystem } from './FumbleSystem'
import type { StickInteractionSystem } from './StickInteractionSystem'

export type DefenseIntent = {
  bodyCheck: boolean
  stickSwipe: boolean
}

export type DefensiveActionState =
  | 'IDLE'
  | 'CHECK_STARTUP'
  | 'CHECK_ACTIVE'
  | 'CHECK_RECOVERY'
  | 'SWIPE_STARTUP'
  | 'SWIPE_ACTIVE'
  | 'SWIPE_RECOVERY'

type DefenseRuntime = {
  state: DefensiveActionState
  elapsedMs: number
  bodyCheckCooldownMs: number
  stickSwipeCooldownMs: number
  connected: boolean
}

type Burst = {
  position: Point
  remainingMs: number
}

type Shove = {
  velocity: Point
  remainingMs: number
}

export class DefenseSystem {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly runtimes = new Map<string, DefenseRuntime>()
  private readonly bursts: Burst[] = []
  private readonly shoves = new Map<string, Shove>()
  private debugEnabled = false
  private focusPlayerId: string | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(19)
  }

  update(
    core: Core,
    players: Player[],
    intents: Map<string, DefenseIntent>,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    focusPlayerId: string,
    deltaMs: number,
  ): void {
    this.focusPlayerId = focusPlayerId
    fumbleSystem.update(
      stickSystem.getCarrierId(),
      stickSystem.getState(),
      deltaMs,
    )

    for (const player of players) {
      const runtime = this.getRuntime(player.id)
      const intent = intents.get(player.id) ?? {
        bodyCheck: false,
        stickSwipe: false,
      }

      this.updateCooldowns(runtime, deltaMs)
      this.advanceState(runtime, player, deltaMs)

      if (
        runtime.state === 'IDLE' &&
        player.id !== stickSystem.getCarrierId()
      ) {
        if (intent.bodyCheck && runtime.bodyCheckCooldownMs === 0) {
          this.startBodyCheck(runtime)
        } else if (
          intent.stickSwipe &&
          runtime.stickSwipeCooldownMs === 0
        ) {
          this.startStickSwipe(runtime)
        }
      }

      if (runtime.state === 'CHECK_ACTIVE') {
        this.applyBodyCheck(
          player,
          players,
          core,
          stickSystem,
          fumbleSystem,
          runtime,
        )
      } else if (runtime.state === 'SWIPE_ACTIVE') {
        this.applyStickSwipe(
          player,
          players,
          core,
          stickSystem,
          fumbleSystem,
          runtime,
        )
      } else if (
        runtime.state === 'CHECK_RECOVERY' &&
        !runtime.connected
      ) {
        this.scene.matter.body.setVelocity(player.body, {
          x:
            player.velocity.x *
            recoveryMovementMultiplier(player),
          y:
            player.velocity.y *
            recoveryMovementMultiplier(player),
        })
      }
    }

    this.applyShoves(players, deltaMs)
    this.updateBursts(deltaMs)
    this.draw(players)
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled

    if (!enabled && this.bursts.length === 0) {
      this.graphics.clear()
    }
  }

  clear(): void {
    this.runtimes.clear()
    this.bursts.length = 0
    this.shoves.clear()
    this.graphics.clear()
  }

  getState(playerId: string): DefensiveActionState {
    return this.runtimes.get(playerId)?.state ?? 'IDLE'
  }

  getCooldowns(playerId: string): {
    bodyCheckMs: number
    stickSwipeMs: number
  } {
    const runtime = this.runtimes.get(playerId)

    return {
      bodyCheckMs: runtime?.bodyCheckCooldownMs ?? 0,
      stickSwipeMs: runtime?.stickSwipeCooldownMs ?? 0,
    }
  }

  private getRuntime(playerId: string): DefenseRuntime {
    const existing = this.runtimes.get(playerId)

    if (existing) {
      return existing
    }

    const runtime: DefenseRuntime = {
      state: 'IDLE',
      elapsedMs: 0,
      bodyCheckCooldownMs: 0,
      stickSwipeCooldownMs: 0,
      connected: false,
    }
    this.runtimes.set(playerId, runtime)
    return runtime
  }

  private updateCooldowns(
    runtime: DefenseRuntime,
    deltaMs: number,
  ): void {
    runtime.bodyCheckCooldownMs = Math.max(
      0,
      runtime.bodyCheckCooldownMs - deltaMs,
    )
    runtime.stickSwipeCooldownMs = Math.max(
      0,
      runtime.stickSwipeCooldownMs - deltaMs,
    )
  }

  private advanceState(
    runtime: DefenseRuntime,
    player: Player,
    deltaMs: number,
  ): void {
    if (runtime.state === 'IDLE') {
      return
    }

    runtime.elapsedMs += deltaMs
    const duration = stateDuration(runtime.state, player)

    if (runtime.elapsedMs < duration) {
      return
    }

    const nextState = nextDefenseState(runtime.state)
    runtime.state = nextState
    runtime.elapsedMs = 0

    if (nextState === 'IDLE') {
      runtime.connected = false
    }
  }

  private startBodyCheck(runtime: DefenseRuntime): void {
    runtime.state = 'CHECK_STARTUP'
    runtime.elapsedMs = 0
    runtime.connected = false
    runtime.bodyCheckCooldownMs = defenseConfig.bodyCheckCooldownMs
  }

  private startStickSwipe(runtime: DefenseRuntime): void {
    runtime.state = 'SWIPE_STARTUP'
    runtime.elapsedMs = 0
    runtime.connected = false
    runtime.stickSwipeCooldownMs = defenseConfig.stickSwipeCooldownMs
  }

  private applyBodyCheck(
    attacker: Player,
    players: Player[],
    core: Core,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    runtime: DefenseRuntime,
  ): void {
    const direction = actionDirection(attacker, true)
    const lungeSpeed =
      6.2 + attacker.attributes.speed * 3.2

    this.scene.matter.body.setVelocity(attacker.body, {
      x: direction.x * lungeSpeed,
      y: direction.y * lungeSpeed,
    })

    if (runtime.connected) {
      return
    }

    const target = nearestTargetInSector(
      attacker,
      players.filter(
        (player) => player.teamSide !== attacker.teamSide,
      ),
      direction,
      defenseConfig.bodyCheckRange,
      defenseConfig.bodyCheckArcRadians,
    )

    if (!target) {
      return
    }

    runtime.connected = true
    const roleMultiplier =
      attacker.role === 'brute'
        ? defenseConfig.bruteCheckMultiplier
        : defenseConfig.nonBruteCheckMultiplier
    const impulse =
      defenseConfig.bodyCheckImpulse *
      attacker.attributes.power *
      roleMultiplier

    this.shoves.set(target.id, {
      velocity: {
        x: direction.x * impulse,
        y: direction.y * impulse,
      },
      remainingMs: defenseConfig.bodyCheckActiveMs + 120,
    })

    if (stickSystem.getCarrierId() === target.id) {
      const pressure =
        defenseConfig.bodyCheckFumblePressure *
        attacker.attributes.defense *
        roleMultiplier *
        attacker.defenseTendencies.fumblePressurePreference *
        stylePressureMultiplier(attacker)
      const shouldFumble = fumbleSystem.addPressure(
        pressure,
        attacker.role,
        'bodyCheck',
        stickSystem.getState(),
      )

      if (
        shouldFumble &&
        stickSystem.forceFumble(core, players, target.id, direction)
      ) {
        fumbleSystem.clear()
        this.addFumbleBurst(core.position)
      }
    }
  }

  private applyStickSwipe(
    attacker: Player,
    players: Player[],
    core: Core,
    stickSystem: StickInteractionSystem,
    fumbleSystem: FumbleSystem,
    runtime: DefenseRuntime,
  ): void {
    if (runtime.connected) {
      return
    }

    const direction = actionDirection(attacker, false)
    const precisionMultiplier =
      attacker.role === 'support'
        ? defenseConfig.supportSwipePrecisionMultiplier
        : 1
    const range =
      defenseConfig.stickSwipeRange *
      Phaser.Math.Linear(
        0.86,
        precisionMultiplier,
        attacker.attributes.accuracy,
      )

    if (
      !pointInSector(
        attacker.position,
        core.position,
        direction,
        range,
        defenseConfig.stickSwipeArcRadians,
      )
    ) {
      return
    }

    runtime.connected = true
    const carrierId = stickSystem.getCarrierId()
    const carrier = players.find((player) => player.id === carrierId)

    if (carrier && carrier.teamSide !== attacker.teamSide) {
      const roleMultiplier =
        attacker.role === 'support'
          ? defenseConfig.supportSwipePrecisionMultiplier
          : attacker.role === 'brute'
            ? defenseConfig.bruteSwipePowerMultiplier
            : 1
      const pressure =
        defenseConfig.stickSwipeFumblePressure *
        attacker.attributes.defense *
        Phaser.Math.Linear(0.8, 1.15, attacker.attributes.accuracy) *
        roleMultiplier *
        attacker.defenseTendencies.fumblePressurePreference *
        stylePressureMultiplier(attacker)
      const shouldFumble = fumbleSystem.addPressure(
        pressure,
        attacker.role,
        'stickSwipe',
        stickSystem.getState(),
      )

      if (
        shouldFumble &&
        stickSystem.forceFumble(core, players, carrier.id, direction)
      ) {
        fumbleSystem.clear()
        this.addFumbleBurst(core.position)
      }
      return
    }

    if (!carrier) {
      const powerMultiplier =
        attacker.role === 'brute'
          ? defenseConfig.bruteSwipePowerMultiplier
          : 1
      const impulse =
        defenseConfig.stickSwipeFreeCoreImpulse *
        attacker.attributes.power *
        powerMultiplier

      core.setVelocity({
        x: core.velocity.x + direction.x * impulse,
        y: core.velocity.y + direction.y * impulse,
      })
    }
  }

  private addFumbleBurst(position: Point): void {
    this.bursts.push({
      position: { ...position },
      remainingMs: 260,
    })
  }

  private applyShoves(players: Player[], deltaMs: number): void {
    for (const [playerId, shove] of this.shoves) {
      const player = players.find((candidate) => candidate.id === playerId)

      if (!player) {
        this.shoves.delete(playerId)
        continue
      }

      const strength = Phaser.Math.Clamp(shove.remainingMs / 250, 0, 1)
      this.scene.matter.body.setVelocity(player.body, {
        x: player.velocity.x + shove.velocity.x * strength,
        y: player.velocity.y + shove.velocity.y * strength,
      })
      shove.remainingMs -= deltaMs

      if (shove.remainingMs <= 0) {
        this.shoves.delete(playerId)
      }
    }
  }

  private updateBursts(deltaMs: number): void {
    for (const burst of this.bursts) {
      burst.remainingMs -= deltaMs
    }

    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      if (this.bursts[index].remainingMs <= 0) {
        this.bursts.splice(index, 1)
      }
    }
  }

  private draw(players: Player[]): void {
    this.graphics.clear()

    for (const player of players) {
      const runtime = this.runtimes.get(player.id)

      if (!runtime) {
        continue
      }

      if (runtime.state === 'CHECK_ACTIVE') {
        this.drawActionArc(
          player,
          actionDirection(player, true),
          defenseConfig.bodyCheckRange,
          defenseConfig.bodyCheckArcRadians,
          defenseConfig.debug.bodyCheckColor,
          0.72,
        )
      } else if (runtime.state === 'SWIPE_ACTIVE') {
        this.drawActionArc(
          player,
          actionDirection(player, false),
          defenseConfig.stickSwipeRange,
          defenseConfig.stickSwipeArcRadians,
          defenseConfig.debug.stickSwipeColor,
          0.76,
        )
      }
    }

    if (this.debugEnabled) {
      const focus = players.find(
        (player) => player.id === this.focusPlayerId,
      )

      if (focus) {
        this.drawActionArc(
          focus,
          actionDirection(focus, true),
          defenseConfig.bodyCheckRange,
          defenseConfig.bodyCheckArcRadians,
          defenseConfig.debug.bodyCheckColor,
          defenseConfig.debug.rangeAlpha,
        )
        this.drawActionArc(
          focus,
          actionDirection(focus, false),
          defenseConfig.stickSwipeRange,
          defenseConfig.stickSwipeArcRadians,
          defenseConfig.debug.stickSwipeColor,
          defenseConfig.debug.rangeAlpha,
        )
      }
    }

    for (const burst of this.bursts) {
      const progress = 1 - burst.remainingMs / 260
      this.graphics.lineStyle(
        4,
        defenseConfig.debug.fumbleColor,
        1 - progress,
      )
      this.graphics.strokeCircle(
        burst.position.x,
        burst.position.y,
        18 + progress * 32,
      )
    }
  }

  private drawActionArc(
    player: Player,
    direction: Point,
    range: number,
    arc: number,
    color: number,
    alpha: number,
  ): void {
    const centerAngle = Math.atan2(direction.y, direction.x)
    const start = centerAngle - arc / 2
    const end = centerAngle + arc / 2
    const segments = 14

    this.graphics.lineStyle(4, color, alpha)
    this.graphics.beginPath()

    for (let index = 0; index <= segments; index += 1) {
      const angle = Phaser.Math.Linear(start, end, index / segments)
      const point = {
        x: player.position.x + Math.cos(angle) * range,
        y: player.position.y + Math.sin(angle) * range,
      }

      if (index === 0) {
        this.graphics.moveTo(point.x, point.y)
      } else {
        this.graphics.lineTo(point.x, point.y)
      }
    }

    this.graphics.strokePath()
  }
}

function stateDuration(
  state: DefensiveActionState,
  player: Player,
): number {
  const controlRecoveryMultiplier = Phaser.Math.Linear(
    1.15,
    0.72,
    player.attributes.control,
  )

  switch (state) {
    case 'CHECK_STARTUP':
      return defenseConfig.bodyCheckStartupMs
    case 'CHECK_ACTIVE':
      return defenseConfig.bodyCheckActiveMs
    case 'CHECK_RECOVERY':
      return (
        defenseConfig.bodyCheckRecoveryMs *
        controlRecoveryMultiplier *
        (player.role === 'brute' ? 1.12 : 1)
      )
    case 'SWIPE_STARTUP':
      return defenseConfig.stickSwipeStartupMs
    case 'SWIPE_ACTIVE':
      return defenseConfig.stickSwipeActiveMs
    case 'SWIPE_RECOVERY':
      return (
        defenseConfig.stickSwipeRecoveryMs *
        controlRecoveryMultiplier
      )
    default:
      return 0
  }
}

function nextDefenseState(
  state: DefensiveActionState,
): DefensiveActionState {
  switch (state) {
    case 'CHECK_STARTUP':
      return 'CHECK_ACTIVE'
    case 'CHECK_ACTIVE':
      return 'CHECK_RECOVERY'
    case 'CHECK_RECOVERY':
      return 'IDLE'
    case 'SWIPE_STARTUP':
      return 'SWIPE_ACTIVE'
    case 'SWIPE_ACTIVE':
      return 'SWIPE_RECOVERY'
    case 'SWIPE_RECOVERY':
      return 'IDLE'
    default:
      return 'IDLE'
  }
}

function nearestTargetInSector(
  attacker: Player,
  targets: Player[],
  direction: Point,
  range: number,
  arc: number,
): Player | null {
  return (
    targets
      .filter((target) =>
        pointInSector(
          attacker.position,
          target.position,
          direction,
          range,
          arc,
        ),
      )
      .sort(
        (a, b) =>
          distance(attacker.position, a.position) -
          distance(attacker.position, b.position),
      )[0] ?? null
  )
}

function pointInSector(
  origin: Point,
  point: Point,
  direction: Point,
  range: number,
  arc: number,
): boolean {
  const offset = {
    x: point.x - origin.x,
    y: point.y - origin.y,
  }
  const pointDistance = Math.hypot(offset.x, offset.y)

  if (pointDistance > range || pointDistance === 0) {
    return false
  }

  const angle = Math.acos(
    Phaser.Math.Clamp(
      (offset.x * direction.x + offset.y * direction.y) /
        pointDistance,
      -1,
      1,
    ),
  )

  return angle <= arc / 2
}

function actionDirection(player: Player, preferMovement: boolean): Point {
  const speed = Math.hypot(player.velocity.x, player.velocity.y)

  if (preferMovement && speed > 1.2) {
    return {
      x: player.velocity.x / speed,
      y: player.velocity.y / speed,
    }
  }

  return player.getReleaseAimForward()
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function recoveryMovementMultiplier(player: Player): number {
  return Phaser.Math.Linear(
    defenseConfig.bodyCheckMissRecoveryPenalty,
    0.94,
    player.attributes.control,
  )
}

function stylePressureMultiplier(player: Player): number {
  if (player.playStyle === 'disruptive') {
    return 1.15
  }

  if (
    player.playStyle === 'conservative' ||
    player.playStyle === 'bodyguard'
  ) {
    return 0.92
  }

  return 1
}
