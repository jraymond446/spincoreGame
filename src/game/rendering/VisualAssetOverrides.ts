import type Phaser from 'phaser'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import type { StickStyle, TeamSide } from '../data/matchTypes'

export function preloadVisualAssetOverrides(scene: Phaser.Scene): void {
  for (const slot of Object.values(assetOverrideConfig.sticks)) {
    queueImage(scene, slot.key, slot.path)
  }

  queueImage(
    scene,
    assetOverrideConfig.players.base.key,
    assetOverrideConfig.players.base.path,
  )

  for (const slot of Object.values(assetOverrideConfig.players.teams)) {
    queueImage(scene, slot.key, slot.path)
  }

  if (
    !scene.textures.exists(assetOverrideConfig.crowd.key) &&
    optionalAssetExists(assetOverrideConfig.crowd.path)
  ) {
    scene.load.spritesheet(
      assetOverrideConfig.crowd.key,
      assetOverrideConfig.crowd.path,
      {
        frameWidth: assetOverrideConfig.crowd.frameWidth,
        frameHeight: assetOverrideConfig.crowd.frameHeight,
      },
    )
  }
}

export function getStickAssetKey(style: StickStyle): string {
  return assetOverrideConfig.sticks[style].key
}

export function getPlayerAssetKeys(teamSide: TeamSide): string[] {
  return [
    assetOverrideConfig.players.base.key,
    assetOverrideConfig.players.teams[teamSide].key,
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
