import type Phaser from 'phaser'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import type { StickStyle, TeamSide } from '../data/matchTypes'
import { createArenaLayout } from '../arena/ArenaLayout'
import { getArenaTheme } from '../arena/arenaThemes'
import { resolveArenaPresentation } from '../arena/ArenaPresentation'

export function preloadVisualAssetOverrides(scene: Phaser.Scene): void {
  for (const slot of Object.values(assetOverrideConfig.sticks ?? {})) {
    queueImage(scene, slot.key, slot.path)
  }

  const players = assetOverrideConfig.players

  if (players?.base) {
    queueImage(
      scene,
      players.base.key,
      players.base.path,
    )
  }

  for (const slot of Object.values(players?.teams ?? {})) {
    queueImage(scene, slot.key, slot.path)
  }

  preloadArenaAssets(scene)
}

function preloadArenaAssets(scene: Phaser.Scene): void {
  const layout = createArenaLayout()
  const labTheme = getArenaTheme('rookie', layout)
  const presentation = resolveArenaPresentation(labTheme)
  const theme = getArenaTheme(presentation.themeId, layout)

  if (theme.shellAsset) {
    queueImage(scene, theme.shellAsset.key, theme.shellAsset.path)
  }
  if (theme.surfaceAsset) {
    queueImage(scene, theme.surfaceAsset.key, theme.surfaceAsset.path)
  }
  if (theme.scoreboardFrameAsset) {
    queueImage(
      scene,
      theme.scoreboardFrameAsset.key,
      theme.scoreboardFrameAsset.path,
    )
  }
  if (
    theme.spectatorAtlasAsset &&
    !scene.textures.exists(theme.spectatorAtlasAsset.key) &&
    optionalAssetExists(theme.spectatorAtlasAsset.path)
  ) {
    scene.load.spritesheet(
      theme.spectatorAtlasAsset.key,
      theme.spectatorAtlasAsset.path,
      {
        frameWidth: theme.spectatorAtlasAsset.frameWidth,
        frameHeight: theme.spectatorAtlasAsset.frameHeight,
      },
    )
  }

  for (const team of Object.values(presentation.teams)) {
    queueImage(scene, team.crestAsset.key, team.crestAsset.path)
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

  return [
    players.base.key,
    players.teams[teamSide].key,
  ]
}

export function hasVisualAsset(
  scene: Phaser.Scene,
  textureKey: string,
): boolean {
  return scene.textures.exists(textureKey)
}

function queueImage(
  scene: Phaser.Scene,
  key: string,
  path: string,
): void {
  if (!scene.textures.exists(key) && optionalAssetExists(path)) {
    scene.load.image(key, path)
  }
}

function optionalAssetExists(path: string): boolean {
  if (typeof XMLHttpRequest === 'undefined') {
    return true
  }

  try {
    const request = new XMLHttpRequest()

    request.open('HEAD', path, false)
    request.send()
    if (request.status < 200 || request.status >= 300) {
      return false
    }

    const contentType = request.getResponseHeader('content-type') ?? ''
    return contentType.toLowerCase().startsWith('image/')
  } catch {
    return false
  }
}
