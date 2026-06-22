import type {
  FormationId,
  PlayerAttributes,
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
  StickStyle,
  TeamTacticalQuality,
} from './matchTypes'
import type { TeamStrategy } from '../tactics/TeamStrategy'
import {
  generateAppearanceForId,
} from '../../player/generateRandomAppearance.ts'
import type { PlayerAppearance } from '../../player/playerAppearanceTypes.ts'

export type OpponentPlayer = {
  id: string
  name: string
  jerseyNumber: number
  role: PlayerRole
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  stickStyle: StickStyle
  attributes: PlayerAttributes
  appearance: PlayerAppearance
}

export type OpponentTeam = {
  id: string
  name: string
  shortName: string
  primaryColor: number
  secondaryColor: number
  difficulty: number
  formation: FormationId
  strategy: TeamStrategy
  tacticalQuality: TeamTacticalQuality
  players: OpponentPlayer[]
}

export const opponentTeams: OpponentTeam[] = [
  {
    id: 'rookie-scrappers',
    name: 'Rookie Scrappers',
    shortName: 'SCR',
    primaryColor: 0x43a7d8,
    secondaryColor: 0xffd34f,
    difficulty: 1,
    formation: 'balanced',
    strategy: {
      formation: 'balanced',
      offenseScheme: 'balanced',
      defenseScheme: 'zoneTriangle',
      transitionScheme: 'balanced',
    },
    tacticalQuality: quality(0.52),
    players: roster('scrap', {
      keeper: [46, 48, 44, 38, 58, 52, 48, 58, 52, 58],
      support: [54, 56, 58, 46, 50, 44, 54, 54, 58, 45],
      striker: [58, 53, 44, 59, 42, 54, 55, 52, 52, 46],
    }),
  },
  {
    id: 'wall-rats',
    name: 'Wall Rats',
    shortName: 'RAT',
    primaryColor: 0x2d7472,
    secondaryColor: 0xf2c84b,
    difficulty: 2,
    formation: 'staggeredLeft',
    strategy: {
      formation: 'staggeredLeft',
      offenseScheme: 'bankHunter',
      defenseScheme: 'zoneTriangle',
      transitionScheme: 'counterAttack',
    },
    tacticalQuality: quality(0.63),
    players: roster('wall', {
      keeper: [52, 55, 52, 38, 64, 55, 58, 66, 58, 60],
      support: [62, 64, 62, 55, 54, 48, 70, 60, 66, 48],
      striker: [66, 62, 50, 68, 45, 58, 72, 61, 62, 50],
    }),
  },
  {
    id: 'crease-crashers',
    name: 'Crease Crashers',
    shortName: 'CRC',
    primaryColor: 0xe46947,
    secondaryColor: 0x173653,
    difficulty: 3,
    formation: 'brutePress',
    strategy: {
      formation: 'brutePress',
      offenseScheme: 'crashNet',
      defenseScheme: 'highPress',
      transitionScheme: 'pressAfterLoss',
    },
    tacticalQuality: quality(0.7),
    players: roster('crash', {
      keeper: [54, 52, 42, 36, 72, 68, 50, 72, 54, 76],
      brute: [60, 48, 42, 61, 76, 82, 48, 62, 48, 84],
      striker: [68, 60, 48, 72, 52, 72, 64, 62, 58, 66],
    }),
  },
  {
    id: 'canal-sparks',
    name: 'Canal Sparks',
    shortName: 'SPK',
    primaryColor: 0xf2c84b,
    secondaryColor: 0x198bd5,
    difficulty: 3,
    formation: 'aggressive',
    strategy: {
      formation: 'aggressive',
      offenseScheme: 'giveAndGo',
      defenseScheme: 'manMark',
      transitionScheme: 'counterAttack',
    },
    tacticalQuality: quality(0.68),
    players: roster('spark', {
      keeper: [52, 60, 58, 40, 66, 50, 62, 70, 62, 58],
      support: [70, 72, 76, 58, 58, 50, 72, 68, 76, 52],
      striker: [76, 70, 60, 76, 54, 64, 76, 68, 72, 54],
    }),
  },
  {
    id: 'net-ghosts',
    name: 'Net Ghosts',
    shortName: 'NGH',
    primaryColor: 0x7868ba,
    secondaryColor: 0x8df0cf,
    difficulty: 4,
    formation: 'staggeredRight',
    strategy: {
      formation: 'staggeredRight',
      offenseScheme: 'behindNet',
      defenseScheme: 'trapBehindGoal',
      transitionScheme: 'safeOutlet',
    },
    tacticalQuality: quality(0.79),
    players: roster('ghost', {
      keeper: [60, 68, 64, 38, 78, 60, 72, 82, 72, 70],
      support: [72, 82, 84, 62, 68, 54, 80, 76, 84, 58],
      striker: [78, 76, 66, 82, 58, 68, 82, 76, 76, 60],
    }),
  },
  {
    id: 'apex-circuit',
    name: 'Apex Circuit',
    shortName: 'APX',
    primaryColor: 0xe54872,
    secondaryColor: 0x78e5ff,
    difficulty: 5,
    formation: 'aggressive',
    strategy: {
      formation: 'aggressive',
      offenseScheme: 'giveAndGo',
      defenseScheme: 'manMark',
      transitionScheme: 'counterAttack',
    },
    tacticalQuality: quality(0.9),
    players: roster('apex', {
      keeper: [74, 78, 74, 48, 88, 72, 80, 92, 78, 84],
      support: [84, 90, 92, 76, 80, 70, 88, 86, 91, 72],
      striker: [92, 86, 78, 94, 70, 84, 92, 88, 86, 76],
    }),
  },
]

type AttributeTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

function roster(
  prefix: string,
  values: {
    keeper: AttributeTuple
    striker: AttributeTuple
    support?: AttributeTuple
    brute?: AttributeTuple
  },
): OpponentPlayer[] {
  const flexRole: PlayerRole = values.brute ? 'brute' : 'support'
  const flexValues = values.brute ?? values.support

  if (!flexValues) {
    throw new Error(`Opponent roster ${prefix} is missing a flex player.`)
  }

  return [
    player(prefix, 'keeper', values.keeper, 1),
    player(prefix, flexRole, flexValues, 7),
    player(prefix, 'striker', values.striker, 13),
  ]
}

function player(
  prefix: string,
  role: PlayerRole,
  values: AttributeTuple,
  jerseyNumber: number,
): OpponentPlayer {
  return {
    id: `${prefix}-${role}`,
    name: `${titleCase(prefix)} ${titleCase(role)}`,
    jerseyNumber,
    role,
    handedness: role === 'striker' ? 'left' : 'right',
    playStyle:
      role === 'keeper'
        ? 'tight'
        : role === 'brute'
          ? 'disruptive'
          : role === 'support'
            ? 'creative'
            : 'direct',
    stickStyle:
      role === 'keeper'
        ? 'cradle'
        : role === 'brute'
          ? 'hammer'
          : role === 'support'
            ? 'cradle'
            : 'whip',
    attributes: tupleToAttributes(values),
    appearance: generateAppearanceForId(`${prefix}-${role}`),
  }
}

function tupleToAttributes(values: AttributeTuple): PlayerAttributes {
  const runtime = values.map((value) => 0.2 + value / 100)

  return {
    speed: runtime[0],
    control: runtime[1],
    passing: runtime[2],
    shooting: runtime[3],
    defense: runtime[4],
    power: runtime[5],
    accuracy: runtime[6],
    reaction: runtime[7],
    ballHandling: runtime[8],
    toughness: runtime[9],
  }
}

function quality(value: number): TeamTacticalQuality {
  return {
    teamTacticalRating: value,
    offenseSchemeQuality: value,
    defenseSchemeQuality: value,
    transitionQuality: value,
  }
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
