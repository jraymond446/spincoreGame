import { arenaConfig } from '../config/arenaConfig'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { goalConfigs } from '../config/goalConfig'
import { keeperAreaConfig } from '../config/keeperAreaConfig'
import { viewConfig } from '../config/viewConfig'
import { wallConfig } from '../config/wallConfig'
import type { TeamSide } from '../data/matchTypes'

export type ArenaPoint = { x: number; y: number }

export type ArenaRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ArenaLine = {
  start: ArenaPoint
  end: ArenaPoint
}

export type ArenaBoundaryWall = ArenaRect & {
  side: 'top' | 'bottom' | 'left' | 'right'
}

export type ArenaSeatingSection = {
  id: string
  bounds: ArenaRect
  facing: 'up' | 'down' | 'left' | 'right'
  rowSpacing: number
  seatSpacing: number
  depthScale: number
}

export type ArenaLayout = {
  world: {
    width: number
    height: number
  }
  venueBounds: ArenaRect
  court: ArenaRect
  center: ArenaPoint
  midfieldLine: ArenaLine
  centerCircle: {
    center: ArenaPoint
    radius: number
  }
  goals: Array<{
    id: string
    center: ArenaPoint
    length: number
    orientation: 'horizontal' | 'vertical'
    defendingTeam: TeamSide
    scoringTeam: TeamSide
  }>
  keeperAreas: Record<
    TeamSide,
    { center: ArenaPoint; outerRadius: number; innerRadius: number }
  >
  boundaryWalls: ArenaBoundaryWall[]
  crestPlacement: ArenaRect
  scoreboardPlacement: ArenaRect
  seatingSections: ArenaSeatingSection[]
}

export function createArenaLayout(): ArenaLayout {
  const court: ArenaRect = {
    x: arenaConfig.center.x - arenaConfig.width / 2,
    y: arenaConfig.center.y - arenaConfig.height / 2,
    width: arenaConfig.width,
    height: arenaConfig.height,
  }
  const margin = arenaPresentationConfig.sidelineDecorationWidth
  const topSeatingDepth = 78
  const bottomSeatingDepth = 142
  const crestSize = Math.min(280, court.width * 0.26)

  return {
    world: {
      width: viewConfig.width,
      height: viewConfig.height,
    },
    venueBounds: {
      x: court.x - margin,
      y: court.y - topSeatingDepth,
      width: court.width + margin * 2,
      height: court.height + topSeatingDepth + bottomSeatingDepth,
    },
    court,
    center: { ...arenaConfig.center },
    midfieldLine: {
      start: { x: court.x + arenaConfig.courtInset, y: arenaConfig.center.y },
      end: {
        x: court.x + court.width - arenaConfig.courtInset,
        y: arenaConfig.center.y,
      },
    },
    centerCircle: {
      center: { ...arenaConfig.center },
      radius: arenaConfig.centerCircleRadius,
    },
    goals: goalConfigs.map((goal) => ({
      id: goal.id,
      center: { x: goal.x, y: goal.y },
      length: goal.length,
      orientation: goal.orientation,
      defendingTeam: goal.defendingTeam,
      scoringTeam: goal.scoringTeam,
    })),
    keeperAreas: {
      A: {
        center: { ...keeperAreaConfig.areas.A },
        outerRadius: keeperAreaConfig.keeperZoneRadius,
        innerRadius: keeperAreaConfig.innerNoBodyRadius,
      },
      B: {
        center: { ...keeperAreaConfig.areas.B },
        outerRadius: keeperAreaConfig.keeperZoneRadius,
        innerRadius: keeperAreaConfig.innerNoBodyRadius,
      },
    },
    boundaryWalls: createBoundaryWalls(court, wallConfig.wallThickness),
    crestPlacement: {
      x: arenaConfig.center.x - crestSize / 2,
      y: arenaConfig.center.y - crestSize / 2,
      width: crestSize,
      height: crestSize,
    },
    scoreboardPlacement: {
      x: 0,
      y: 0,
      width: viewConfig.width,
      height: arenaPresentationConfig.scoreboardHeight,
    },
    seatingSections: createSeatingSections(court, margin),
  }
}

function createBoundaryWalls(
  court: ArenaRect,
  thickness: number,
): ArenaBoundaryWall[] {
  return [
    {
      side: 'top',
      x: court.x,
      y: court.y - thickness,
      width: court.width,
      height: thickness,
    },
    {
      side: 'bottom',
      x: court.x,
      y: court.y + court.height,
      width: court.width,
      height: thickness,
    },
    {
      side: 'left',
      x: court.x - thickness,
      y: court.y - thickness,
      width: thickness,
      height: court.height + thickness * 2,
    },
    {
      side: 'right',
      x: court.x + court.width,
      y: court.y - thickness,
      width: thickness,
      height: court.height + thickness * 2,
    },
  ]
}

function createSeatingSections(
  court: ArenaRect,
  margin: number,
): ArenaSeatingSection[] {
  const sideWidth = Math.max(80, margin - 56)
  const leftX = court.x - margin + 20
  const rightX = court.x + court.width + 36
  const section = (
    id: string,
    bounds: ArenaRect,
    facing: ArenaSeatingSection['facing'],
    depthScale = 0.14,
  ): ArenaSeatingSection => ({
    id,
    bounds,
    facing,
    rowSpacing: 29,
    seatSpacing: 27,
    depthScale,
  })

  return [
    section(
      'left-upper',
      { x: leftX, y: court.y + court.height * 0.065, width: sideWidth, height: court.height * 0.245 },
      'right',
    ),
    section(
      'left-middle',
      { x: leftX, y: court.y + court.height * 0.335, width: sideWidth, height: court.height * 0.14 },
      'right',
    ),
    section(
      'left-lower',
      { x: leftX, y: court.y + court.height * 0.68, width: sideWidth, height: court.height * 0.25 },
      'right',
    ),
    section(
      'right-upper',
      { x: rightX, y: court.y + court.height * 0.065, width: sideWidth, height: court.height * 0.245 },
      'left',
    ),
    section(
      'right-middle',
      { x: rightX, y: court.y + court.height * 0.335, width: sideWidth, height: court.height * 0.14 },
      'left',
    ),
    section(
      'right-lower',
      { x: rightX, y: court.y + court.height * 0.68, width: sideWidth, height: court.height * 0.25 },
      'left',
    ),
    section(
      'south-stand',
      {
        x: court.x - margin + 42,
        y: court.y + court.height + 48,
        width: court.width + margin * 2 - 84,
        height: 112,
      },
      'up',
      0.2,
    ),
  ]
}
