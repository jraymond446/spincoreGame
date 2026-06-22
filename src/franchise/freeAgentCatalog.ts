import type {
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
} from '../game/data/matchTypes'
import type {
  CreatedPlayerAttributes,
} from '../save/saveTypes'
import {
  generateAppearanceForId,
} from '../player/generateRandomAppearance.ts'
import type { PlayerAppearance } from '../player/playerAppearanceTypes.ts'

export type FreeAgent = {
  id: string
  name: string
  jerseyNumber: number
  role: PlayerRole
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  salary: number
  attributes: CreatedPlayerAttributes
  appearance: PlayerAppearance
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
    salary: 35,
    appearance: generateAppearanceForId('tavi-rush'),
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
    salary: 38,
    appearance: generateAppearanceForId('miko-banks'),
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
    salary: 42,
    appearance: generateAppearanceForId('rhea-stone'),
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
  {
    id: 'pax-vale',
    name: 'Pax Vale',
    jerseyNumber: 19,
    role: 'brute',
    handedness: 'right',
    playStyle: 'bodyguard',
    salary: 36,
    appearance: generateAppearanceForId('pax-vale'),
    attributes: {
      speed: 12,
      reaction: 13,
      shotPower: 17,
      shotAccuracy: 11,
      shotSpin: 10,
      toughness: 19,
    },
    traits: ['Cheap bruiser', 'Truck tester', 'Loose-ball pressure'],
    summary:
      'A low-cost contact fielder for bench swaps and toughness testing.',
  },
  {
    id: 'juno-reed',
    name: 'Juno Reed',
    jerseyNumber: 31,
    role: 'keeper',
    handedness: 'left',
    playStyle: 'sweeper',
    salary: 34,
    appearance: generateAppearanceForId('juno-reed'),
    attributes: {
      speed: 14,
      reaction: 16,
      shotPower: 12,
      shotAccuracy: 13,
      shotSpin: 15,
      toughness: 13,
    },
    traits: ['Cheap keeper', 'Sweeper clears', 'Bench swap tester'],
    summary:
      'A mobile reserve keeper built to prove keeper-to-keeper swaps.',
  },
]

export function getFreeAgent(
  id: string | null | undefined,
): FreeAgent | null {
  return freeAgentCatalog.find((agent) => agent.id === id) ?? null
}
