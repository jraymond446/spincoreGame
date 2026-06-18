import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects'
import type { Coach } from './coachCatalog'
import {
  getCreatedPlayerRosterSlot,
  getTeamRosterSlotProfile,
} from './teamRoster'
import type { League } from '../league/leagueTypes'
import type { SaveGame, TeamRosterSlotId } from '../save/saveTypes'
import { teamRosterSlotIds } from '../save/saveTypes'

export type SalaryLine = {
  id: string
  label: string
  role: string
  salary: number
  committed: boolean
}

export type TeamFinanceSnapshot = {
  baseCap: number
  sponsorBonus: number
  salaryCap: number
  payroll: number
  capRoom: number
  salaryLines: SalaryLine[]
  sponsorName: string
}

const leagueSalaryCaps: Record<string, number> = {
  rookie_circuit: 650,
  metro_circuit: 1050,
  pro_circuit: 1650,
  apex_league: 2600,
}

const sponsorCapBonuses: Record<string, { name: string; capBonus: number }> = {
  riverfoam: {
    name: 'Riverfoam Local',
    capBonus: 120,
  },
  walltech: {
    name: 'WallTech Gear',
    capBonus: 240,
  },
  apex_media: {
    name: 'Apex Media',
    capBonus: 420,
  },
}

export function getTeamFinance(
  save: SaveGame,
  league: League,
  coach: Coach,
): TeamFinanceSnapshot {
  const baseCap = leagueSalaryCaps[league.id] ?? leagueSalaryCaps.rookie_circuit
  const sponsor = save.team.sponsorId
    ? sponsorCapBonuses[save.team.sponsorId]
    : null
  const sponsorBonus = sponsor?.capBonus ?? 0
  const salaryLines = createSalaryLines(save, coach)
  const payroll = salaryLines.reduce(
    (total, line) => total + (line.committed ? line.salary : 0),
    0,
  )
  const salaryCap = baseCap + sponsorBonus

  return {
    baseCap,
    sponsorBonus,
    salaryCap,
    payroll,
    capRoom: salaryCap - payroll,
    salaryLines,
    sponsorName: sponsor?.name ?? 'No Sponsor',
  }
}

function createSalaryLines(save: SaveGame, coach: Coach): SalaryLine[] {
  const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)
  const rosterLines = teamRosterSlotIds.map((slotId) => {
    if (slotId === createdPlayerSlotId) {
      return {
        id: slotId,
        label: save.player.name,
        role: save.player.primaryRole,
        salary: createdPlayerSalary(save),
        committed: true,
      }
    }

    const profile = getTeamRosterSlotProfile(save, slotId)
    return {
      id: slotId,
      label: profile.name,
      role: profile.role,
      salary: temporaryRosterSalary(slotId),
      committed: true,
    }
  })

  return [
    ...rosterLines,
    {
      id: 'coach',
      label: coach.name,
      role: 'coach',
      salary: coach.salary,
      committed: true,
    },
  ]
}

function temporaryRosterSalary(slotId: TeamRosterSlotId): number {
  return slotId === 'a-keeper' ? 65 : 60
}

function createdPlayerSalary(save: SaveGame): number {
  const averageAttribute = average(
    Object.values(getEffectivePlayerAttributes(save)),
  )
  return Math.round(80 + save.progression.level * 12 + averageAttribute * 4)
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}
