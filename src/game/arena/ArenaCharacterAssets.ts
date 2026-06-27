import type { Point } from '../data/geometry'

export type ArenaCharacterRendererMode =
  | 'legacy'
  | 'asset'
  | 'automatic'

export type ArenaCharacterRendererScope = 'controlled' | 'all'
export type ArenaBodyId = 'field-player-01'
export type ArenaHairId = 'arena-hair-01'
export type ArenaStickId = 'rookie-cesta-01'
export type ArenaStickLayerMode = 'automatic' | 'above' | 'below'
export type ArenaCoreVisualState =
  | 'free'
  | 'possessed'
  | 'charging'
  | 'fullyCharged'
  | 'released'
  | 'disrupted'

export type ArenaAssetSlot = {
  key: string
  path: string
}

export type ArenaRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ArenaBodyDefinition = {
  id: ArenaBodyId
  body: ArenaAssetSlot
  skinMask: ArenaAssetSlot
  uniformPrimaryMask: ArenaAssetSlot
  uniformAccentMask: ArenaAssetSlot
  canvas: { width: number; height: number }
  authoredForwardAngle: number
  origin: Point
  visualCenter: Point
  headAnchor: Point
  gripAnchor: Point
  safeBounds: ArenaRect
  displaySize: { width: number; height: number }
}

export type ArenaHairDefinition = {
  id: ArenaHairId
  asset: ArenaAssetSlot
  canvas: { width: number; height: number }
  origin: Point
  headAnchor: Point
  safeBounds: ArenaRect
}

export type ArenaStickDefinition = {
  id: ArenaStickId
  asset: ArenaAssetSlot
  canvas: { width: number; height: number }
  authoredForwardAngle: number
  gripAnchor: Point
  rotationPivot: Point
  pocketAnchor: Point
  tipAnchor: Point
  safeBounds: ArenaRect
  displayScale: number
  defaultAngle: number
  attachmentCorrection: {
    scale: number
    angle: number
  }
}

export type ArenaCoreDefinition = {
  asset: ArenaAssetSlot
  canvas: { width: number; height: number }
  origin: Point
  safeBounds: ArenaRect
  displaySize: number
}

export type ArenaStickTransform = {
  position: Point
  rotation: number
  scaleX: number
  scaleY: number
  grip: Point
  pivot: Point
  pocket: Point
  tip: Point
}

export const DEFAULT_ARENA_STICK_RENDER_SCALE = 0.42

export const ARENA_STICK_RENDER_SCALE_RANGE = {
  min: 0.3,
  max: 0.75,
  step: 0.01,
} as const

export const DEFAULT_ARENA_PLAYER_RENDER_SCALE = 2

export const ARENA_PLAYER_RENDER_SCALE_RANGE = {
  min: 0.65,
  max: 2.25,
  step: 0.05,
} as const

export const arenaBodyDefinitions: Record<
  ArenaBodyId,
  ArenaBodyDefinition
> = {
  'field-player-01': {
    id: 'field-player-01',
    body: {
      key: 'arena-character-field-player-body',
      path: '/assets/characters/arena/field-player-body-base.png',
    },
    skinMask: {
      key: 'arena-character-field-player-skin-mask',
      path: '/assets/characters/arena/masks/field-player-skin-mask.png',
    },
    uniformPrimaryMask: {
      key: 'arena-character-field-player-uniform-primary-mask',
      path: '/assets/characters/arena/masks/field-player-uniform-primary-mask.png',
    },
    uniformAccentMask: {
      key: 'arena-character-field-player-uniform-accent-mask',
      path: '/assets/characters/arena/masks/field-player-uniform-accent-mask.png',
    },
    canvas: { width: 128, height: 128 },
    authoredForwardAngle: -Math.PI / 2,
    origin: { x: 64, y: 72 },
    visualCenter: { x: 64, y: 62 },
    headAnchor: { x: 64, y: 31 },
    gripAnchor: { x: 91, y: 70 },
    safeBounds: { x: 18, y: 8, width: 92, height: 112 },
    displaySize: { width: 68, height: 68 },
  },
}

export const arenaHairDefinitions: Record<
  ArenaHairId,
  ArenaHairDefinition
> = {
  'arena-hair-01': {
    id: 'arena-hair-01',
    asset: {
      key: 'arena-character-hair-01',
      path: '/assets/characters/arena/hair/arena-hair-01.png',
    },
    canvas: { width: 128, height: 128 },
    origin: { x: 64, y: 72 },
    headAnchor: { x: 64, y: 31 },
    safeBounds: { x: 34, y: 8, width: 60, height: 52 },
  },
}

export const arenaStickDefinitions: Record<
  ArenaStickId,
  ArenaStickDefinition
> = {
  'rookie-cesta-01': {
    id: 'rookie-cesta-01',
    asset: {
      key: 'arena-stick-rookie-cesta-01',
      path: '/assets/sticks/arena/rookie-cesta-01.png',
    },
    canvas: { width: 160, height: 96 },
    authoredForwardAngle: 0,
    gripAnchor: { x: 24, y: 48 },
    rotationPivot: { x: 24, y: 48 },
    pocketAnchor: { x: 123, y: 58 },
    tipAnchor: { x: 146, y: 48 },
    safeBounds: { x: 10, y: 10, width: 142, height: 76 },
    displayScale: DEFAULT_ARENA_STICK_RENDER_SCALE,
    defaultAngle: 0,
    attachmentCorrection: {
      scale: 1,
      angle: 0.049907065938394224,
    },
  },
}

export const arenaCoreDefinition: ArenaCoreDefinition = {
  asset: {
    key: 'arena-core-texture',
    path: '/assets/core/arena-core.png',
  },
  canvas: { width: 64, height: 64 },
  origin: { x: 32, y: 32 },
  safeBounds: { x: 8, y: 8, width: 48, height: 48 },
  displaySize: 26,
}

export const spectatorUniformMaskAsset: ArenaAssetSlot = {
  key: 'arena-spectator-uniform-mask',
  path: '/assets/arena/crowd/spectator-uniform-mask.png',
}

export const arenaCharacterDefaults = {
  rendererMode: 'asset' as ArenaCharacterRendererMode,
  rendererScope: 'all' as ArenaCharacterRendererScope,
  bodyId: 'field-player-01' as ArenaBodyId,
  hairId: 'arena-hair-01' as ArenaHairId,
  stickId: 'rookie-cesta-01' as ArenaStickId,
  spriteScale: DEFAULT_ARENA_PLAYER_RENDER_SCALE,
  stickScale: DEFAULT_ARENA_STICK_RENDER_SCALE,
  stickAngle: 0,
  stickLayerMode: 'automatic' as ArenaStickLayerMode,
  corePocketAttachment: true,
  coreSpin: true,
  chargeVfx: true,
  animationSpeed: 1,
} as const

export function resolveArenaStickTransform(
  definition: ArenaStickDefinition,
  mountTarget: Point,
  aimAngle: number,
  mirrorSign: -1 | 1,
  renderScale = definition.displayScale,
  pocketTarget?: Point,
  alignPocket = false,
): ArenaStickTransform {
  let rotation =
    aimAngle -
    definition.authoredForwardAngle +
    definition.defaultAngle +
    definition.attachmentCorrection.angle * mirrorSign
  const scale = renderScale * definition.attachmentCorrection.scale
  let position = { ...mountTarget }

  if (alignPocket && pocketTarget) {
    const targetX = pocketTarget.x - mountTarget.x
    const targetY = pocketTarget.y - mountTarget.y
    const authoredX =
      definition.pocketAnchor.x - definition.rotationPivot.x
    const authoredY =
      (definition.pocketAnchor.y - definition.rotationPivot.y) *
      mirrorSign
    const targetLength = Math.hypot(targetX, targetY)
    const authoredLength = Math.hypot(authoredX, authoredY)

    if (targetLength > 0.001 && authoredLength > 0.001) {
      rotation =
        Math.atan2(targetY, targetX) -
        Math.atan2(authoredY, authoredX)
    }

    const pocketOffset = transformLocalOffset(
      definition.pocketAnchor,
      definition.rotationPivot,
      rotation,
      scale,
      mirrorSign,
    )
    position = {
      x: pocketTarget.x - pocketOffset.x,
      y: pocketTarget.y - pocketOffset.y,
    }
  }

  const anchor = (point: Point): Point => {
    const offset = transformLocalOffset(
      point,
      definition.rotationPivot,
      rotation,
      scale,
      mirrorSign,
    )

    return {
      x: position.x + offset.x,
      y: position.y + offset.y,
    }
  }

  return {
    position,
    rotation,
    scaleX: scale,
    scaleY: scale * mirrorSign,
    grip: anchor(definition.gripAnchor),
    pivot: anchor(definition.rotationPivot),
    pocket: anchor(definition.pocketAnchor),
    tip: anchor(definition.tipAnchor),
  }
}

export function resolveArenaCoreVisualState(input: {
  possessed: boolean
  charge: number
  fullyCharged: boolean
  released: boolean
  disrupted: boolean
}): ArenaCoreVisualState {
  if (input.disrupted) {
    return 'disrupted'
  }
  if (input.released) {
    return 'released'
  }
  if (input.fullyCharged) {
    return 'fullyCharged'
  }
  if (input.possessed && input.charge > 0.01) {
    return 'charging'
  }
  if (input.possessed) {
    return 'possessed'
  }
  return 'free'
}

function transformLocalOffset(
  point: Point,
  pivot: Point,
  rotation: number,
  scale: number,
  mirrorSign: -1 | 1,
): Point {
  const localX = (point.x - pivot.x) * scale
  const localY = (point.y - pivot.y) * scale * mirrorSign
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)

  return {
    x: localX * cosine - localY * sine,
    y: localX * sine + localY * cosine,
  }
}
