import type {
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
} from '../game/data/matchTypes'
import type {
  CreatedPlayerAttributes,
} from '../save/saveTypes'

export type FreeAgent = {
  id: string
  name: string
  jerseyNumber: number
  role: PlayerRole
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  salary: number
  attributes: CreatedPlayerAttributes
  traits: string[]
  summary: string
}

export const freeAgentCatalog: FreeAgent[] = [
  {
    id: 'tavi-rush',
    name: 'Tavi Rush',
    jerseyNumber: 8,
    role: 'striker',
    handedness: 'right',
    playStyle: 'direct',
    salary: 135,
    attributes: {
      speed: 17,
      reaction: 14,
      shotPower: 16,
      shotAccuracy: 15,
      shotSpin: 12,
      toughness: 10,
    },
    traits: ['Fast cutter', 'Direct release', 'Needs protection'],
    summary:
      'A cheap scoring runner who turns clean outlets into quick pressure.',
  },
  {
    id: 'miko-banks',
    name: 'Miko Banks',
    jerseyNumber: 41,
    role: 'support',
    handedness: 'left',
    playStyle: 'creative',
    salary: 155,
    attributes: {
      speed: 13,
      reaction: 16,
      shotPower: 11,
      shotAccuracy: 17,
      shotSpin: 18,
      toughness: 11,
    },
    traits: ['Wall reader', 'Outlet passer', 'Light contact'],
    summary:
      'A support specialist for teams that want cleaner banks and quick feeds.',
  },
  {
    id: 'rhea-stone',
    name: 'Rhea Stone',
    jerseyNumber: 1,
    role: 'keeper',
    handedness: 'right',
    playStyle: 'tight',
    salary: 170,
    attributes: {
      speed: 11,
      reaction: 19,
      shotPower: 13,
      shotAccuracy: 14,
      shotSpin: 12,
      toughness: 18,
    },
    traits: ['Stable crease', 'Hard clears', 'Calm rebounds'],
    summary:
      'A reliable keeper upgrade who keeps the floor under control.',
  },
]

export function getFreeAgent(
  id: string | null | undefined,
): FreeAgent | null {
  return freeAgentCatalog.find((agent) => agent.id === id) ?? null
}
