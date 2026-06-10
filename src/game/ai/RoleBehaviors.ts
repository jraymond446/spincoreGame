import Phaser from 'phaser'
import {
  getAiClearSafetyBonus,
  getAiDecisionSpeed,
  getAiPassError,
  getAiShotError,
} from './AIAssist'
import { aiConfig } from '../config/aiConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { playerRuntimeConfig } from '../config/playerConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'
import type {
  AIState,
  PlayerControlIntent,
  PlayerRole,
} from '../data/matchTypes'
import type { Player } from '../entities/Player'
import { normalizeSafe } from '../utils/vectorSafety'
import type { AIDecisionContext } from './AIDecisionContext'

type RoleBehavior = (context: AIDecisionContext) => PlayerControlIntent

const roleBehaviors: Record<PlayerRole, RoleBehavior> = {
  keeper: decideKeeper,
  striker: decideStriker,
  support: decideSupport,
  brute: decideBrute,
}

export function decideRoleIntent(
  context: AIDecisionContext,
): PlayerControlIntent {
  return roleBehaviors[context.player.role](context)
}

function decideKeeper(context: AIDecisionContext): PlayerControlIntent {
  const { player, core, attackGoal, ownGoal, style } = context

  if (context.isCarrier) {
    const clearTarget = executionTarget(
      context,
      attackGoal,
      aiConfig.shotSpread * 1.25 * style.shotSpreadMultiplier,
      'clear',
      'clear',
    )

    return intent(
      player.position,
      clearTarget,
      true,
      'CLEAR',
      clearTarget,
      false,
      releaseDelay(context, player.attributes.power),
    )
  }

  const toCore = normalized({
    x: core.position.x - ownGoal.x,
    y: core.position.y - ownGoal.y,
  })
  const legalRadius =
    keeperAreaConfig.keeperZoneRadius -
    playerRuntimeConfig.radius -
    keeperAreaConfig.keeperZoneBoundaryBuffer
  const reactionScale = Phaser.Math.Linear(
    aiConfig.roleBehavior.keeperReactionMin,
    aiConfig.roleBehavior.keeperReactionMax,
    player.attributes.reaction,
  )
  const desiredDepth =
    legalRadius *
    style.keeperDepth *
    reactionScale *
    (1 - context.formationBias.defensiveRetreat)
  const homeDistance = Math.min(
    desiredDepth,
    distance(ownGoal, core.position) * aiConfig.keeperAggression,
  )
  const homeTarget = {
    x: ownGoal.x + toCore.x * homeDistance,
    y: ownGoal.y + toCore.y * homeDistance,
  }
  const catchRadius = attributeScale(
    aiConfig.aiCradleRadius,
    player.attributes.control,
    aiConfig.roleBehavior.controlCatchMin,
    aiConfig.roleBehavior.controlCatchMax,
  )
  const swingRange = attributeScale(
    stickConfig.aiSwingRange,
    player.attributes.reaction,
    aiConfig.roleBehavior.reactionSwingMin,
    aiConfig.roleBehavior.reactionSwingMax,
  )

  return intent(
    homeTarget,
    core.position,
    context.distanceToCore <= catchRadius,
    'DEFEND_GOAL',
    undefined,
    context.distanceToCore > catchRadius &&
      context.distanceToCore <= swingRange,
  )
}

function decideStriker(context: AIDecisionContext): PlayerControlIntent {
  const { player, attackGoal, style } = context

  if (context.isCarrier) {
    const teammate = bestForwardTeammate(player, context.players)
    const playerGoalDistance = distance(player.position, attackGoal)
    const teammateAdvantage =
      teammate.id === player.id
        ? 0
        : playerGoalDistance - distance(teammate.position, attackGoal)
    const passThreshold =
      aiConfig.roleBehavior.strikerPassAdvantageDistance *
      style.strikerPassThresholdMultiplier
    const laneClear = hasClearLane(
      player,
      attackGoal,
      context.players,
      aiConfig.roleBehavior.supportOpenLaneRadius,
    )

    if (!laneClear && teammateAdvantage > passThreshold) {
      return passIntent(context, teammate)
    }

    return shotIntent(context, attackGoal)
  }

  if (context.opponentCarrier) {
    return pressureIntent(context, context.opponentCarrier, 'MARK_CARRIER')
  }

  if (context.teammateCarrier) {
    const receiveTarget = blendPoints(
      context.teammateCarrier.position,
      attackGoal,
      aiConfig.roleBehavior.strikerReceiveGoalBlend,
    )

    return intent(receiveTarget, context.core.position, false, 'SUPPORT_ATTACK')
  }

  return seekCoreIntent(context)
}

function decideSupport(context: AIDecisionContext): PlayerControlIntent {
  const { player, attackGoal, style } = context

  if (context.isCarrier) {
    const shotDistance =
      aiConfig.roleBehavior.supportShotDistance *
      style.supportShotDistanceMultiplier
    const wideOpen =
      nearestOpponentDistance(player, context.players) >=
      aiConfig.roleBehavior.supportOpenLaneRadius
    const laneClear = hasClearLane(
      player,
      attackGoal,
      context.players,
      aiConfig.roleBehavior.supportOpenLaneRadius,
    )

    if (
      distance(player.position, attackGoal) <= shotDistance &&
      wideOpen &&
      laneClear
    ) {
      return shotIntent(context, attackGoal)
    }

    return passIntent(
      context,
      bestForwardTeammate(player, context.players),
    )
  }

  if (context.opponentCarrier) {
    return pressureIntent(context, context.opponentCarrier, 'MARK_CARRIER')
  }

  if (context.teammateCarrier) {
    const spacing =
      aiConfig.supportSpacing *
      style.supportSpacingMultiplier *
      context.formationBias.supportSpacingMultiplier
    const attackDirection = normalized({
      x: attackGoal.x - context.teammateCarrier.position.x,
      y: attackGoal.y - context.teammateCarrier.position.y,
    })
    const lateral = { x: -attackDirection.y, y: attackDirection.x }
    // Preserve the existing tactical lane preference. This is independent of
    // the corrected cesta artwork/socket handedness convention.
    const handedSide = -player.getPocketFacingSign()
    const supportTarget = {
      x:
        context.teammateCarrier.position.x +
        lateral.x * spacing * handedSide -
        attackDirection.x *
          spacing *
          aiConfig.roleBehavior.supportRetreatBlend,
      y:
        context.teammateCarrier.position.y +
        lateral.y * spacing * handedSide -
        attackDirection.y *
          spacing *
          aiConfig.roleBehavior.supportRetreatBlend,
    }

    return intent(supportTarget, context.core.position, false, 'SUPPORT_ATTACK')
  }

  return seekCoreIntent(context)
}

function decideBrute(context: AIDecisionContext): PlayerControlIntent {
  const { player, attackGoal, ownGoal, style } = context

  if (context.isCarrier) {
    const clearTarget = executionTarget(
      context,
      attackGoal,
      aiConfig.shotSpread * 1.55 * style.shotSpreadMultiplier,
      'clear',
      'clear',
    )

    return intent(
      player.position,
      clearTarget,
      true,
      'CLEAR',
      clearTarget,
      false,
      releaseDelay(context, player.attributes.power),
    )
  }

  if (context.opponentCarrier) {
    return pressureIntent(context, context.opponentCarrier, 'PRESS_CARRIER')
  }

  if (context.teammateCarrier) {
    const guardTarget = blendPoints(
      ownGoal,
      context.teammateCarrier.position,
      aiConfig.roleBehavior.bruteGuardGoalBlend +
        style.pressBlend * 0.28,
    )

    return intent(guardTarget, context.core.position, false, 'SUPPORT_ATTACK')
  }

  return seekCoreIntent(context)
}

function shotIntent(
  context: AIDecisionContext,
  target: Point,
): PlayerControlIntent {
  const shotTarget = executionTarget(
    context,
    applyHandednessAim(context.player, target),
    aiConfig.shotSpread * context.style.shotSpreadMultiplier,
    'shot',
    'shot',
  )

  return intent(
    context.player.position,
    shotTarget,
    true,
    'SHOOT',
    shotTarget,
    false,
    releaseDelay(context, context.player.attributes.shooting),
  )
}

function passIntent(
  context: AIDecisionContext,
  teammate: Player,
): PlayerControlIntent {
  const leadDistance =
    aiConfig.passLeadDistance * context.style.passLeadMultiplier
  const passTarget = executionTarget(
    context,
    applyHandednessAim(
      context.player,
      leadPoint(teammate, context.attackGoal, leadDistance),
    ),
    aiConfig.passSpread * context.style.passSpreadMultiplier,
    'pass',
    'pass',
  )

  return intent(
    context.player.position,
    passTarget,
    true,
    'PASS',
    passTarget,
    false,
    releaseDelay(context, context.player.attributes.passing),
  )
}

function pressureIntent(
  context: AIDecisionContext,
  carrier: Player,
  state: 'MARK_CARRIER' | 'PRESS_CARRIER',
): PlayerControlIntent {
  const attributePress =
    context.style.pressBlend *
    Phaser.Math.Linear(0.72, 1, context.player.attributes.defense)
  const formationPress =
    context.formationBias.pressTargetBlend *
    (1 - context.formationBias.defensiveRetreat)
  const pressureTarget = blendPoints(
    context.ownGoal,
    carrier.position,
    attributePress * formationPress,
  )

  return intent(
    pressureTarget,
    carrier.position,
    false,
    state,
    undefined,
    state === 'PRESS_CARRIER' &&
      distance(context.player.position, carrier.position) <=
        aiConfig.bruteCheckRadius *
          context.style.bruteCheckMultiplier *
          context.formationBias.brutePressureMultiplier,
  )
}

function seekCoreIntent(
  context: AIDecisionContext,
): PlayerControlIntent {
  const catchRadius = attributeScale(
    aiConfig.aiCradleRadius,
    context.player.attributes.control,
    aiConfig.roleBehavior.controlCatchMin,
    aiConfig.roleBehavior.controlCatchMax,
  )
  const catchReady = context.distanceToCore <= catchRadius
  const retreat =
    context.style.defensiveRetreat +
    context.formationBias.defensiveRetreat
  const target = blendPoints(
    context.core.position,
    context.ownGoal,
    Phaser.Math.Clamp(retreat, 0, 0.5),
  )

  return intent(
    target,
    context.core.position,
    catchReady,
    'SEEK_CORE',
    undefined,
    !catchReady && context.distanceToCore <= stickConfig.aiSwingRange,
  )
}

function releaseDelay(
  context: AIDecisionContext,
  executionAttribute: number,
): number {
  const attributeMultiplier = Phaser.Math.Linear(
    aiConfig.roleBehavior.attributeChargeMin,
    aiConfig.roleBehavior.attributeChargeMax,
    executionAttribute,
  )
  const handlingMultiplier = Phaser.Math.Linear(
    context.player.role === 'striker' ? 0.76 : 0.84,
    context.player.role === 'support' ? 1.2 : 1.12,
    Phaser.Math.Clamp(context.player.attributes.ballHandling, 0, 1),
  )

  return (
    aiConfig.aiReleaseDelayMs *
    context.style.releaseDelayMultiplier *
    attributeMultiplier *
    handlingMultiplier *
    context.formationBias.releaseDelayMultiplier /
    getAiDecisionSpeed(context.player, context)
  )
}

function executionTarget(
  context: AIDecisionContext,
  target: Point,
  maxSpread: number,
  salt: string,
  kind: 'shot' | 'pass' | 'clear',
): Point {
  const player = context.player
  const roughness =
    kind === 'shot'
      ? getAiShotError(player, context)
      : kind === 'pass'
        ? getAiPassError(player, context)
        : Phaser.Math.Clamp(
            0.24 -
              getAiClearSafetyBonus(player, context) * 0.5 -
              player.attributes.power * 0.05,
            0.025,
            0.3,
          )
  const hash = hashString(`${player.id}:${salt}`)

  return {
    x: target.x + Math.sin(hash * 12.9898) * maxSpread * roughness,
    y: target.y + Math.cos(hash * 78.233) * maxSpread * roughness,
  }
}

function applyHandednessAim(player: Player, target: Point): Point {
  const direction = {
    x: target.x - player.position.x,
    y: target.y - player.position.y,
  }
  const rotated = rotate(
    normalized(direction),
    stickConfig.handednessNaturalAimRadians *
      player.getPocketFacingSign(),
  )
  const length = Math.hypot(direction.x, direction.y)

  return {
    x: player.position.x + rotated.x * length,
    y: player.position.y + rotated.y * length,
  }
}

function bestForwardTeammate(
  player: Player,
  players: Player[],
): Player {
  const teammates = players.filter(
    (candidate) =>
      candidate.teamSide === player.teamSide &&
      candidate.id !== player.id &&
      candidate.role !== 'keeper',
  )

  if (teammates.length === 0) {
    return player
  }

  return teammates.reduce((best, candidate) => {
    const candidateProgress =
      player.teamSide === 'A'
        ? -candidate.position.y
        : candidate.position.y
    const bestProgress =
      player.teamSide === 'A' ? -best.position.y : best.position.y

    return candidateProgress > bestProgress ? candidate : best
  })
}

function nearestOpponentDistance(
  player: Player,
  players: Player[],
): number {
  const distances = players
    .filter((candidate) => candidate.teamSide !== player.teamSide)
    .map((candidate) => distance(player.position, candidate.position))

  return distances.length > 0 ? Math.min(...distances) : Infinity
}

function hasClearLane(
  player: Player,
  target: Point,
  players: Player[],
  clearance: number,
): boolean {
  return players
    .filter((candidate) => candidate.teamSide !== player.teamSide)
    .every(
      (opponent) =>
        distanceToSegment(opponent.position, player.position, target) >=
        clearance,
    )
}

function intent(
  moveTarget: Point,
  aimTarget: Point,
  hold: boolean,
  aiState: AIState,
  releaseTarget?: Point,
  swing = false,
  aiReleaseDelayMs?: number,
): PlayerControlIntent {
  return {
    moveTarget,
    aimTarget,
    hold,
    swing,
    releaseTarget,
    aiReleaseDelayMs,
    aiState,
  }
}

function leadPoint(
  player: Player,
  attackGoal: Point,
  leadDistance: number,
): Point {
  const direction = normalized({
    x: attackGoal.x - player.position.x,
    y: attackGoal.y - player.position.y,
  })

  return {
    x: player.position.x + direction.x * leadDistance,
    y: player.position.y + direction.y * leadDistance,
  }
}

function attributeScale(
  base: number,
  attribute: number,
  minimum: number,
  maximum: number,
): number {
  return base * Phaser.Math.Linear(minimum, maximum, attribute)
}

function blendPoints(start: Point, end: Point, amount: number): Point {
  const clamped = Phaser.Math.Clamp(amount, 0, 1)

  return {
    x: Phaser.Math.Linear(start.x, end.x, clamped),
    y: Phaser.Math.Linear(start.y, end.y, clamped),
  }
}

function distanceToSegment(
  point: Point,
  start: Point,
  end: Point,
): number {
  const segment = { x: end.x - start.x, y: end.y - start.y }
  const lengthSquared =
    segment.x * segment.x + segment.y * segment.y
  const progress =
    lengthSquared === 0
      ? 0
      : Phaser.Math.Clamp(
          ((point.x - start.x) * segment.x +
            (point.y - start.y) * segment.y) /
            lengthSquared,
          0,
          1,
        )
  const closest = {
    x: start.x + segment.x * progress,
    y: start.y + segment.y * progress,
  }

  return distance(point, closest)
}

function rotate(vector: Point, angle: number): Point {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)

  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  }
}

function normalized(vector: Point): Point {
  return normalizeSafe(vector, { x: 0, y: 0 })
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function hashString(value: string): number {
  return [...value].reduce(
    (hash, character) => hash + character.charCodeAt(0),
    0,
  )
}
