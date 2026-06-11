import type {
  CreatedPlayer,
  CreatedPlayerAttributes,
  PlayerAttributeKey,
  PlayerVisualPreset,
  SaveGame,
} from './saveTypes'
import { playerAttributeKeys } from './saveTypes'

const roles = ['keeper', 'striker', 'support', 'brute'] as const
const handedness = ['left', 'right'] as const
const visualPresets: PlayerVisualPreset[] = [
  'circuitBlue',
  'solarGold',
  'neonRose',
  'deepCourt',
]

export function migrateSave(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw
  }

  if (raw.version === 1) {
    return raw
  }

  return raw
}

export function validateSave(raw: unknown): SaveGame | null {
  try {
    const migrated = migrateSave(raw)

    if (!isRecord(migrated) || migrated.version !== 1) {
      throw new Error('Unsupported or missing save version.')
    }

    const player = validatePlayer(migrated.player)

    if (!player) {
      throw new Error('Created player data is missing or invalid.')
    }

    const wallet = record(migrated.wallet)
    const progression = record(migrated.progression)
    const equipment = record(migrated.equipment)
    const equipped = record(equipment.equipped)
    const league = record(migrated.league)
    const leagueRecord = record(league.record)
    const stats = record(migrated.stats)
    const settings = record(migrated.settings)
    const timestamp = new Date().toISOString()

    return {
      version: 1,
      createdAt: dateString(migrated.createdAt, timestamp),
      updatedAt: dateString(migrated.updatedAt, timestamp),
      player,
      wallet: {
        money: integer(wallet.money, 0, 999_999_999, 0),
      },
      progression: {
        xp: integer(progression.xp, 0, 999_999_999, 0),
        level: integer(progression.level, 1, 999, 1),
        unspentAttributePoints: integer(
          progression.unspentAttributePoints,
          0,
          999,
          0,
        ),
      },
      equipment: {
        equipped: {
          stickId: nullableString(equipped.stickId),
          shieldId: nullableString(equipped.shieldId),
          shoesId: nullableString(equipped.shoesId),
        },
        inventory: stringArray(equipment.inventory),
      },
      league: {
        currentLeagueId: nullableString(league.currentLeagueId),
        unlockedLeagueIds: stringArray(league.unlockedLeagueIds),
        record: {
          wins: integer(leagueRecord.wins, 0, 999_999, 0),
          losses: integer(leagueRecord.losses, 0, 999_999, 0),
        },
      },
      stats: {
        matchesPlayed: integer(stats.matchesPlayed, 0, 999_999, 0),
        goals: integer(stats.goals, 0, 999_999, 0),
        assists: integer(stats.assists, 0, 999_999, 0),
        shots: integer(stats.shots, 0, 999_999, 0),
        bankShotGoals: integer(stats.bankShotGoals, 0, 999_999, 0),
        steals: integer(stats.steals, 0, 999_999, 0),
        saves: integer(stats.saves, 0, 999_999, 0),
        turnovers: integer(stats.turnovers, 0, 999_999, 0),
      },
      settings: {
        createdPlayerComplete:
          typeof settings.createdPlayerComplete === 'boolean'
            ? settings.createdPlayerComplete
            : true,
      },
    }
  } catch (error) {
    console.warn('[Save Validation Error]', error)
    return null
  }
}

function validatePlayer(raw: unknown): CreatedPlayer | null {
  if (!isRecord(raw)) {
    return null
  }

  const name =
    typeof raw.name === 'string'
      ? raw.name.trim().slice(0, 24)
      : ''
  const role = roles.find((candidate) => candidate === raw.primaryRole)
  const hand = handedness.find((candidate) => candidate === raw.handedness)
  const visualPreset = visualPresets.find(
    (candidate) => candidate === raw.visualPreset,
  )

  if (!name || !role || !hand) {
    return null
  }

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim().slice(0, 80)
        : 'created-player',
    name,
    jerseyNumber: integer(raw.jerseyNumber, 0, 99, 0),
    handedness: hand,
    primaryRole: role,
    visualPreset: visualPreset ?? 'circuitBlue',
    attributes: validateAttributes(raw.attributes),
  }
}

function validateAttributes(raw: unknown): CreatedPlayerAttributes {
  const values = record(raw)
  const attributes = {} as CreatedPlayerAttributes

  for (const key of playerAttributeKeys) {
    attributes[key] = integer(values[key], 1, 99, 50)
  }

  return attributes
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function integer(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  const numeric = typeof value === 'number' ? value : Number.NaN

  return Number.isFinite(numeric)
    ? Math.round(Math.min(maximum, Math.max(minimum, numeric)))
    : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 100)
    : null
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().slice(0, 100))
        .filter(Boolean),
    ),
  ]
}

function dateString(value: unknown, fallback: string): string {
  if (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  ) {
    return value
  }

  return fallback
}

export function clampAttribute(
  key: PlayerAttributeKey,
  value: number,
): number {
  void key
  return Math.min(99, Math.max(1, Math.round(value)))
}

