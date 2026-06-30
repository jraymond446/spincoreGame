export type MatchAssetReadinessState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'failedButPlayable'

export type MatchAssetCategory =
  | 'arenaShell'
  | 'courtSurface'
  | 'scoreboard'
  | 'crowd'
  | 'crest'
  | 'character'
  | 'hair'
  | 'stick'
  | 'core'
  | 'hud'
  | 'vfx'

export type MatchAssetRequirement = {
  key: string
  path: string
  category: MatchAssetCategory
  required: boolean
  fallback: string
  type: 'image' | 'spritesheet'
  frameWidth?: number
  frameHeight?: number
}

export type MatchAssetManifest = {
  themeId: string
  matchup: { home: string; away: string }
  assets: MatchAssetRequirement[]
}

export type MatchAssetFailure = {
  key: string
  path: string
  category: MatchAssetCategory
  required: boolean
  fallback: string
}

export type MatchLoadingSnapshot = {
  state: MatchAssetReadinessState
  themeId: string
  matchup: { home: string; away: string }
  progress: number
  currentStep: string
  totalCount: number
  resolvedCount: number
  cachedCount: number
  failures: MatchAssetFailure[]
  durationMs: number | null
}

export type MatchSceneReadyDetail = {
  initDurationMs: number
  textureCount: number
  spectatorCount: number
}

export function dedupeMatchAssets(
  assets: MatchAssetRequirement[],
): MatchAssetRequirement[] {
  const unique = new Map<string, MatchAssetRequirement>()
  for (const asset of assets) {
    if (!unique.has(asset.key)) {
      unique.set(asset.key, asset)
    }
  }
  return [...unique.values()]
}

export function resolveMatchAssetReadiness(
  failures: MatchAssetFailure[],
): MatchAssetReadinessState {
  return failures.some((failure) => failure.required)
    ? 'failedButPlayable'
    : 'ready'
}
