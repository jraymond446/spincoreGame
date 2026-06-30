import Phaser from 'phaser'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import type { StickStyle, TeamSide } from '../data/matchTypes'
import { createArenaLayout } from '../arena/ArenaLayout'
import { getArenaTheme } from '../arena/arenaThemes'
import { resolveArenaPresentation } from '../arena/ArenaPresentation'
import {
  arenaBodyDefinitions,
  arenaCoreDefinition,
  arenaHairDefinitions,
  arenaStickDefinitions,
  spectatorUniformMaskAsset,
} from '../arena/ArenaCharacterAssets'
import { getLabState } from '../lab/LabState'
import { getMatchLaunchConfig } from '../../match/MatchLaunchConfig'
import {
  MatchAssetPreloadSession,
  type MatchAssetManifest,
  type MatchAssetRequirement,
} from '../loading/MatchAssetPreloader'

export function preloadVisualAssetOverrides(
  scene: Phaser.Scene,
): MatchAssetPreloadSession {
  const lab = getLabState().arenaVisual
  const launch = getMatchLaunchConfig()
  const session = new MatchAssetPreloadSession(
    scene,
    createMatchAssetManifest(),
    {
      forceFallbacks:
        launch.mode === 'lab' && lab.forceMissingAssetFallback,
      showTimings: launch.mode === 'lab' && lab.showPreloadTimings,
    },
  )
  session.queue()
  return session
}

export function createMatchAssetManifest(): MatchAssetManifest {
  const layout = createArenaLayout()
  const configuredTheme = getArenaTheme(
    getLabState().arenaVisual.themeId,
    layout,
  )
  const presentation = resolveArenaPresentation(configuredTheme)
  const theme = getArenaTheme(presentation.themeId, layout)
  const assets: MatchAssetRequirement[] = []

  if (theme.shellAsset) {
    assets.push(imageRequirement(
      theme.shellAsset,
      'arenaShell',
      true,
      'procedural arena shell',
    ))
  }
  if (theme.surfaceAsset) {
    assets.push(imageRequirement(
      theme.surfaceAsset,
      'courtSurface',
      true,
      'procedural court surface',
    ))
  }
  if (theme.scoreboardFrameAsset) {
    assets.push(imageRequirement(
      theme.scoreboardFrameAsset,
      'scoreboard',
      false,
      'CSS scoreboard frame',
    ))
  }
  if (theme.spectatorAtlasAsset) {
    assets.push({
      ...theme.spectatorAtlasAsset,
      category: 'crowd',
      required: false,
      fallback: 'procedural crowd',
      type: 'spritesheet',
    })
  }

  for (const team of Object.values(presentation.teams)) {
    assets.push(imageRequirement(
      team.crestAsset,
      'crest',
      false,
      'procedural team crest',
    ))
  }

  for (const definition of Object.values(arenaBodyDefinitions)) {
    assets.push(
      imageRequirement(
        definition.body,
        'character',
        true,
        'procedural arena character',
      ),
      imageRequirement(
        definition.skinMask,
        'character',
        true,
        'base character palette',
      ),
      imageRequirement(
        definition.uniformPrimaryMask,
        'character',
        true,
        'base character palette',
      ),
      imageRequirement(
        definition.uniformAccentMask,
        'character',
        true,
        'base character palette',
      ),
    )
  }

  for (const definition of Object.values(arenaHairDefinitions)) {
    assets.push(imageRequirement(
      definition.asset,
      'hair',
      false,
      'procedural arena hair',
    ))
  }

  for (const definition of Object.values(arenaStickDefinitions)) {
    assets.push(imageRequirement(
      definition.asset,
      'stick',
      true,
      'generated arena stick',
    ))
  }

  assets.push(
    imageRequirement(
      arenaCoreDefinition.asset,
      'core',
      true,
      'procedural Core',
    ),
    {
      ...spectatorUniformMaskAsset,
      category: 'crowd',
      required: false,
      fallback: 'untinted spectator atlas',
      type: 'spritesheet',
      frameWidth: 64,
      frameHeight: 64,
    },
  )

  return {
    themeId: theme.id,
    matchup: {
      home: presentation.teams.A.name,
      away: presentation.teams.B.name,
    },
    assets,
  }
}

export function getStickAssetKey(style: StickStyle): string {
  return assetOverrideConfig.sticks[style].key
}

export function getPlayerAssetKeys(teamSide: TeamSide): string[] {
  const players = assetOverrideConfig.players

  if (!players?.base || !players.teams?.[teamSide]) {
    return []
  }

  return [players.base.key, players.teams[teamSide].key]
}

export function hasVisualAsset(
  scene: Phaser.Scene,
  textureKey: string,
): boolean {
  return !forceVisualFallbacks() && scene.textures.exists(textureKey)
}

export function useLinearVisualAssetFiltering(
  scene: Phaser.Scene,
  textureKey: string,
): void {
  if (!hasVisualAsset(scene, textureKey)) {
    return
  }

  scene.textures
    .get(textureKey)
    .setFilter(Phaser.Textures.FilterMode.LINEAR)
}

function imageRequirement(
  slot: { key: string; path: string },
  category: MatchAssetRequirement['category'],
  required: boolean,
  fallback: string,
): MatchAssetRequirement {
  return {
    ...slot,
    category,
    required,
    fallback,
    type: 'image',
  }
}

function forceVisualFallbacks(): boolean {
  return (
    getMatchLaunchConfig().mode === 'lab' &&
    getLabState().arenaVisual.forceMissingAssetFallback
  )
}
