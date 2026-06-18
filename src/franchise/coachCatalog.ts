import type { TeamStrategy } from '../game/tactics/TeamStrategy'
import type { PlayerAttributeKey } from '../save/saveTypes'

export type CoachTier =
  | 'local'
  | 'rising'
  | 'veteran'
  | 'elite'
  | 'legend'

export type CoachAttributeKey =
  | 'offense'
  | 'defense'
  | 'perkSynergy'
  | 'sponsorAppeal'
  | 'lockerRoom'

export type Coach = {
  id: string
  name: string
  title: string
  tier: CoachTier
  salary: number
  strategy: TeamStrategy
  attributes: Record<CoachAttributeKey, number>
  boosts: Partial<Record<PlayerAttributeKey, number>>
  traits: string[]
  summary: string
}

export const coachCatalog: Coach[] = [
  {
    id: 'mara-voss',
    name: 'Mara Voss',
    title: 'Outlet Architect',
    tier: 'rising',
    salary: 120,
    strategy: {
      formation: 'balanced',
      offenseScheme: 'balanced',
      defenseScheme: 'zoneTriangle',
      transitionScheme: 'safeOutlet',
    },
    attributes: {
      offense: 13,
      defense: 12,
      perkSynergy: 14,
      sponsorAppeal: 10,
      lockerRoom: 15,
    },
    boosts: {
      reaction: 1,
      shotAccuracy: 1,
    },
    traits: ['Clean outlets', 'Perk teacher', 'Low-drama room'],
    summary:
      'A calm starter coach who teaches spacing, outlets, and simple bank reads.',
  },
  {
    id: 'juno-crest',
    name: 'Juno Crest',
    title: 'Give-and-Go Evangelist',
    tier: 'veteran',
    salary: 260,
    strategy: {
      formation: 'aggressive',
      offenseScheme: 'giveAndGo',
      defenseScheme: 'manMark',
      transitionScheme: 'counterAttack',
    },
    attributes: {
      offense: 19,
      defense: 11,
      perkSynergy: 17,
      sponsorAppeal: 18,
      lockerRoom: 12,
    },
    boosts: {
      speed: 1,
      shotAccuracy: 2,
    },
    traits: ['Fast cuts', 'Sponsor friendly', 'Risky counters'],
    summary:
      'A stylish attack coach built for quick passing, cuts, and highlight clips.',
  },
  {
    id: 'brick-sato',
    name: 'Brick Sato',
    title: 'Crease Warden',
    tier: 'veteran',
    salary: 240,
    strategy: {
      formation: 'brutePress',
      offenseScheme: 'crashNet',
      defenseScheme: 'bruteShadow',
      transitionScheme: 'pressAfterLoss',
    },
    attributes: {
      offense: 12,
      defense: 20,
      perkSynergy: 13,
      sponsorAppeal: 8,
      lockerRoom: 16,
    },
    boosts: {
      toughness: 2,
      shotPower: 1,
    },
    traits: ['Contact culture', 'Keeper shield work', 'Heavy pressure'],
    summary:
      'A defensive bruiser who turns loose cores into collisions and short clears.',
  },
  {
    id: 'iona-quill',
    name: 'Iona Quill',
    title: 'Bank Shot Scholar',
    tier: 'elite',
    salary: 520,
    strategy: {
      formation: 'staggeredLeft',
      offenseScheme: 'bankHunter',
      defenseScheme: 'trapBehindGoal',
      transitionScheme: 'regroup',
    },
    attributes: {
      offense: 23,
      defense: 17,
      perkSynergy: 24,
      sponsorAppeal: 16,
      lockerRoom: 14,
    },
    boosts: {
      shotSpin: 2,
      shotAccuracy: 2,
    },
    traits: ['Wall angles', 'Enhanced perk synergy', 'Patient offense'],
    summary:
      'An elite tactician for teams that want the walls to feel like extra teammates.',
  },
]

export const starterCoachId = 'mara-voss'
export const coachMarketIds = [
  'mara-voss',
  'juno-crest',
  'brick-sato',
] as const

export function getCoach(id: string | null | undefined): Coach {
  return (
    coachCatalog.find((coach) => coach.id === id) ??
    coachCatalog.find((coach) => coach.id === starterCoachId) ??
    coachCatalog[0]
  )
}

export function getCoachMarket(): Coach[] {
  return coachMarketIds.map((id) => getCoach(id))
}
