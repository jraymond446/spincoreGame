import {
  getEquipmentItem,
  isEquipmentType,
  migrateEquipmentId,
} from '../equipment/equipmentCatalog'
import { getStickType, migrateStickId } from '../equipment/stickTypes'
import {
  defaultPlayerCosmetics,
  roleForArchetype,
} from './defaultSave'
import {
  createDefaultTeamIdentity,
} from '../franchise/teamIdentity'
import {
  createDefaultRosterLoadouts,
} from '../franchise/teamRoster'
import type {
  CreatedPlayer,
  CreatedPlayerArchetype,
  CreatedPlayerAttributes,
  EquipmentSlot,
  LeagueStatLine,
  PlayerAccentColor,
  PlayerCosmetics,
  PlayerHairColor,
  PlayerHairStyle,
  PlayerShirtColor,
  PlayerSkinTone,
  PlayerStatLine,
  SaveGame,
  SeasonStats,
  TeamIdentity,
  TeamRosterLoadouts,
} from './saveTypes'
import {
  equipmentSlotKeys,
  playerAttributeDefault,
  playerAttributeMax,
  playerAttributeMin,
  playerAttributeUltraMax,
  playerArchetypeKeys,
  playerAttributeKeys,
  teamColorKeys,
  teamRosterSlotIds,
} from './saveTypes'

const roles = ['keeper', 'striker', 'support', 'brute'] as const
const handedness = ['left', 'right'] as const
const skinTones: PlayerSkinTone[] = [
  'light',
  'tan',
  'medium',
  'brown',
  'dark',
]
const hairStyles: PlayerHairStyle[] = [
  'short',
  'messy',
  'curly',
  'buzz',
  'ponytail',
  'cap',
  'bald',
]
const hairColors: PlayerHairColor[] = [
  'black',
  'brown',
  'blonde',
  'red',
  'gray',
  'blue',
  'pink',
]
const shirtColors: PlayerShirtColor[] = [
  'cyan',
  'blue',
  'red',
  'pink',
  'yellow',
  'green',
  'purple',
  'black',
  'white',
]
const accentColors: PlayerAccentColor[] = [
  'gold',
  'cyan',
  'pink',
  'navy',
  'orange',
  'lime',
]

type LegacyAttributes = Record<string, unknown>
type LegacyVisualPreset =
  | 'circuitBlue'
  | 'solarGold'
  | 'neonRose'
  | 'deepCourt'

export function migrateSave(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw
  }

  if (raw.version === 3) {
    return raw
  }

  let versionTwo: Record<string, unknown>

  if (raw.version === 2) {
    versionTwo = raw
  } else if (raw.version === 1) {
    const player = record(raw.player)
    const oldStats = record(raw.stats)
    const league = record(raw.league)
    const leagueRecord = record(league.record)
    const equipment = record(raw.equipment)
    const equipped = record(equipment.equipped)
    const selectedStickId = migrateStickId(equipped.stickId)
    const stats = migrateLegacyStats(oldStats, leagueRecord)

    versionTwo = {
      ...raw,
      version: 2,
      player: {
        ...player,
        archetype: legacyArchetype(player.primaryRole),
        cosmetics: cosmeticsFromLegacyPreset(player.visualPreset),
        attributes: migrateLegacyAttributes(record(player.attributes)),
        selectedStickId,
      },
      equipment: {
        ...equipment,
        equipped: {
          ...equipped,
          stickId: selectedStickId,
        },
        inventory: [
          ...new Set([
            ...stringArray(equipment.inventory).map(migrateStickId),
            selectedStickId,
          ]),
        ],
      },
      seasonStats: {
        seasonId: 'rookie-season-1',
        ...stats,
      },
      stats,
      leagueStats: {
        'local-circuit': {
          leagueName: 'Local Circuit',
          matchesPlayed: stats.matchesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          goals: stats.goals,
          assists: stats.assists,
          bankShotGoals: stats.bankShotGoals,
          championships: 0,
        },
      },
    }
  } else {
    return raw
  }

  return migrateVersionTwoSave(versionTwo)
}

export function validateSave(raw: unknown): SaveGame | null {
  try {
    const migrated = migrateSave(raw)

    if (!isRecord(migrated) || migrated.version !== 3) {
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
    const rookieCircuit = record(league.rookieCircuit)
    const settings = record(migrated.settings)
    const timestamp = new Date().toISOString()
    const selectedStickId = getStickType(
      migrateStickId(equipped.stickId ?? player.selectedStickId),
    ).id
    const inventory = stringArray(equipment.inventory)
      .map(migrateEquipmentId)
      .filter((id): id is string => id !== null)
    const shieldId = validateEquippedItemId(
      equipped.shieldId,
      'shield',
      inventory,
    )
    const shoesId = validateEquippedItemId(
      equipped.shoesId,
      'shoes',
      inventory,
    )
    const armorId = validateEquippedItemId(
      equipped.armorId,
      'armor',
      inventory,
    )
    const leagueStats = validateLeagueStats(migrated.leagueStats)
    const currentLeagueId = normalizeLeagueId(league.currentLeagueId)
    const defeatedOpponentTeamIds = stringArray(
      rookieCircuit.defeatedOpponentTeamIds,
    ).slice(0, 5)
    const currentOpponentIndex = integer(
      rookieCircuit.currentOpponentIndex,
      0,
      5,
      Math.min(5, defeatedOpponentTeamIds.length),
    )
    const rookieStats =
      leagueStats.rookie_circuit ??
      leagueStats['local-circuit'] ?? {
        leagueName: 'Rookie Circuit',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        bankShotGoals: 0,
        championships: 0,
      }
    delete leagueStats['local-circuit']
    leagueStats.rookie_circuit = {
      ...rookieStats,
      leagueName: 'Rookie Circuit',
    }

    const validatedInventory = [
      ...new Set([
        ...inventory,
        selectedStickId,
        ...[shieldId, shoesId, armorId].filter(
          (id): id is string => id !== null,
        ),
      ]),
    ]
    const team = validateTeamIdentity(
      migrated.team,
      player,
      validatedInventory,
    )

    return {
      version: 3,
      createdAt: dateString(migrated.createdAt, timestamp),
      updatedAt: dateString(migrated.updatedAt, timestamp),
      player: {
        ...player,
        selectedStickId,
      },
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
          stickId: selectedStickId,
          shieldId,
          shoesId,
          armorId,
        },
        inventory: validatedInventory,
      },
      team,
      league: {
        currentLeagueId,
        unlockedLeagueIds: [
          ...new Set([
            'rookie_circuit',
            ...stringArray(league.unlockedLeagueIds).map(normalizeLeagueId),
          ]),
        ],
        record: {
          wins: integer(leagueRecord.wins, 0, 999_999, 0),
          losses: integer(leagueRecord.losses, 0, 999_999, 0),
        },
        rookieCircuit: {
          currentOpponentIndex,
          defeatedOpponentTeamIds,
          completed:
            rookieCircuit.completed === true ||
            currentOpponentIndex >= 5,
        },
      },
      seasonStats: validateSeasonStats(migrated.seasonStats),
      stats: validatePlayerStats(migrated.stats),
      leagueStats,
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

function migrateVersionTwoSave(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const progression = record(raw.progression)
  const oldLevel = integer(progression.level, 1, 999, 1)
  const oldXp = integer(progression.xp, 0, 999_999_999, 0)
  const league = record(raw.league)
  const leagueStats = record(raw.leagueStats)
  const rookieStats =
    leagueStats.rookie_circuit ??
    leagueStats['local-circuit']

  return {
    ...raw,
    version: 3,
    progression: {
      ...progression,
      xp: oldLevel > 1 ? oldXp % 100 : oldXp,
      level: oldLevel,
    },
    league: {
      ...league,
      currentLeagueId: normalizeLeagueId(league.currentLeagueId),
      unlockedLeagueIds: stringArray(league.unlockedLeagueIds).map(
        normalizeLeagueId,
      ),
      rookieCircuit: {
        currentOpponentIndex: 0,
        defeatedOpponentTeamIds: [],
        completed: false,
      },
    },
    leagueStats: {
      ...leagueStats,
      ...(rookieStats
        ? {
            rookie_circuit: {
              ...record(rookieStats),
              leagueName: 'Rookie Circuit',
            },
          }
        : {}),
    },
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
  const hand = handedness.find((candidate) => candidate === raw.handedness)
  const archetype =
    playerArchetypeKeys.find(
      (candidate) => candidate === raw.archetype,
    ) ?? legacyArchetype(raw.primaryRole)

  if (!name || !hand) {
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
    primaryRole: roleForArchetype(archetype),
    archetype,
    cosmetics: validateCosmetics(raw.cosmetics),
    attributes: validateAttributes(raw.attributes),
    selectedStickId: migrateStickId(raw.selectedStickId),
  }
}

function validateAttributes(raw: unknown): CreatedPlayerAttributes {
  const values = record(raw)
  const attributes = {} as CreatedPlayerAttributes

  for (const key of playerAttributeKeys) {
    attributes[key] = normalizeAttribute(values[key])
  }

  return attributes
}

function validateCosmetics(raw: unknown): PlayerCosmetics {
  const values = record(raw)
  return {
    skinTone:
      skinTones.find((value) => value === values.skinTone) ??
      defaultPlayerCosmetics.skinTone,
    hairStyle:
      hairStyles.find((value) => value === values.hairStyle) ??
      defaultPlayerCosmetics.hairStyle,
    hairColor:
      hairColors.find((value) => value === values.hairColor) ??
      defaultPlayerCosmetics.hairColor,
    shirtColor:
      shirtColors.find((value) => value === values.shirtColor) ??
      defaultPlayerCosmetics.shirtColor,
    accentColor:
      accentColors.find((value) => value === values.accentColor) ??
      defaultPlayerCosmetics.accentColor,
    shortsColor:
      shirtColors.find((value) => value === values.shortsColor) ??
      defaultPlayerCosmetics.shortsColor,
  }
}

function validatePlayerStats(raw: unknown): PlayerStatLine {
  const stats = record(raw)
  return {
    matchesPlayed: stat(stats.matchesPlayed),
    wins: stat(stats.wins),
    losses: stat(stats.losses),
    goals: stat(stats.goals),
    assists: stat(stats.assists),
    shots: stat(stats.shots),
    bankShotGoals: stat(stats.bankShotGoals),
    saves: stat(stats.saves),
    steals: stat(stats.steals),
    turnovers: stat(stats.turnovers),
    hitsTaken: stat(stats.hitsTaken),
    slashes: stat(stats.slashes),
    successfulGathers: stat(stats.successfulGathers),
    fumbles: stat(stats.fumbles),
  }
}

function validateSeasonStats(raw: unknown): SeasonStats {
  const values = record(raw)
  return {
    seasonId:
      typeof values.seasonId === 'string' && values.seasonId.trim()
        ? values.seasonId.trim().slice(0, 80)
        : 'rookie-season-1',
    ...validatePlayerStats(values),
  }
}

function validateLeagueStats(raw: unknown): Record<string, LeagueStatLine> {
  if (!isRecord(raw)) {
    return {}
  }

  const result: Record<string, LeagueStatLine> = {}

  for (const [id, value] of Object.entries(raw)) {
    const stats = record(value)
    result[id.slice(0, 80)] = {
      leagueName:
        typeof stats.leagueName === 'string' && stats.leagueName.trim()
          ? stats.leagueName.trim().slice(0, 80)
          : id,
      matchesPlayed: stat(stats.matchesPlayed),
      wins: stat(stats.wins),
      losses: stat(stats.losses),
      goals: stat(stats.goals),
      assists: stat(stats.assists),
      bankShotGoals: stat(stats.bankShotGoals),
      championships: stat(stats.championships),
    }
  }

  return result
}

function validateTeamIdentity(
  raw: unknown,
  player: CreatedPlayer,
  inventory: string[],
): TeamIdentity {
  const fallback = createDefaultTeamIdentity(player)
  const values = record(raw)
  const colors = record(values.colors)
  const name =
    typeof values.name === 'string' && values.name.trim()
      ? values.name.trim().slice(0, 32)
      : fallback.name

  return {
    name,
    colors: {
      primary:
        teamColorKeys.find((value) => value === colors.primary) ??
        fallback.colors.primary,
      secondary:
        teamColorKeys.find((value) => value === colors.secondary) ??
        fallback.colors.secondary,
      homeField:
        teamColorKeys.find((value) => value === colors.homeField) ??
        fallback.colors.homeField,
    },
    sponsorId: nullableString(values.sponsorId),
    coachId: nullableString(values.coachId) ?? fallback.coachId,
    rosterLoadouts: validateRosterLoadouts(
      values.rosterLoadouts,
      inventory,
    ),
  }
}

function validateRosterLoadouts(
  raw: unknown,
  inventory: string[],
): TeamRosterLoadouts {
  const fallback = createDefaultRosterLoadouts()
  const values = record(raw)

  for (const slotId of teamRosterSlotIds) {
    const loadout = record(values[slotId])
    const equipment = record(loadout.equipment)

    for (const slot of equipmentSlotKeys) {
      fallback[slotId].equipment[slot] = validateLoadoutItemId(
        equipment[slot],
        slot,
        inventory,
      )
    }
  }

  return fallback
}

function validateLoadoutItemId(
  value: unknown,
  slot: EquipmentSlot,
  inventory: string[],
): string | null {
  const id = migrateEquipmentId(value)
  const item = getEquipmentItem(id)

  if (!isEquipmentType(item, equipmentTypeForSlot(slot))) {
    return null
  }

  if (!inventory.includes(item.id)) {
    inventory.push(item.id)
  }

  return item.id
}

function migrateLegacyAttributes(
  old: LegacyAttributes,
): CreatedPlayerAttributes {
  return {
    speed: legacyAttribute(old.speed),
    reaction: legacyAttribute(old.reaction),
    shotPower: averageLegacy(old.power, old.shooting),
    shotAccuracy: averageLegacy(
      old.accuracy,
      old.shooting,
      old.passing,
    ),
    shotSpin: averageLegacy(old.control, old.accuracy),
    toughness: averageLegacy(
      old.toughness,
      old.defense,
      old.ballHandling,
    ),
  }
}

function migrateLegacyStats(
  stats: Record<string, unknown>,
  recordValue: Record<string, unknown>,
): PlayerStatLine {
  return {
    ...validatePlayerStats(stats),
    wins: stat(recordValue.wins),
    losses: stat(recordValue.losses),
  }
}

function cosmeticsFromLegacyPreset(raw: unknown): PlayerCosmetics {
  switch (raw as LegacyVisualPreset) {
    case 'solarGold':
      return {
        ...defaultPlayerCosmetics,
        hairStyle: 'short',
        hairColor: 'blonde',
        shirtColor: 'yellow',
      }
    case 'neonRose':
      return {
        ...defaultPlayerCosmetics,
        hairStyle: 'messy',
        hairColor: 'pink',
        shirtColor: 'pink',
      }
    case 'deepCourt':
      return {
        ...defaultPlayerCosmetics,
        hairStyle: 'buzz',
        shirtColor: 'black',
        accentColor: 'cyan',
      }
    default:
      return defaultPlayerCosmetics
  }
}

function legacyArchetype(raw: unknown): CreatedPlayerArchetype {
  return roles.find((role) => role === raw) ?? 'striker'
}

function averageLegacy(...values: unknown[]): number {
  return clampAttribute(
    values.reduce<number>(
      (sum, value) => sum + legacyAttribute(value),
      0,
    ) /
      values.length,
  )
}

function legacyAttribute(value: unknown): number {
  return scaleLegacyAttribute(value)
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

function stat(value: unknown): number {
  return integer(value, 0, 999_999, 0)
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 100)
    : null
}

function normalizeLeagueId(value: unknown): string {
  const id = nullableString(value)
  return id === 'local-circuit' || id === null
    ? 'rookie_circuit'
    : id
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

export function clampAttribute(value: number): number {
  return Math.min(
    playerAttributeMax,
    Math.max(playerAttributeMin, Math.round(value)),
  )
}

function normalizeAttribute(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number.NaN

  if (!Number.isFinite(numeric)) {
    return playerAttributeDefault
  }

  if (numeric > playerAttributeUltraMax) {
    return scaleLegacyAttribute(numeric)
  }

  return clampAttribute(numeric)
}

function scaleLegacyAttribute(value: unknown): number {
  const legacy = integer(value, 1, 99, 50)
  const normalized = (legacy - 1) / 98
  return clampAttribute(
    playerAttributeMin +
      normalized * (playerAttributeMax - playerAttributeMin),
  )
}

function validateEquippedItemId(
  value: unknown,
  type: 'shield' | 'shoes' | 'armor',
  inventory: string[],
): string | null {
  const id = migrateEquipmentId(value)
  const item = getEquipmentItem(id)

  if (!isEquipmentType(item, type)) {
    return null
  }

  if (!inventory.includes(item.id)) {
    inventory.push(item.id)
  }

  return item.id
}

function equipmentTypeForSlot(
  slot: EquipmentSlot,
): 'stick' | 'shield' | 'shoes' | 'armor' {
  switch (slot) {
    case 'stickId':
      return 'stick'
    case 'shieldId':
      return 'shield'
    case 'shoesId':
      return 'shoes'
    case 'armorId':
      return 'armor'
  }
}
