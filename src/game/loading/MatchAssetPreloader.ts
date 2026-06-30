import Phaser from 'phaser'
import {
  dedupeMatchAssets,
  resolveMatchAssetReadiness,
  type MatchAssetCategory,
  type MatchAssetFailure,
  type MatchAssetManifest,
  type MatchAssetReadinessState,
  type MatchAssetRequirement,
  type MatchLoadingSnapshot,
  type MatchSceneReadyDetail,
} from './MatchAssetReadiness'

export type {
  MatchAssetFailure,
  MatchAssetManifest,
  MatchAssetReadinessState,
  MatchAssetRequirement,
  MatchLoadingSnapshot,
  MatchSceneReadyDetail,
} from './MatchAssetReadiness'

export const matchLoadingEvents = {
  state: 'spincore:match-loading-state',
  sceneReady: 'spincore:match-scene-ready',
  reveal: 'spincore:match-reveal',
} as const

type MatchPreloadOptions = {
  forceFallbacks: boolean
  showTimings: boolean
}

const slowAssetThresholdMs = 250
const failedAssetPaths = new Set<string>()
const warnedFallbackKeys = new Set<string>()

export class MatchAssetPreloadSession {
  private readonly scene: Phaser.Scene
  private readonly manifest: MatchAssetManifest
  private readonly options: MatchPreloadOptions
  private readonly assetsByKey = new Map<string, MatchAssetRequirement>()
  private readonly queuedKeys = new Set<string>()
  private readonly resolvedKeys = new Set<string>()
  private readonly failuresByKey = new Map<string, MatchAssetFailure>()
  private state: MatchAssetReadinessState = 'idle'
  private cachedCount = 0
  private startedAt = 0
  private durationMs: number | null = null
  private currentStep = 'Preparing arena'

  constructor(
    scene: Phaser.Scene,
    manifest: MatchAssetManifest,
    options: MatchPreloadOptions,
  ) {
    this.scene = scene
    this.manifest = {
      ...manifest,
      assets: dedupeMatchAssets(manifest.assets),
    }
    this.options = options
    for (const asset of this.manifest.assets) {
      this.assetsByKey.set(asset.key, asset)
    }
  }

  queue(): void {
    this.state = 'loading'
    this.startedAt = now()
    this.bindLoaderEvents()

    for (const asset of this.manifest.assets) {
      if (this.options.forceFallbacks || failedAssetPaths.has(asset.path)) {
        this.registerFailure(asset)
        this.resolvedKeys.add(asset.key)
        continue
      }

      if (this.scene.textures.exists(asset.key)) {
        this.cachedCount += 1
        this.resolvedKeys.add(asset.key)
        continue
      }

      this.queuedKeys.add(asset.key)
      if (asset.type === 'spritesheet') {
        this.scene.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth ?? 64,
          frameHeight: asset.frameHeight ?? 64,
        })
      } else {
        this.scene.load.image(asset.key, asset.path)
      }
    }

    this.currentStep = this.queuedKeys.size > 0
      ? 'Loading arena assets'
      : 'Confirming cached assets'
    this.dispatchSnapshot()
  }

  completeBeforeCreate(): MatchLoadingSnapshot {
    if (this.state === 'loading') {
      this.finalize()
    }
    return this.getSnapshot()
  }

  reportSceneReady(detail: MatchSceneReadyDetail): void {
    if (shouldLogTimings(this.options.showTimings)) {
      console.info(
        `[MatchPreload] Match init ${Math.round(detail.initDurationMs)}ms; ` +
        `${detail.textureCount} textures; ${detail.spectatorCount} spectators`,
      )
    }
    dispatchWindowEvent(matchLoadingEvents.sceneReady, detail)
  }

  getSnapshot(): MatchLoadingSnapshot {
    const totalCount = this.manifest.assets.length
    return {
      state: this.state,
      themeId: this.manifest.themeId,
      matchup: { ...this.manifest.matchup },
      progress: totalCount === 0
        ? 1
        : Math.min(1, this.resolvedKeys.size / totalCount),
      currentStep: this.currentStep,
      totalCount,
      resolvedCount: this.resolvedKeys.size,
      cachedCount: this.cachedCount,
      failures: [...this.failuresByKey.values()],
      durationMs: this.durationMs,
    }
  }

  private bindLoaderEvents(): void {
    this.scene.load.on(
      Phaser.Loader.Events.FILE_COMPLETE,
      this.handleFileComplete,
    )
    this.scene.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      this.handleFileError,
    )
    this.scene.load.once(
      Phaser.Loader.Events.COMPLETE,
      this.handleLoaderComplete,
    )
  }

  private unbindLoaderEvents(): void {
    this.scene.load.off(
      Phaser.Loader.Events.FILE_COMPLETE,
      this.handleFileComplete,
    )
    this.scene.load.off(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      this.handleFileError,
    )
  }

  private handleFileComplete = (key: string): void => {
    const asset = this.assetsByKey.get(key)
    if (!asset) {
      return
    }

    this.resolvedKeys.add(key)
    this.currentStep = `Loaded ${categoryLabel(asset.category)}`
    this.reportSlowAsset(asset)
    this.dispatchSnapshot()
  }

  private handleFileError = (file: Phaser.Loader.File): void => {
    const asset = this.assetsByKey.get(file.key)
    if (!asset) {
      return
    }

    failedAssetPaths.add(asset.path)
    this.resolvedKeys.add(asset.key)
    this.registerFailure(asset)
    this.currentStep = `Using ${asset.fallback}`
    this.dispatchSnapshot()
  }

  private handleLoaderComplete = (): void => {
    this.finalize()
  }

  private finalize(): void {
    if (this.state !== 'loading') {
      return
    }

    for (const key of this.queuedKeys) {
      if (this.scene.textures.exists(key)) {
        this.resolvedKeys.add(key)
        continue
      }

      const asset = this.assetsByKey.get(key)
      if (asset) {
        this.registerFailure(asset)
        this.resolvedKeys.add(key)
      }
    }

    this.durationMs = Math.max(0, now() - this.startedAt)
    this.state = resolveMatchAssetReadiness(
      [...this.failuresByKey.values()],
    )
    this.currentStep = this.state === 'ready'
      ? 'Arena ready'
      : 'Fallbacks ready'
    this.unbindLoaderEvents()
    this.dispatchSnapshot()

    if (shouldLogTimings(this.options.showTimings)) {
      const cacheCopy = this.cachedCount > 0
        ? ` (${this.cachedCount} cached)`
        : ''
      console.info(
        `[MatchPreload] Loaded ${this.manifest.themeId} theme in ` +
        `${Math.round(this.durationMs)}ms${cacheCopy}`,
      )
    }
  }

  private registerFailure(asset: MatchAssetRequirement): void {
    if (this.failuresByKey.has(asset.key)) {
      return
    }

    this.failuresByKey.set(asset.key, {
      key: asset.key,
      path: asset.path,
      category: asset.category,
      required: asset.required,
      fallback: asset.fallback,
    })
    if (!warnedFallbackKeys.has(asset.key)) {
      warnedFallbackKeys.add(asset.key)
      console.info(
        `[MatchPreload] Using ${asset.fallback} for ${asset.path}`,
      )
    }
  }

  private reportSlowAsset(asset: MatchAssetRequirement): void {
    if (!shouldLogTimings(this.options.showTimings)) {
      return
    }

    const duration = getResourceDuration(asset.path)
    if (duration >= slowAssetThresholdMs) {
      console.info(
        `[MatchPreload] Slow asset: ${asset.path} ${Math.round(duration)}ms`,
      )
    }
  }

  private dispatchSnapshot(): void {
    dispatchWindowEvent(matchLoadingEvents.state, this.getSnapshot())
  }
}

function getResourceDuration(path: string): number {
  if (typeof performance === 'undefined' || typeof location === 'undefined') {
    return 0
  }

  const absolutePath = new URL(path, location.href).href
  const entries = performance.getEntriesByName(absolutePath)
  const entry = entries[entries.length - 1]
  return entry?.duration ?? 0
}

function shouldLogTimings(showTimings: boolean): boolean {
  return import.meta.env.DEV || showTimings
}

function categoryLabel(category: MatchAssetCategory): string {
  return category.replace(/([A-Z])/g, ' $1').toLowerCase()
}

function dispatchWindowEvent<T>(name: string, detail: T): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
