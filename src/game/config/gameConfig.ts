import Phaser from 'phaser'
import { GameScene } from '../scenes/GameScene'
import { viewConfig } from './viewConfig'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: viewConfig.width,
  height: viewConfig.height,
  backgroundColor: viewConfig.backgroundColor,
  physics: {
    default: 'matter',
    matter: {
      debug: false,
      gravity: {
        x: 0,
        y: 0,
      },
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: viewConfig.width,
    height: viewConfig.height,
  },
  scene: [GameScene],
}
