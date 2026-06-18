import {
  starterCoachId,
} from './coachCatalog.ts'
import {
  createDefaultRosterAssignments,
  createDefaultRosterLoadouts,
} from './teamRoster.ts'
import type {
  CreatedPlayer,
  TeamColorKey,
  TeamIdentity,
} from '../save/saveTypes'

export const teamColorOptions: Array<{
  value: TeamColorKey
  label: string
  hex: string
}> = [
  { value: 'teal', label: 'River Teal', hex: '#2d938e' },
  { value: 'blue', label: 'Circuit Blue', hex: '#198bd5' },
  { value: 'rose', label: 'Neon Rose', hex: '#e54872' },
  { value: 'gold', label: 'Solar Gold', hex: '#f2c84b' },
  { value: 'purple', label: 'Wall Purple', hex: '#7868ba' },
  { value: 'green', label: 'Locker Green', hex: '#35a970' },
  { value: 'orange', label: 'Crash Orange', hex: '#e78c3f' },
  { value: 'navy', label: 'Deep Navy', hex: '#16324f' },
]

export function createDefaultTeamIdentity(
  player: Pick<CreatedPlayer, 'name'>,
): TeamIdentity {
  return {
    name: `${player.name}'s Club`,
    colors: {
      primary: 'teal',
      secondary: 'gold',
      homeField: 'blue',
    },
    sponsorId: null,
    coachId: starterCoachId,
    rosterAssignments: createDefaultRosterAssignments(),
    rosterLoadouts: createDefaultRosterLoadouts(),
  }
}

export function teamColorHex(color: TeamColorKey): string {
  return (
    teamColorOptions.find((option) => option.value === color)?.hex ??
    teamColorOptions[0].hex
  )
}

export function teamColorLabel(color: TeamColorKey): string {
  return (
    teamColorOptions.find((option) => option.value === color)?.label ??
    teamColorOptions[0].label
  )
}
