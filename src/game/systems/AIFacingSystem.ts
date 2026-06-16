import Phaser from 'phaser'
import { aiCarrierConfig } from '../config/aiCarrierConfig'
import type { Point } from '../data/geometry'
import type { Player } from '../entities/Player'

type FacingState = {
  anchorAngle: number
  anchorPosition: Point
  lastPosition: Point
  travelDistance: number
  stationaryMs: number
  wasCarrier: boolean
}

const carrierTurnEnvelopeRadians = 1.05
const offBallTurnEnvelopeRadians = 1.2
const offBallTurnRateRadiansPerSec = 3.2
const reanchorDistance = 120
const reanchorMinimumDirectness = 0.78
const reanchorHeadingToleranceRadians = 0.6
const settledReanchorMs = 950
const maximumTrackedStepDistance = 40

export class AIFacingSystem {
  private readonly states = new Map<string, FacingState>()

  resolve(
    player: Player,
    move: Phaser.Math.Vector2,
    isCarrier: boolean,
    deltaMs: number,
  ): number {
    const currentAngle = player.getBodyFacingAngle()
    const moving = move.lengthSq() > 0.02
    const desiredAngle = moving
      ? Math.atan2(move.y, move.x)
      : currentAngle
    let state = this.states.get(player.id)

    if (!state) {
      state = {
        anchorAngle: currentAngle,
        anchorPosition: { ...player.position },
        lastPosition: { ...player.position },
        travelDistance: 0,
        stationaryMs: 0,
        wasCarrier: isCarrier,
      }
      this.states.set(player.id, state)
    }

    const stepDistance = distance(player.position, state.lastPosition)
    if (Number.isFinite(stepDistance)) {
      state.travelDistance += Math.min(
        stepDistance,
        maximumTrackedStepDistance,
      )
    }
    state.lastPosition = { ...player.position }
    state.stationaryMs = moving ? 0 : state.stationaryMs + deltaMs

    if (state.wasCarrier !== isCarrier) {
      resetAnchor(state, currentAngle, player.position)
      state.wasCarrier = isCarrier
    }

    const envelope = isCarrier
      ? carrierTurnEnvelopeRadians
      : offBallTurnEnvelopeRadians
    const anchorDelta = Phaser.Math.Angle.Wrap(
      desiredAngle - state.anchorAngle,
    )

    if (!isCarrier) {
      const netMovement = {
        x: player.position.x - state.anchorPosition.x,
        y: player.position.y - state.anchorPosition.y,
      }
      const netDistance = Math.hypot(netMovement.x, netMovement.y)
      const directness =
        state.travelDistance > 0
          ? netDistance / state.travelDistance
          : 0
      const movementLegAngle =
        netDistance > 0
          ? Math.atan2(netMovement.y, netMovement.x)
          : desiredAngle
      const headingAlignment = Math.abs(
        Phaser.Math.Angle.Wrap(
          desiredAngle - movementLegAngle,
        ),
      )
      const completedDirectMovementLeg =
        moving &&
        netDistance >= reanchorDistance &&
        directness >= reanchorMinimumDirectness &&
        headingAlignment <= reanchorHeadingToleranceRadians &&
        Math.abs(anchorDelta) >= envelope * 0.85
      const settledForNewMovementLeg =
        !moving && state.stationaryMs >= settledReanchorMs

      if (completedDirectMovementLeg || settledForNewMovementLeg) {
        resetAnchor(state, currentAngle, player.position)
      }
    }

    const boundedTarget = Phaser.Math.Angle.Wrap(
      state.anchorAngle +
        Phaser.Math.Clamp(
          Phaser.Math.Angle.Wrap(
            desiredAngle - state.anchorAngle,
          ),
          -envelope,
          envelope,
        ),
    )
    const turnRate = isCarrier
      ? aiCarrierConfig.aiCarrierBodyTurnRateRadiansPerSec
      : offBallTurnRateRadiansPerSec
    const maximumTurn = turnRate * Math.max(0, deltaMs / 1000)

    return Phaser.Math.Angle.Wrap(
      currentAngle +
        Phaser.Math.Clamp(
          Phaser.Math.Angle.Wrap(boundedTarget - currentAngle),
          -maximumTurn,
          maximumTurn,
        ),
    )
  }

  clearPlayer(playerId: string): void {
    this.states.delete(playerId)
  }

  reset(): void {
    this.states.clear()
  }
}

function resetAnchor(
  state: FacingState,
  angle: number,
  position: Point,
): void {
  state.anchorAngle = angle
  state.anchorPosition = { ...position }
  state.lastPosition = { ...position }
  state.travelDistance = 0
  state.stationaryMs = 0
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
