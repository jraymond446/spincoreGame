import { opponentTeams } from '../data/opponentTeams'
import type { TeamSide } from '../data/matchTypes'
import { getLabState } from '../lab/LabState'
import type { ArenaCrestMode } from '../lab/LabConfig'
import { getMatchLaunchConfig } from '../../match/MatchLaunchConfig'
import { teamColorHex } from '../../franchise/teamIdentity'
import {
  calculateAttendance,
  stableSeed,
  type AttendanceResult,
} from './ArenaAttendance'
import { parseHexColor } from './ArenaAppearanceBridge'
import type { ArenaTheme, ArenaThemeId } from './ArenaTheme'

export type ArenaTeamPresentation = {
  id: string
  name: string
  shortName: string
  primaryColor: number
  accentColor: number
  crestMode: ArenaCrestMode
  crestAsset: {
    key: string
    path: string
  }
}

export type ArenaMatchPresentation = {
  themeId: ArenaThemeId
  teams: Record<TeamSide, ArenaTeamPresentation>
  attendance: AttendanceResult
  crowdSeed: number
  geometryOverlay: boolean
  crowdAnimation: boolean
  reducedMotion: boolean
}

export function resolveArenaPresentation(
  theme: ArenaTheme,
): ArenaMatchPresentation {
  const launch = getMatchLaunchConfig()
  const lab = getLabState().arenaVisual
  const save = launch.saveGameSnapshot
  const isLab = launch.mode === 'lab'
  const home = isLab
    ? resolveLabTeam(lab.homeTeamId, 'A')
    : {
        id: save?.player.id ?? 'team-a',
        name: save?.team.name ?? 'Team A',
        shortName: initials(save?.team.name ?? 'Team A'),
        primaryColor: parseHexColor(
          save ? teamColorHex(save.team.colors.primary) : '#25b9c7',
          0x25b9c7,
        ),
        accentColor: parseHexColor(
          save ? teamColorHex(save.team.colors.secondary) : '#f2c84b',
          0xf2c84b,
        ),
      }
  const launchedOpponent =
    launch.opponentTeam ??
    opponentTeams.find((team) => team.id === launch.opponentTeamId)
  const away = isLab
    ? resolveLabTeam(lab.awayTeamId, 'B')
    : launchedOpponent
      ? {
          id: launchedOpponent.id,
          name: launchedOpponent.name,
          shortName: launchedOpponent.shortName,
          primaryColor: launchedOpponent.primaryColor,
          accentColor: launchedOpponent.secondaryColor,
        }
      : resolveLabTeam('rookie-scrappers', 'B')

  if (isLab) {
    home.primaryColor = parseHexColor(lab.homePrimaryColor, home.primaryColor)
    home.accentColor = parseHexColor(lab.homeAccentColor, home.accentColor)
    away.primaryColor = parseHexColor(lab.awayPrimaryColor, away.primaryColor)
    away.accentColor = parseHexColor(lab.awayAccentColor, away.accentColor)
  }

  const specialMatch = Boolean(
    !isLab &&
      launch.mode === 'league' &&
      save &&
      save.league.rookieCircuit.currentOpponentIndex >= 5,
  )
  const calculated = calculateAttendance({
    wins: save?.league.record.wins ?? 0,
    losses: save?.league.record.losses ?? 0,
    baseAttendance: theme.baseAttendance,
    specialMatch,
  })
  const attendance =
    isLab && !lab.calculatedAttendance
      ? { ...calculated, attendanceRate: lab.manualAttendance }
      : calculated
  const seedText = [
    launch.mode,
    save?.createdAt ?? 'lab',
    home.id,
    away.id,
    save?.league.rookieCircuit.currentOpponentIndex ?? 0,
  ].join(':')

  return {
    themeId: isLab ? lab.themeId : theme.id,
    teams: {
      A: withCrest(home, isLab ? lab.homeCrestMode : 'team'),
      B: withCrest(away, 'team'),
    },
    attendance,
    crowdSeed: stableSeed(seedText),
    geometryOverlay: isLab && lab.geometryOverlay,
    crowdAnimation: !isLab || lab.crowdAnimation,
    reducedMotion:
      (isLab && lab.reducedMotion) || prefersReducedMotion(),
  }
}

export function getArenaTeamOptions(): Array<{
  value: string
  label: string
}> {
  return [
    { value: 'team-a', label: 'Team A / Career Club' },
    ...opponentTeams.map((team) => ({
      value: team.id,
      label: team.name,
    })),
  ]
}

function resolveLabTeam(
  id: string,
  side: TeamSide,
): Omit<ArenaTeamPresentation, 'crestMode' | 'crestAsset'> {
  const opponent = opponentTeams.find((team) => team.id === id)

  if (opponent) {
    return {
      id: opponent.id,
      name: opponent.name,
      shortName: opponent.shortName,
      primaryColor: opponent.primaryColor,
      accentColor: opponent.secondaryColor,
    }
  }

  return {
    id: side === 'A' ? 'team-a' : 'team-b',
    name: side === 'A' ? 'Team A' : 'Team B',
    shortName: side,
    primaryColor: side === 'A' ? 0x25b9c7 : 0xe45c72,
    accentColor: side === 'A' ? 0xf2c84b : 0x78e5ff,
  }
}

function withCrest(
  team: Omit<ArenaTeamPresentation, 'crestMode' | 'crestAsset'>,
  crestMode: ArenaCrestMode,
): ArenaTeamPresentation {
  const safeId = team.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()

  return {
    ...team,
    crestMode,
    crestAsset: {
      key: `arena-team-crest-${safeId}`,
      path: `/assets/arena/crests/${safeId}.png`,
    },
  }
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
