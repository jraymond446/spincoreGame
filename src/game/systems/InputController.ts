import Phaser from 'phaser'
import type { Point } from '../data/geometry'

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  arrowUp: Phaser.Input.Keyboard.Key
  arrowDown: Phaser.Input.Keyboard.Key
  arrowLeft: Phaser.Input.Keyboard.Key
  arrowRight: Phaser.Input.Keyboard.Key
}

export class InputController {
  private scene: Phaser.Scene
  private keys: MovementKeys

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }

    this.scene = scene
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      arrowUp: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      arrowDown: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      arrowLeft: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      arrowRight: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    }
  }

  getMovementVector(): Phaser.Math.Vector2 {
    const x =
      Number(this.keys.right.isDown || this.keys.arrowRight.isDown) -
      Number(this.keys.left.isDown || this.keys.arrowLeft.isDown)
    const y =
      Number(this.keys.down.isDown || this.keys.arrowDown.isDown) -
      Number(this.keys.up.isDown || this.keys.arrowUp.isDown)
    const vector = new Phaser.Math.Vector2(x, y)

    if (vector.lengthSq() > 0) {
      vector.normalize()
    }

    return vector
  }

  getAimAngle(origin: Point): number {
    const pointer = this.scene.input.activePointer

    return Phaser.Math.Angle.Between(origin.x, origin.y, pointer.worldX, pointer.worldY)
  }

  isPointerHeld(): boolean {
    return this.scene.input.activePointer.isDown
  }

  consumeDebugToggle(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.right)
  }
}
