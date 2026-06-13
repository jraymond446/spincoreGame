import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getConfiguredAiAssistContext,
} from '../ai/AIAssist'
import { coreConfig } from '../config/entityConfig'
import { clearSafetyConfig } from '../config/clearSafetyConfig'
import { keeperShieldConfig } from '../config/keeperShieldConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import { getKeeperHomeDirection } from '../rules/KeeperGeometry'
import { normalizeSafe } from '../utils/vectorSafety'
import { KeeperClearSafetySystem } from './KeeperClearSafetySystem'
import { getOwnGoalSafetyPowerScale } from './ClearSafetySystem'

export type KeeperShieldDebugState = {
  center: Point
  normal: Point
  clearDirection: Point
  corrected: boolean
  contacted: boolean
}

export class KeeperShieldSystem {
  private readonly clearSafety: KeeperClearSafetySystem
  private readonly debugStates = new Map<TeamSide, KeeperShieldDebugState>()

  constructor(clearSafety: KeeperClearSafetySystem) {
    this.clearSafety = clearSafety
  }

  usesShield(player: Player): boolean {
    return (
      player.role === 'keeper' &&
      keeperShieldConfig.keeperUsesShieldDefault &&
      keeperShieldConfig.keeperEquipmentType === 'shield'
    )
  }

  tryDeflect(core: Core, player: Player, active: boolean): boolean {
    const geometry = this.getGeometry(player)
    const relative = subtract(core.position, geometry.center)
    const forwardDistance = dot(relative, geometry.normal)
    const lateralDistance = dot(relative, geometry.right)
    const contacted =
      Math.abs(lateralDistance) <=
        keeperShieldConfig.keeperShieldWidth / 2 + coreConfig.radius &&
      Math.abs(forwardDistance) <=
        keeperShieldConfig.keeperShieldDepth / 2 + coreConfig.radius

    if (!contacted) {
      this.recordDebug(player.teamSide, geometry, false, geometry.normal, false)
      return false
    }

    const away = getKeeperHomeDirection(player.teamSide)
    const contactNormal =
      forwardDistance >= 0
        ? geometry.normal
        : { x: -geometry.normal.x, y: -geometry.normal.y }
    const desired = normalized({
      x:
        contactNormal.x *
          (1 - keeperShieldConfig.keeperShieldOwnGoalSafetyBias) +
        away.x * keeperShieldConfig.keeperShieldOwnGoalSafetyBias,
      y:
        contactNormal.y *
          (1 - keeperShieldConfig.keeperShieldOwnGoalSafetyBias) +
        away.y * keeperShieldConfig.keeperShieldOwnGoalSafetyBias,
    })
    const clearAssistBonus = getClearAssistBonus(player)
    const clearResult = this.clearSafety.sanitize(
      clampDirectionToAway(
        desired,
        away,
        keeperShieldConfig.keeperShieldMaxDeflectAngle,
      ),
      player.teamSide,
      core.position,
      {
        awayBias:
          clearSafetyConfig.keeperShieldAwayBias +
          clearAssistBonus,
        reason: 'nearGoalDeflection',
      },
    )
    const powerMultiplier = Phaser.Math.Linear(
      0.92,
      1.12,
      Phaser.Math.Clamp(player.attributes.power, 0, 1.2),
    )
    const force =
      (active
        ? keeperShieldConfig.keeperShieldClearForce
        : keeperShieldConfig.keeperShieldDeflectForce) *
      powerMultiplier
    const damped = {
      x:
        core.velocity.x *
        keeperShieldConfig.keeperShieldDeflectDamping,
      y:
        core.velocity.y *
        keeperShieldConfig.keeperShieldDeflectDamping,
    }
    const nextVelocity = {
      x: damped.x + clearResult.direction.x * force,
      y: damped.y + clearResult.direction.y * force,
    }
    const finalSafety = this.clearSafety.sanitize(
      nextVelocity,
      player.teamSide,
      core.position,
      {
        awayBias:
          clearSafetyConfig.keeperShieldAwayBias +
          clearAssistBonus,
        reason: 'nearGoalDeflection',
      },
    )
    const speed =
      Math.max(force, Math.hypot(nextVelocity.x, nextVelocity.y)) *
      getOwnGoalSafetyPowerScale(finalSafety)

    core.setVelocity({
      x: finalSafety.direction.x * speed,
      y: finalSafety.direction.y * speed,
    })
    this.recordDebug(
      player.teamSide,
      geometry,
      true,
      finalSafety.direction,
      clearResult.corrected || finalSafety.corrected,
    )
    return true
  }

  getDebugState(side: TeamSide): KeeperShieldDebugState | null {
    const state = this.debugStates.get(side)

    return state
      ? {
          ...state,
          center: { ...state.center },
          normal: { ...state.normal },
          clearDirection: { ...state.clearDirection },
        }
      : null
  }

  reset(): void {
    this.debugStates.clear()
  }

  private getGeometry(player: Player): {
    center: Point
    normal: Point
    right: Point
  } {
    const normal = player.getStickForward()
    const right = { x: -normal.y, y: normal.x }
    const side =
      keeperShieldConfig.keeperShieldSideOffset *
      player.getHandednessMountSign()

    return {
      center: {
        x:
          player.position.x +
          normal.x * keeperShieldConfig.keeperShieldForwardOffset +
          right.x * side,
        y:
          player.position.y +
          normal.y * keeperShieldConfig.keeperShieldForwardOffset +
          right.y * side,
      },
      normal,
      right,
    }
  }

  private recordDebug(
    side: TeamSide,
    geometry: { center: Point; normal: Point },
    contacted: boolean,
    clearDirection: Point,
    corrected: boolean,
  ): void {
    this.debugStates.set(side, {
      center: { ...geometry.center },
      normal: { ...geometry.normal },
      clearDirection: { ...clearDirection },
      corrected,
      contacted,
    })
  }
}

function clampDirectionToAway(
  direction: Point,
  away: Point,
  maximumAngle: number,
): Point {
  const awayAngle = Math.atan2(away.y, away.x)
  const directionAngle = Math.atan2(direction.y, direction.x)
  const delta = Phaser.Math.Clamp(
    Phaser.Math.Angle.Wrap(directionAngle - awayAngle),
    -maximumAngle,
    maximumAngle,
  )

  return {
    x: Math.cos(awayAngle + delta),
    y: Math.sin(awayAngle + delta),
  }
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

function normalized(vector: Point): Point {
  return normalizeSafe(vector, { x: 0, y: 0 })
}

function getClearAssistBonus(player: Player): number {
  return getAiClearSafetyBonus(
    player,
    getConfiguredAiAssistContext(player, 1),
  )
}
