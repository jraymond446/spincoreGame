import {
  bodyAssetIds,
  createDefaultPlayerAppearance,
  hairAssetIds,
  type PlayerAppearance,
  type PresentationGender,
} from './playerAppearanceTypes.ts'
import {
  hairColorOptions,
  skinColorOptions,
  uniformAccentColorOptions,
  uniformPrimaryColorOptions,
} from './playerAppearancePalettes.ts'

export type GenerateRandomAppearanceOptions = {
  seed?: string | number
  presentation?: PresentationGender
  rng?: () => number
}

export function generateRandomAppearance(
  options: GenerateRandomAppearanceOptions = {},
): PlayerAppearance {
  const random = options.rng ?? createSeededRandom(options.seed ?? Date.now())

  return {
    ...createDefaultPlayerAppearance(),
    presentation: options.presentation ?? 'masc',
    bodyId: pick(bodyAssetIds, random),
    hairId: pick(hairAssetIds, random),
    skinColor: pick(skinColorOptions, random).value,
    hairColor: pick(hairColorOptions, random).value,
    uniformPrimaryColor: pick(uniformPrimaryColorOptions, random).value,
    uniformAccentColor: pick(uniformAccentColorOptions, random).value,
  }
}

export function generateAppearanceForId(id: string): PlayerAppearance {
  return generateRandomAppearance({ seed: id })
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)] ?? values[0]
}

function createSeededRandom(seed: string | number): () => number {
  let state = typeof seed === 'number' ? seed >>> 0 : hashString(seed)

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string): number {
  let hash = 2166136261

  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
