import Phaser from 'phaser'
import { inputConfig } from '../config/inputConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import { stickConfig } from '../config/stickConfig'
import type { Point } from '../data/geometry'

export type InputMode = 'keyboardMouse' | 'touch'

export type PlayerInputState = {
  movement: Phaser.Math.Vector2
  aimAngle: number
  primaryStickAction: boolean
  primaryStickActionStarted: boolean
  releasePrimaryStickAction: boolean
  primaryIntensity: number
  truckAction: boolean
  explicitSlashAction: boolean
}

export type InputDebugVectors = {
  leftJoystick: Point
  rightAim: Point
}

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

type TouchPoint = {
  pointerId: number
  start: Point
  current: Point
}

export class PlayerInputController {
  private scene: Phaser.Scene
  private keys: MovementKeys
  private debugKey: Phaser.Input.Keyboard.Key
  private modeKey: Phaser.Input.Keyboard.Key
  private truckKeys: Phaser.Input.Keyboard.Key[]
  private slashKey: Phaser.Input.Keyboard.Key
  private mode: InputMode
  private movement = new Phaser.Math.Vector2()
  private debugVectors: InputDebugVectors = {
    leftJoystick: { x: 0, y: 0 },
    rightAim: { x: 0, y: 0 },
  }
  private leftTouch: TouchPoint | null = null
  private rightTouch: TouchPoint | null = null
  private touchRoot: HTMLDivElement
  private joystickBase: HTMLDivElement
  private joystickKnob: HTMLDivElement
  private aimIndicator: HTMLDivElement
  private truckButton: HTMLButtonElement
  private actionHint: HTMLDivElement
  private touchTruckQueued = false
  private previousPrimaryAction = false
  private rightMouseWasDown = false
  private gameplayEnabled = true
  private carrying = false
  private truckActionEnabled = true
  private defaultJoystickCenter: Point = { x: 0, y: 0 }
  private defaultAimCenter: Point = { x: 0, y: 0 }
  private rawAimAngle = 0

  constructor(scene: Phaser.Scene, hudRoot: HTMLDivElement) {
    const keyboard = scene.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }

    this.scene = scene
    this.mode = this.detectInitialMode()
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
    this.debugKey = this.keys.right
    this.modeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)
    this.truckKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    ]
    this.slashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.touchRoot = document.createElement('div')
    this.touchRoot.className = 'touch-controls'
    this.joystickBase = document.createElement('div')
    this.joystickBase.className = 'virtual-joystick-base'
    this.joystickKnob = document.createElement('div')
    this.joystickKnob.className = 'virtual-joystick-knob'
    this.aimIndicator = document.createElement('div')
    this.aimIndicator.className = 'touch-aim-indicator'
    this.truckButton = this.createTouchActionButton(
      'TRUCK',
      'touch-truck-button',
    )
    this.actionHint = document.createElement('div')
    this.actionHint.className = 'touch-action-hint'
    this.touchRoot.style.setProperty(
      '--joystick-size',
      `${inputConfig.touch.joystickRadius * 2}px`,
    )
    this.touchRoot.style.setProperty(
      '--joystick-radius',
      `${inputConfig.touch.joystickRadius}px`,
    )
    this.touchRoot.style.setProperty(
      '--joystick-knob-size',
      `${inputConfig.touch.joystickKnobRadius * 2}px`,
    )
    this.touchRoot.style.setProperty(
      '--aim-indicator-size',
      `${inputConfig.touch.aimIndicatorRadius * 2}px`,
    )
    this.touchRoot.style.setProperty(
      '--aim-indicator-radius',
      `${inputConfig.touch.aimIndicatorRadius}px`,
    )
    this.joystickBase.appendChild(this.joystickKnob)
    this.touchRoot.append(
      this.joystickBase,
      this.aimIndicator,
      this.truckButton,
      this.actionHint,
    )
    hudRoot.appendChild(this.touchRoot)
    scene.game.canvas.addEventListener('contextmenu', this.preventContextMenu)

    scene.input.addPointer(2)
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)
    scene.input.on('pointerupoutside', this.handlePointerUp, this)

    this.layout()
    this.updateTouchVisuals()
    this.setGameplayContext(false, true)
  }

  update(
    origin: Point,
    currentAimAngle: number,
    deltaMs: number,
  ): PlayerInputState {
    if (this.hasKeyboardMovement()) {
      this.setMode('keyboardMouse')
    }

    const targetMovement =
      this.mode === 'touch' ? this.getTouchMovement() : this.getKeyboardMovement()
    const movementStep = inputConfig.movementAcceleration * (deltaMs / 1000)
    const pointer = this.scene.input.activePointer
    const rightMouseDown =
      this.mode === 'keyboardMouse' &&
      !pointer.wasTouch &&
      pointer.rightButtonDown()
    const primaryStickAction =
      this.mode === 'touch'
        ? this.rightTouch !== null
        : pointer.leftButtonDown() && !pointer.wasTouch
    const primaryStickActionStarted =
      primaryStickAction && !this.previousPrimaryAction
    const releasePrimaryStickAction =
      !primaryStickAction && this.previousPrimaryAction
    const primaryIntensity = primaryStickAction
      ? this.getPrimaryIntensity(pointer)
      : 0
    const truckAction =
      this.mode === 'touch'
        ? this.consumeTouchTruck()
        : this.truckKeys.some((key) =>
            Phaser.Input.Keyboard.JustDown(key),
          )
    const explicitSlashAction =
      this.mode === 'keyboardMouse' &&
      (Phaser.Input.Keyboard.JustDown(this.slashKey) ||
        (rightMouseDown && !this.rightMouseWasDown))

    this.rightMouseWasDown = rightMouseDown
    this.previousPrimaryAction = primaryStickAction

    moveVectorToward(this.movement, targetMovement, movementStep)
    const aimAngle = this.getSmoothedAimAngle(
      origin,
      currentAimAngle,
      deltaMs,
    )

    this.debugVectors = {
      leftJoystick: {
        x: targetMovement.x,
        y: targetMovement.y,
      },
      rightAim: this.getDebugAimVector(origin, aimAngle),
    }

    return {
      movement: this.gameplayEnabled
        ? this.movement.clone()
        : new Phaser.Math.Vector2(),
      aimAngle,
      primaryStickAction:
        this.gameplayEnabled && primaryStickAction,
      primaryStickActionStarted:
        this.gameplayEnabled && primaryStickActionStarted,
      releasePrimaryStickAction:
        this.gameplayEnabled && releasePrimaryStickAction,
      primaryIntensity:
        this.gameplayEnabled ? primaryIntensity : 0,
      truckAction:
        this.gameplayEnabled && !this.carrying && truckAction,
      explicitSlashAction:
        this.gameplayEnabled &&
        !this.carrying &&
        explicitSlashAction,
    }
  }

  getMode(): InputMode {
    return this.mode
  }

  getDebugVectors(): InputDebugVectors {
    return {
      leftJoystick: { ...this.debugVectors.leftJoystick },
      rightAim: { ...this.debugVectors.rightAim },
    }
  }

  getRawAimAngle(): number {
    return this.rawAimAngle
  }

  setGameplayContext(
    carrying: boolean,
    enabled: boolean,
    truckEnabled = true,
  ): void {
    this.carrying = carrying
    this.gameplayEnabled = enabled
    this.truckActionEnabled = truckEnabled
    this.truckButton.disabled =
      carrying ||
      !enabled ||
      !this.truckActionEnabled ||
      !this.isTouchControlVisible()
    this.truckButton.hidden =
      carrying || !this.truckActionEnabled
    this.actionHint.textContent = !enabled
      ? 'WAIT'
      : carrying
        ? 'AIM / RELEASE'
        : 'SLASH'
    this.actionHint.classList.toggle('is-carrying', carrying)
    this.actionHint.classList.toggle('is-disabled', !enabled)
  }

  consumeDebugToggle(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.debugKey)
  }

  consumeModeToggle(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.modeKey)
  }

  reset(): void {
    this.movement.set(0, 0)
    this.leftTouch = null
    this.rightTouch = null
    this.touchTruckQueued = false
    this.previousPrimaryAction = false
    this.rightMouseWasDown = false
    this.debugVectors = {
      leftJoystick: { x: 0, y: 0 },
      rightAim: { x: 0, y: 0 },
    }
    this.updateTouchVisuals()
  }

  layout(): void {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const touch = inputConfig.touch
    const bottomSafeArea =
      getCssPixelValue('--safe-area-inset-bottom') +
      touch.bottomSafeAreaPadding

    this.defaultJoystickCenter = {
      x: touch.safePadding + touch.joystickRadius,
      y:
        height -
        touch.safePadding -
        bottomSafeArea -
        touch.joystickRadius,
    }
    this.defaultAimCenter = {
      x: width - touch.safePadding - touch.joystickRadius,
      y:
        height -
        touch.safePadding -
        bottomSafeArea -
        touch.joystickRadius,
    }
    this.truckButton.style.right =
      `calc(${touch.safePadding}px + env(safe-area-inset-right, 0px))`
    this.truckButton.style.bottom =
      `calc(${bottomSafeArea + touch.safePadding + touch.joystickRadius * 2 + 18}px)`
    this.actionHint.style.right =
      `calc(${touch.safePadding}px + env(safe-area-inset-right, 0px))`
    this.actionHint.style.bottom =
      `calc(${bottomSafeArea + touch.safePadding + touch.joystickRadius * 2 - 26}px)`
    this.updateTouchVisuals()
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this)
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this)
    this.scene.game.canvas.removeEventListener(
      'contextmenu',
      this.preventContextMenu,
    )
    this.truckButton.removeEventListener(
      'pointerdown',
      this.handleTruckPointer,
    )
    this.touchRoot.remove()
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) {
      this.setMode('keyboardMouse')
      return
    }

    this.setMode('touch')
    const point = { x: pointer.x, y: pointer.y }
    const inMovementRegion =
      pointer.x < this.scene.scale.width * inputConfig.touch.rightSideStartRatio &&
      pointer.y >
        this.scene.scale.height * (1 - inputConfig.touch.movementRegionHeightRatio)

    if (inMovementRegion && !this.leftTouch) {
      this.leftTouch = {
        pointerId: pointer.id,
        start: point,
        current: point,
      }
    } else if (
      pointer.x >= this.scene.scale.width * inputConfig.touch.rightSideStartRatio &&
      !this.rightTouch
    ) {
      this.rightTouch = {
        pointerId: pointer.id,
        start: point,
        current: point,
      }
    }

    this.updateTouchVisuals()
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) {
      if (inputConfig.mode === 'auto') {
        this.setMode('keyboardMouse')
      }
      return
    }

    if (this.leftTouch?.pointerId === pointer.id) {
      this.leftTouch.current = { x: pointer.x, y: pointer.y }
    }

    if (this.rightTouch?.pointerId === pointer.id) {
      this.rightTouch.current = { x: pointer.x, y: pointer.y }
    }

    this.updateTouchVisuals()
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.leftTouch?.pointerId === pointer.id) {
      this.leftTouch = null
    }

    if (this.rightTouch?.pointerId === pointer.id) {
      this.rightTouch = null
    }

    this.updateTouchVisuals()
  }

  private getKeyboardMovement(): Phaser.Math.Vector2 {
    const x =
      Number(this.keys.right.isDown || this.keys.arrowRight.isDown) -
      Number(this.keys.left.isDown || this.keys.arrowLeft.isDown)
    const y =
      Number(this.keys.down.isDown || this.keys.arrowDown.isDown) -
      Number(this.keys.up.isDown || this.keys.arrowUp.isDown)
    const vector = new Phaser.Math.Vector2(x, y)

    return vector.lengthSq() > 0 ? vector.normalize() : vector
  }

  private getTouchMovement(): Phaser.Math.Vector2 {
    if (!this.leftTouch) {
      return new Phaser.Math.Vector2()
    }

    const vector = new Phaser.Math.Vector2(
      this.leftTouch.current.x - this.leftTouch.start.x,
      this.leftTouch.current.y - this.leftTouch.start.y,
    )
    const distance = vector.length()

    if (distance === 0) {
      return vector
    }

    return vector
      .normalize()
      .scale(Math.min(1, distance / inputConfig.touch.joystickMaxDistance))
  }

  private getSmoothedAimAngle(
    origin: Point,
    currentAimAngle: number,
    deltaMs: number,
  ): number {
    const targetAimAngle = this.getTargetAimAngle(origin, currentAimAngle)
    this.rawAimAngle = targetAimAngle
    const deltaSeconds = deltaMs / 1000
    const smoothing = 1 - Math.exp(-stickConfig.aimSmoothing * deltaSeconds)
    const angularDelta = Phaser.Math.Angle.Wrap(targetAimAngle - currentAimAngle)
    const smoothedDelta = angularDelta * smoothing
    const maximumRotation = stickConfig.maxStickRotationSpeed * deltaSeconds

    return Phaser.Math.Angle.Wrap(
      currentAimAngle +
        Phaser.Math.Clamp(smoothedDelta, -maximumRotation, maximumRotation),
    )
  }

  private getTargetAimAngle(origin: Point, fallbackAngle: number): number {
    if (this.mode === 'touch') {
      if (!this.rightTouch) {
        return fallbackAngle
      }

      const drag = {
        x: this.rightTouch.current.x - this.rightTouch.start.x,
        y: this.rightTouch.current.y - this.rightTouch.start.y,
      }

      if (Math.hypot(drag.x, drag.y) < inputConfig.touch.aimDragDeadzone) {
        return fallbackAngle
      }

      return Math.atan2(drag.y, drag.x)
    }

    const pointer = this.scene.input.activePointer
    const distanceToPointer = Math.hypot(pointer.worldX - origin.x, pointer.worldY - origin.y)

    if (distanceToPointer < stickConfig.aimDeadzone) {
      return fallbackAngle
    }

    return Phaser.Math.Angle.Between(origin.x, origin.y, pointer.worldX, pointer.worldY)
  }

  private getDebugAimVector(origin: Point, fallbackAngle: number): Point {
    if (this.mode === 'touch') {
      if (!this.rightTouch) {
        return { x: 0, y: 0 }
      }

      const vector = {
        x: this.rightTouch.current.x - this.rightTouch.start.x,
        y: this.rightTouch.current.y - this.rightTouch.start.y,
      }

      return normalizedWithMagnitude(
        vector,
        inputConfig.touch.aimDragDeadzone,
        inputConfig.touch.joystickMaxDistance,
      )
    }

    const pointer = this.scene.input.activePointer
    const vector = {
      x: pointer.worldX - origin.x,
      y: pointer.worldY - origin.y,
    }

    if (Math.hypot(vector.x, vector.y) < stickConfig.aimDeadzone) {
      return {
        x: Math.cos(fallbackAngle),
        y: Math.sin(fallbackAngle),
      }
    }

    return normalizedWithMagnitude(vector, 0, Math.hypot(vector.x, vector.y))
  }

  private getPrimaryIntensity(pointer: Phaser.Input.Pointer): number {
    const pressure =
      pointer.event instanceof PointerEvent
        ? pointer.event.pressure
        : 0
    const dragDistance = this.rightTouch
      ? Math.hypot(
          this.rightTouch.current.x - this.rightTouch.start.x,
          this.rightTouch.current.y - this.rightTouch.start.y,
        )
      : 0
    const dragIntensity =
      dragDistance / Math.max(1, possessionFeelConfig.hardChargeDragThreshold)

    return Phaser.Math.Clamp(Math.max(pressure, dragIntensity), 0, 1)
  }

  private hasKeyboardMovement(): boolean {
    return Object.values(this.keys).some((key) => key.isDown)
  }

  private setMode(mode: InputMode): void {
    if (inputConfig.mode !== 'auto' && inputConfig.mode !== mode) {
      return
    }

    if (this.mode === mode) {
      return
    }

    this.mode = mode
    this.leftTouch = null
    this.rightTouch = null
    this.movement.set(0, 0)
    this.updateTouchVisuals()
  }

  private detectInitialMode(): InputMode {
    if (inputConfig.mode !== 'auto') {
      return inputConfig.mode
    }

    return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches
      ? 'touch'
      : 'keyboardMouse'
  }

  private updateTouchVisuals(): void {
    const shouldShow = this.mode === 'touch' || inputConfig.debugTouchControls
    const baseCenter = this.leftTouch?.start ?? this.defaultJoystickCenter
    const knobOffset = this.leftTouch
      ? clampVector(
          {
            x: this.leftTouch.current.x - this.leftTouch.start.x,
            y: this.leftTouch.current.y - this.leftTouch.start.y,
          },
          inputConfig.touch.joystickMaxDistance,
        )
      : { x: 0, y: 0 }
    const aimCenter = this.rightTouch?.current ?? this.defaultAimCenter

    this.touchRoot.hidden = !shouldShow
    this.truckButton.disabled =
      this.carrying ||
      !this.gameplayEnabled ||
      !this.truckActionEnabled ||
      !shouldShow
    this.truckButton.hidden =
      this.carrying || !this.truckActionEnabled
    positionElement(this.joystickBase, baseCenter)
    positionElement(this.joystickKnob, knobOffset)
    positionElement(this.aimIndicator, aimCenter)
    this.aimIndicator.classList.toggle('is-active', this.rightTouch !== null)
  }

  private createTouchActionButton(
    label: string,
    className: string,
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `touch-action-button ${className}`
    button.textContent = label

    button.addEventListener('pointerdown', this.handleTruckPointer)

    return button
  }

  private handleTruckPointer = (event: PointerEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    this.setMode('touch')
    this.touchTruckQueued = true
  }

  private consumeTouchTruck(): boolean {
    const queued = this.touchTruckQueued
    this.touchTruckQueued = false
    return queued
  }

  private preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  private isTouchControlVisible(): boolean {
    return this.mode === 'touch' || inputConfig.debugTouchControls
  }
}

function moveVectorToward(
  current: Phaser.Math.Vector2,
  target: Phaser.Math.Vector2,
  maximumDelta: number,
): void {
  const difference = target.clone().subtract(current)
  const distance = difference.length()

  if (distance <= maximumDelta || distance === 0) {
    current.copy(target)
    return
  }

  current.add(difference.scale(maximumDelta / distance))
}

function clampVector(vector: Point, maximumLength: number): Point {
  const length = Math.hypot(vector.x, vector.y)

  if (length <= maximumLength || length === 0) {
    return vector
  }

  return {
    x: (vector.x / length) * maximumLength,
    y: (vector.y / length) * maximumLength,
  }
}

function positionElement(element: HTMLElement, position: Point): void {
  element.style.transform = `translate(${position.x}px, ${position.y}px)`
}

function normalizedWithMagnitude(
  vector: Point,
  deadzone: number,
  maximumLength: number,
): Point {
  const length = Math.hypot(vector.x, vector.y)

  if (length <= deadzone || length === 0) {
    return { x: 0, y: 0 }
  }

  const magnitude = Math.min(1, (length - deadzone) / Math.max(1, maximumLength - deadzone))

  return {
    x: (vector.x / length) * magnitude,
    y: (vector.y / length) * magnitude,
  }
}

function getCssPixelValue(propertyName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim()
  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : 0
}
