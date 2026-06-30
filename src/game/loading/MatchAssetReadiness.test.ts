import {
  dedupeMatchAssets,
  resolveMatchAssetReadiness,
  type MatchAssetFailure,
  type MatchAssetRequirement,
} from './MatchAssetReadiness.ts'

const shell = asset('shell', true)
const duplicateShell = { ...shell, path: '/duplicate-shell.png' }
const crowd = asset('crowd', false)
const unique = dedupeMatchAssets([shell, duplicateShell, crowd])

assertEqual(unique.length, 2, 'manifest keys are deduplicated')
assertEqual(unique[0].path, shell.path, 'first manifest definition wins')
assertEqual(
  resolveMatchAssetReadiness([]),
  'ready',
  'complete manifest is ready',
)
assertEqual(
  resolveMatchAssetReadiness([failure(crowd)]),
  'ready',
  'optional failure does not block readiness',
)
assertEqual(
  resolveMatchAssetReadiness([failure(shell)]),
  'failedButPlayable',
  'required failure resolves through its fallback',
)

console.info('Match asset readiness cases passed')

function asset(key: string, required: boolean): MatchAssetRequirement {
  return {
    key,
    path: `/assets/${key}.png`,
    category: key === 'crowd' ? 'crowd' : 'arenaShell',
    required,
    fallback: `procedural ${key}`,
    type: 'image',
  }
}

function failure(assetRequirement: MatchAssetRequirement): MatchAssetFailure {
  return {
    key: assetRequirement.key,
    path: assetRequirement.path,
    category: assetRequirement.category,
    required: assetRequirement.required,
    fallback: assetRequirement.fallback,
  }
}

function assertEqual(
  actual: string | number,
  expected: string | number,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}
