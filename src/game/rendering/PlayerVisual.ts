import Phaser from 'phaser'
import type { HairStyle } from '../data/hairStyles'
import { hairStyles } from '../data/hairStyles'
import type { PlayerVisualProfile } from '../data/playerVisualProfiles'
import type { PlayerVisualProfileOverride } from '../data/matchTypes'
import {
  roleAccentColors,
  teamVisualPalettes,
  type TeamVisualPalette,
} from '../data/visualPalettes'
import { visualConfig } from '../config/visualConfig'
import { assetOverrideConfig } from '../config/assetOverrideConfig'
import { stickConfig } from '../config/stickConfig'
import { possessionFeelConfig } from '../config/possessionFeelConfig'
import type {
  PlayerControllerType,
  PlayerHandedness,
  PlayerPlayStyle,
  PlayerRole,
  StickActionState,
  TeamSide,
} from '../data/matchTypes'
import type { DefensiveVisualState, PlayerAnimationPose } from './AnimationState'
import { PlayerAnimationController } from './PlayerAnimationController'
import { StickVisual } from './StickVisual'
import { getHandednessFrame } from '../rules/Handedness'
import {
  getPlayerAssetKeys,
  hasVisualAsset,
} from './VisualAssetOverrides'
import { arenaLayers } from '../arena/ArenaLayers'
import {
  arenaCharacterDefaults,
  type ArenaCharacterRendererMode,
  type ArenaStickLayerMode,
} from '../arena/ArenaCharacterAssets'
import { getLabState } from '../lab/LabState'
import { getMatchLaunchConfig } from '../../match/MatchLaunchConfig'
import { ArenaCharacterRenderer } from './ArenaCharacterRenderer'
import {
  ArenaProceduralAnimationController,
  arenaProceduralAnimationDefaults,
  type ArenaProceduralAnimationFrame,
  type ArenaProceduralAnimationTuning,
} from './ArenaProceduralAnimation'

type Point = { x: number; y: number }

export type PlayerVisualUpdate = {
  position: Point
  velocity: Point
  facingRotation: number
  visualStickTarget: Point | null
  possessesCore: boolean
  stickMountPoint: Point
  stickForward: Point
  stickSide: Point
  handednessMountSign: -1 | 1
  pocketFacingSign: -1 | 1
  visualMirrorSign: -1 | 1
  cradleSocketSign: -1 | 1
  cradleSocket: Point
  chargeVisual: {
    normalized: number
    hardCharge: boolean
    overcharged: boolean
  }
  stickState: StickActionState
  defenseState: DefensiveVisualState
}

type PlayerVisualOptions = {
  id: string
  role: PlayerRole
  handedness: PlayerHandedness
  playStyle: PlayerPlayStyle
  controllerType: PlayerControllerType
  teamSide: TeamSide
  profile: PlayerVisualProfile
}

export class PlayerVisual {
  private readonly scene: Phaser.Scene
  private readonly options: PlayerVisualOptions
  private readonly shadow: Phaser.GameObjects.Graphics
  private readonly chargeAura: Phaser.GameObjects.Graphics
  private readonly character: Phaser.GameObjects.Graphics
  private readonly controlledIndicator: Phaser.GameObjects.Graphics
  private readonly roleLabel: Phaser.GameObjects.Text
  private readonly aiStateLabel: Phaser.GameObjects.Text
  private readonly stick: StickVisual
  private readonly arenaCharacter: ArenaCharacterRenderer
  private readonly assetLayers: Phaser.GameObjects.Image[] = []
  private readonly animation = new PlayerAnimationController()
  private readonly arenaAnimation: ArenaProceduralAnimationController
  private palette: TeamVisualPalette
  private hairStyle: HairStyle
  private readonly animationPhase: number
  private controlled = false
  private debugVisible = false
  private aiState = 'IDLE'
  private corePocketAnchor: Point = { x: 0, y: 0 }

  constructor(scene: Phaser.Scene, options: PlayerVisualOptions) {
    this.scene = scene
    this.options = options
    const teamPalette = teamVisualPalettes[options.teamSide]
    this.palette = {
      shirt: options.profile.shirtColor ?? teamPalette.shirt,
      shirtShade:
        options.profile.shirtShadeColor ?? teamPalette.shirtShade,
      trim: options.profile.trimColor ?? teamPalette.trim,
      shorts: options.profile.shortsColor ?? teamPalette.shorts,
    }
    this.hairStyle = hairStyles[options.profile.hairStyle]
    this.animationPhase = this.hash(options.id) * 0.01
    this.arenaAnimation = new ArenaProceduralAnimationController(
      this.animationPhase,
    )

    this.chargeAura = scene.add
      .graphics()
      .setDepth(arenaLayers.gameplayVfx)
    this.shadow = scene.add
      .graphics()
      .setDepth(arenaLayers.playerShadows)
    this.stick = new StickVisual(
      scene,
      options.profile.stickStyle,
      options.role,
      options.teamSide,
    )
    this.character = scene.add.graphics().setDepth(arenaLayers.players)
    getPlayerAssetKeys(options.teamSide).forEach((textureKey, index) => {
      if (!hasVisualAsset(scene, textureKey)) {
        return
      }

      this.assetLayers.push(
        scene.add
          .image(0, 0, textureKey)
          .setOrigin(0.5)
          .setDepth(arenaLayers.players + index * 0.1),
      )
    })
    this.arenaCharacter = new ArenaCharacterRenderer(
      scene,
      options.profile,
      this.palette,
      options.profile.arenaBodyId,
      options.profile.arenaHairId,
      arenaCharacterDefaults.stickId,
    )
    this.controlledIndicator = scene.add
      .graphics()
      .setDepth(arenaLayers.gameplayVfx + 1)
    this.roleLabel = scene.add
      .text(0, 0, this.getRoleLabel(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${visualConfig.label.roleFontSize}px`,
        color: '#ffffff',
        backgroundColor: '#071016cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(arenaLayers.gameplayVfx + 2)
      .setVisible(false)
    this.aiStateLabel = scene.add
      .text(0, 0, this.aiState, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${visualConfig.label.aiFontSize}px`,
        color: '#d8f5ff',
        backgroundColor: '#071016b8',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(arenaLayers.gameplayVfx + 2)
      .setVisible(false)
  }

  applyProfile(
    override: PlayerVisualProfileOverride,
    uniform?: { primary: number; accent: number },
  ): void {
    this.options.profile = {
      ...this.options.profile,
      ...override,
    }
    const teamPalette = teamVisualPalettes[this.options.teamSide]
    const primary = uniform?.primary
    const accent = uniform?.accent
    this.palette = {
      shirt:
        this.options.profile.shirtColor ?? primary ?? teamPalette.shirt,
      shirtShade:
        this.options.profile.shirtShadeColor ??
        (primary !== undefined ? shade(primary, 0.68) : teamPalette.shirtShade),
      trim: this.options.profile.trimColor ?? accent ?? teamPalette.trim,
      shorts:
        this.options.profile.shortsColor ??
        (primary !== undefined ? shade(primary, 0.58) : teamPalette.shorts),
    }
    this.hairStyle = hairStyles[this.options.profile.hairStyle]
    this.arenaCharacter.applyAppearance(
      this.options.profile,
      this.palette,
    )
  }

  update(data: PlayerVisualUpdate): void {
    const settings = this.resolveArenaVisualSettings(data)
    const handednessFrame = getHandednessFrame(settings.handedness)
    const chargeVisual = settings.chargeVisual
    const speed = Math.hypot(data.velocity.x, data.velocity.y)
    const useArenaRenderer = this.shouldUseArenaRenderer(
      settings.rendererMode,
      settings.inScope,
    )
    const trackingTargetAngle = data.visualStickTarget
      ? Math.atan2(
          data.visualStickTarget.y - data.position.y,
          data.visualStickTarget.x - data.position.x,
        )
      : null
    const trackingTargetDistance = data.visualStickTarget
      ? Math.hypot(
          data.visualStickTarget.x - data.position.x,
          data.visualStickTarget.y - data.position.y,
        )
      : Number.POSITIVE_INFINITY
    const arenaMotion = this.arenaAnimation.update({
      deltaMs: Math.min(50, Math.max(0, this.scene.game.loop.delta)),
      velocity: data.velocity,
      bodyRotation: data.facingRotation,
      aimAngle: Math.atan2(data.stickForward.y, data.stickForward.x),
      trackingTargetAngle,
      trackingTargetDistance,
      possessesCore: data.possessesCore,
      mountSign: handednessFrame.mountSign,
      stickState: data.stickState,
      defenseState: data.defenseState,
      charge: chargeVisual.normalized,
      reducedMotion: settings.reducedMotion,
      tuning: settings.proceduralAnimation,
    })
    const movementFactor = Phaser.Math.Clamp(speed / 9, 0, 1)
    const bobAmplitude = Phaser.Math.Linear(
      visualConfig.idleBobAmplitude,
      visualConfig.movementBobAmplitude,
      movementFactor,
    ) * (data.stickState === 'IDLE' ? 0.72 : 0.42)
    const bob = useArenaRenderer
      ? arenaMotion.currentVisualBob
      : settings.reducedMotion
        ? 0
        : Math.sin(
            this.scene.time.now *
              visualConfig.idleBobSpeed *
              settings.animationSpeed +
              this.animationPhase,
          ) * bobAmplitude
    const pose = this.animation.update(
      data.stickState,
      data.defenseState,
      handednessFrame.mountSign,
      handednessFrame.pocketFacingSign,
      this.scene.time.now,
    )
    if (chargeVisual.normalized > 0) {
      const charge = chargeVisual.normalized
      pose.bodyForwardOffset -= charge * 3.5
      pose.bodySideOffset -=
        charge * 2.2 * handednessFrame.mountSign
      pose.bodyScaleX *= Phaser.Math.Linear(1, 1.06, charge)
      pose.bodyScaleY *= Phaser.Math.Linear(1, 0.95, charge)
      pose.anticipation = Math.max(pose.anticipation, charge)
    }
    if (useArenaRenderer) {
      pose.bodyScaleX *= 1 + arenaMotion.currentVisualSquash
      pose.bodyScaleY *= 1 - arenaMotion.currentVisualSquash
      const releaseRecoil = arenaMotion.currentReleaseRecoil
      pose.bodyForwardOffset += releaseRecoil * 5
      pose.bodyRotationOffset +=
        releaseRecoil * 0.07 * handednessFrame.mountSign
      pose.bodyScaleX *= 1 - releaseRecoil * 0.025
      pose.bodyScaleY *= 1 + releaseRecoil * 0.04
    }
    const bodyRotation =
      data.facingRotation +
      pose.bodyRotationOffset +
      (useArenaRenderer ? arenaMotion.currentVisualLean : 0)
    const forward = {
      x: Math.cos(bodyRotation),
      y: Math.sin(bodyRotation),
    }
    const right = { x: -forward.y, y: forward.x }
    const visualForwardOffset =
      pose.bodyForwardOffset +
      (useArenaRenderer ? arenaMotion.currentVisualForwardLean : 0)
    const visualSideOffset =
      pose.bodySideOffset +
      (useArenaRenderer ? arenaMotion.currentVisualSway : 0)
    const visualPosition = {
      x:
        data.position.x +
        forward.x * visualForwardOffset +
        right.x * visualSideOffset,
      y:
        data.position.y +
        bob +
        forward.y * visualForwardOffset +
        right.y * visualSideOffset,
    }
    const arenaSpriteScale =
      settings.spriteScale * settings.proceduralAnimation.playerScaleMultiplier
    const indicatorScale = useArenaRenderer ? arenaSpriteScale : 1

    if (settings.chargeVfx) {
      this.drawChargeAura(
        data.position,
        chargeVisual,
        settings.reducedMotion,
      )
    } else {
      this.chargeAura.clear()
    }
    this.drawShadow(
      data.position,
      speed,
      pose,
      indicatorScale,
      useArenaRenderer ? arenaMotion : undefined,
    )
    this.drawControlledIndicator(data.position, indicatorScale)
    this.character.setVisible(!useArenaRenderer)
    this.assetLayers.forEach((layer) => layer.setVisible(!useArenaRenderer))
    this.stick.setVisible(!useArenaRenderer)
    this.arenaCharacter.setVisible(useArenaRenderer)

    if (useArenaRenderer) {
      this.character.clear()
      const visualStickForward = {
        x: Math.cos(arenaMotion.visualStickAimAngle),
        y: Math.sin(arenaMotion.visualStickAimAngle),
      }
      this.arenaCharacter.update({
        position: visualPosition,
        playerOrigin: data.position,
        velocity: data.velocity,
        bodyRotation,
        mountPoint: data.stickMountPoint,
        stickForward: visualStickForward,
        cradleSocket: data.cradleSocket,
        mirrorSign: handednessFrame.mountSign,
        handedness: settings.handedness,
        role: settings.role,
        state: data.stickState,
        defenseState: data.defenseState,
        pose,
        charge: {
          normalized: chargeVisual.normalized,
          hardCharge: chargeVisual.hardCharge,
          fullyCharged: settings.fullyCharged,
        },
        spriteScale: arenaSpriteScale,
        stickScale: settings.stickScale,
        stickAngle: settings.stickAngle,
        stickLayerMode: settings.stickLayerMode,
        showAnchors: settings.anchorOverlay,
        showContract: settings.contractOverlay,
        chargeVfx: settings.chargeVfx,
        reducedMotion: settings.reducedMotion,
        controlled: this.controlled,
        animationSpeed: settings.animationSpeed,
        proceduralAnimation: arenaMotion,
        now: this.scene.time.now,
      })
      this.corePocketAnchor = this.arenaCharacter.getPocketAnchor()
    } else {
      if (this.assetLayers.length > 0) {
        this.character.clear()
        this.updateAssetCharacter(visualPosition, bodyRotation, pose)
      } else {
        this.drawCharacter(visualPosition, forward, right, pose)
      }
      this.stick.update(
        data.stickMountPoint,
        data.stickForward,
        data.stickSide,
        data.visualMirrorSign,
        data.cradleSocket,
        data.stickState,
        data.defenseState,
        pose,
        chargeVisual,
        this.scene.time.now,
      )
      this.corePocketAnchor = { ...data.cradleSocket }
    }

    this.roleLabel.setPosition(
      data.position.x,
      data.position.y - visualConfig.label.roleOffsetY,
    )
    this.aiStateLabel.setPosition(
      data.position.x,
      data.position.y + visualConfig.label.aiOffsetY,
    )
  }

  getCorePocketAnchor(): Point {
    return { ...this.corePocketAnchor }
  }

  private shouldUseArenaRenderer(
    mode: ArenaCharacterRendererMode,
    inScope: boolean,
  ): boolean {
    if (!inScope || mode === 'legacy') {
      return false
    }

    return mode === 'asset' || this.arenaCharacter.isAssetBacked()
  }

  private resolveArenaVisualSettings(data: PlayerVisualUpdate): {
    rendererMode: ArenaCharacterRendererMode
    inScope: boolean
    handedness: PlayerHandedness
    role: PlayerRole
    spriteScale: number
    stickScale: number
    stickAngle: number
    stickLayerMode: ArenaStickLayerMode
    anchorOverlay: boolean
    contractOverlay: boolean
    chargeVfx: boolean
    reducedMotion: boolean
    animationSpeed: number
    fullyCharged: boolean
    chargeVisual: PlayerVisualUpdate['chargeVisual']
    proceduralAnimation: ArenaProceduralAnimationTuning
  } {
    const launch = getMatchLaunchConfig()
    const defaultInScope =
      arenaCharacterDefaults.rendererScope === 'all' ||
      this.isDefaultArenaControlledPlayer()
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (launch.mode !== 'lab') {
      return {
        rendererMode: arenaCharacterDefaults.rendererMode,
        inScope: defaultInScope,
        handedness: this.options.handedness,
        role: this.options.role,
        spriteScale: arenaCharacterDefaults.spriteScale,
        stickScale: arenaCharacterDefaults.stickScale,
        stickAngle: arenaCharacterDefaults.stickAngle,
        stickLayerMode: arenaCharacterDefaults.stickLayerMode,
        anchorOverlay: false,
        contractOverlay: false,
        chargeVfx: arenaCharacterDefaults.chargeVfx,
        reducedMotion: Boolean(prefersReducedMotion),
        animationSpeed: arenaCharacterDefaults.animationSpeed,
        fullyCharged: data.chargeVisual.normalized >= 0.995,
        chargeVisual: data.chargeVisual,
        proceduralAnimation: arenaProceduralAnimationDefaults,
      }
    }

    const arena = getLabState().arenaVisual
    const inScope =
      arena.characterRendererScope === 'all' || this.controlled
    const previewCharge = arena.forceFullyCharged
      ? 1
      : arena.chargePreview > 0
        ? arena.chargePreview
        : data.chargeVisual.normalized

    return {
      rendererMode: arena.characterRendererMode,
      inScope,
      handedness: inScope
        ? arena.playerHandedness
        : this.options.handedness,
      role: inScope ? arena.playerRole : this.options.role,
      spriteScale: arena.spriteScale,
      stickScale: arena.arenaStickScale,
      stickAngle: arena.arenaStickAngle,
      stickLayerMode: arena.stickLayerMode,
      anchorOverlay: arena.anchorOverlay,
      contractOverlay: arena.contractOverlay,
      chargeVfx: arena.chargeVfx,
      reducedMotion: arena.reducedMotion || Boolean(prefersReducedMotion),
      animationSpeed: arena.animationSpeed,
      fullyCharged: arena.forceFullyCharged || previewCharge >= 0.995,
      chargeVisual: {
        normalized: previewCharge,
        hardCharge:
          arena.forceFullyCharged ||
          previewCharge >= possessionFeelConfig.hardChargeVisualThreshold,
        overcharged:
          arena.forceFullyCharged || data.chargeVisual.overcharged,
      },
      proceduralAnimation: {
        enabled: arena.proceduralAnimation,
        hoverRunEnabled: arena.hoverRunEnabled,
        footShuffle: arena.footShuffle,
        playerScaleMultiplier: arena.playerScaleMultiplier,
        idleBobAmount: arena.idleBobAmount,
        movementBobAmount: arena.movementBobAmount,
        movementBobSpeed: arena.movementBobSpeed,
        squashStretchAmount: arena.squashStretchAmount,
        leanAmount: arena.leanAmount,
        lateralSwayAmount: arena.lateralSwayAmount,
        shadowPulseAmount: arena.shadowPulseAmount,
        coreTrackingEnabled: arena.coreTrackingEnabled,
        stickFollowStrength: arena.stickFollowStrength,
        stickMaxTurnRate: arena.stickMaxTurnRate,
        stickLagClamp: arena.stickLagClamp,
        slashWindupMs: arena.slashWindupMs,
        slashSweepMs: arena.slashSweepMs,
        slashRecoverMs: arena.slashRecoverMs,
        slashArcDegrees: arena.slashArcDegrees,
        chargeLoadAngleMax: arena.chargeLoadAngleMax,
        releaseSnapAmount: arena.releaseSnapAmount,
        releaseRecoilAmount: arena.releaseRecoilAmount,
        quickPassThreshold: arena.quickPassThreshold,
        firmPassThreshold: arena.firmPassThreshold,
        heavyShotThreshold: arena.heavyShotThreshold,
        fullChargeThreshold: arena.fullChargeThreshold,
        slashTrailEnabled: arena.slashTrailEnabled,
        releaseTrailEnabled: arena.releaseTrailEnabled,
        fullChargeBurstEnabled: arena.fullChargeBurstEnabled,
        animationSpeedMultiplier: arena.animationSpeed,
      },
    }
  }

  private isDefaultArenaControlledPlayer(): boolean {
    return (
      this.options.controllerType === 'human' &&
      this.options.role === 'striker'
    )
  }

  private drawChargeAura(
    position: Point,
    charge: PlayerVisualUpdate['chargeVisual'],
    reducedMotion = false,
  ): void {
    this.chargeAura.clear()

    if (
      !possessionFeelConfig.playerChargeAuraEnabled ||
      charge.normalized < possessionFeelConfig.playerChargeAuraThreshold
    ) {
      return
    }

    const progress = Phaser.Math.Clamp(
      (charge.normalized - possessionFeelConfig.playerChargeAuraThreshold) /
        Math.max(0.01, 1 - possessionFeelConfig.playerChargeAuraThreshold),
      0,
      1,
    )
    const flicker =
      charge.overcharged &&
      possessionFeelConfig.overchargeAuraFlicker &&
      !reducedMotion
        ? 0.72 + Math.sin(this.scene.time.now * 0.055) * 0.28
        : 1
    const color = charge.overcharged
      ? possessionFeelConfig.chargeCoreColorOvercharged
      : charge.hardCharge
        ? possessionFeelConfig.chargeCoreColorHard
        : possessionFeelConfig.chargeCoreColorCharging
    const alpha =
      possessionFeelConfig.playerChargeAuraMaxAlpha *
      Phaser.Math.Linear(0.35, 1, progress) *
      flicker
    const radius =
      possessionFeelConfig.playerChargeAuraRadius *
      Phaser.Math.Linear(0.82, 1.12, progress)

    this.chargeAura.lineStyle(4, color, alpha)
    this.chargeAura.strokeCircle(position.x, position.y + 4, radius)
    this.chargeAura.lineStyle(2, color, alpha * 0.55)
    this.chargeAura.strokeCircle(
      position.x,
      position.y + 4,
      radius * 1.22,
    )
  }

  setControlled(controlled: boolean): void {
    this.controlled = controlled
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible
    this.roleLabel.setVisible(visible)
    this.aiStateLabel.setVisible(
      visible && this.options.controllerType === 'ai',
    )
  }

  setAIState(state: string): void {
    this.aiState = state
    this.aiStateLabel.setText(state)
    this.aiStateLabel.setVisible(
      this.debugVisible && this.options.controllerType === 'ai',
    )
  }

  private drawShadow(
    position: Point,
    speed: number,
    pose: PlayerAnimationPose,
    visualMultiplier = 1,
    motion?: ArenaProceduralAnimationFrame,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale * visualMultiplier
    const shadowRoleScale = motion ? 1 : roleScale.shadow
    const stretch = motion ? 0 : Phaser.Math.Clamp(speed * 0.7, 0, 10)
    const motionScaleX = motion?.shadowScaleX ?? 1
    const motionScaleY = motion?.shadowScaleY ?? 1
    this.shadow.clear()
    this.shadow.fillStyle(visualConfig.shadowColor, visualConfig.shadowAlpha)
    this.shadow.fillEllipse(
      position.x,
      position.y + visualConfig.shadowOffsetY,
      (visualConfig.shadowWidth + stretch) *
        visualScale *
        shadowRoleScale *
        pose.shadowScale *
        motionScaleX,
      visualConfig.shadowHeight *
        visualScale *
        pose.shadowScale *
        motionScaleY,
    )
  }

  private updateAssetCharacter(
    position: Point,
    rotation: number,
    pose: PlayerAnimationPose,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const width =
      assetOverrideConfig.players.displayWidth *
      roleScale.bodyX *
      pose.bodyScaleX
    const height =
      assetOverrideConfig.players.displayHeight *
      roleScale.bodyY *
      pose.bodyScaleY

    for (const layer of this.assetLayers) {
      layer
        .setPosition(position.x, position.y)
        .setRotation(rotation)
        .setDisplaySize(width, height)
    }
  }

  private drawControlledIndicator(
    position: Point,
    visualMultiplier = 1,
  ): void {
    this.controlledIndicator.clear()
    if (!this.controlled) {
      return
    }

    const radius = visualConfig.controlledRingRadius * visualMultiplier
    this.controlledIndicator.lineStyle(
      visualConfig.controlledRingWidth,
      visualConfig.controlledRingColor,
      visualConfig.controlledRingAlpha,
    )
    this.controlledIndicator.strokeCircle(
      position.x,
      position.y,
      radius,
    )
    this.controlledIndicator.fillStyle(this.palette.trim, 1)
    this.controlledIndicator.fillTriangle(
      position.x,
      position.y - radius - 12,
      position.x - 7,
      position.y - radius - 23,
      position.x + 7,
      position.y - radius - 23,
    )
  }

  private drawCharacter(
    position: Point,
    forward: Point,
    right: Point,
    pose: PlayerAnimationPose,
  ): void {
    const roleScale = visualConfig.roleScale[this.options.role]
    const visualScale = visualConfig.playerScale
    const bodyLength =
      visualConfig.torsoLength *
      roleScale.bodyY *
      visualScale *
      pose.bodyScaleY
    const bodyWidth =
      visualConfig.torsoWidth *
      roleScale.bodyX *
      visualScale *
      pose.bodyScaleX
    const headRadius =
      visualConfig.headRadius * roleScale.head * visualScale
    const bodyCenter = this.offset(
      position,
      forward,
      -4 * visualScale,
      right,
      0,
    )
    const headCenter = this.offset(
      position,
      forward,
      visualConfig.headForwardOffset * visualScale +
        pose.headForwardOffset,
      right,
      0,
    )

    this.character.clear()
    this.drawLowerBody(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawTorso(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawRoleAccent(bodyCenter, forward, right, bodyLength, bodyWidth)
    this.drawAthleticStance(
      bodyCenter,
      forward,
      right,
      bodyLength,
      bodyWidth,
      pose,
    )
    this.drawHead(headCenter, forward, right, headRadius)
  }

  private drawLowerBody(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const shortsCenter = this.offset(
      center,
      forward,
      -length * 0.48,
      right,
      0,
    )

    this.fillAndStrokePolygon(
      this.createOrientedEllipse(
        shortsCenter,
        forward,
        right,
        length * 0.3,
        width * 0.48,
        16,
      ),
      this.palette.shorts,
    )

    this.character.fillStyle(this.palette.trim, 0.92)
    this.character.fillCircle(
      shortsCenter.x,
      shortsCenter.y,
      Math.max(2.2, visualConfig.playerScale * 3),
    )

    for (const side of [-1, 1]) {
      const shoe = this.offset(
        shortsCenter,
        forward,
        -length * 0.27,
        right,
        width * 0.23 * side,
      )
      this.fillAndStrokePolygon(
        this.createOrientedEllipse(
          shoe,
          forward,
          right,
          length * 0.11,
          width * 0.12,
          10,
        ),
        visualConfig.outlineColor,
      )
    }
  }

  private drawAthleticStance(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
    pose: PlayerAnimationPose,
  ): void {
    const mountSign =
      getHandednessFrame(this.options.handedness).mountSign
    const shoulderSide = width * 0.3 * mountSign
    const rearShoulderSide = -width * 0.26 * mountSign
    const handSide = width * 0.55 * mountSign
    const rearSide = -width * 0.42 * mountSign
    const frontShoulder = this.offset(
      center,
      forward,
      length * 0.12,
      right,
      shoulderSide,
    )
    const rearShoulder = this.offset(
      center,
      forward,
      -length * 0.18,
      right,
      rearShoulderSide,
    )
    const frontHand = this.offset(
      center,
      forward,
      length * (0.36 + pose.impact * 0.1),
      right,
      handSide,
    )
    const rearHand = this.offset(
      center,
      forward,
      -length * 0.04,
      right,
      rearSide,
    )
    const armColor =
      this.options.profile.skinColor ?? visualConfig.skinColor
    const armWidth = Math.max(4, visualConfig.playerScale * 6)

    this.character.lineStyle(
      armWidth + 3,
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.lineBetween(
      frontShoulder.x,
      frontShoulder.y,
      frontHand.x,
      frontHand.y,
    )
    this.character.lineBetween(
      rearShoulder.x,
      rearShoulder.y,
      rearHand.x,
      rearHand.y,
    )
    this.character.lineStyle(armWidth, armColor, 1)
    this.character.lineBetween(
      frontShoulder.x,
      frontShoulder.y,
      frontHand.x,
      frontHand.y,
    )
    this.character.lineBetween(
      rearShoulder.x,
      rearShoulder.y,
      rearHand.x,
      rearHand.y,
    )
    this.character.fillStyle(this.palette.trim, 1)
    this.character.fillCircle(frontHand.x, frontHand.y, armWidth * 0.55)
    this.character.fillCircle(rearHand.x, rearHand.y, armWidth * 0.55)
  }

  private drawTorso(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const halfLength = length * 0.54
    const halfWidth = width * 0.48

    this.fillAndStrokePolygon(
      this.createOrientedEllipse(
        center,
        forward,
        right,
        halfLength,
        halfWidth,
        18,
      ),
      this.palette.shirt,
    )
    this.drawLocalLine(
      center,
      forward,
      right,
      halfLength * 0.5,
      -halfWidth * 0.62,
      halfLength * 0.5,
      halfWidth * 0.62,
      this.palette.trim,
      Math.max(2.5, visualConfig.playerScale * 3.6),
    )

    const shadeCenter = this.offset(
      center,
      forward,
      -halfLength * 0.1,
      right,
      halfWidth * 0.36,
    )
    this.fillPolygon(
      this.createOrientedEllipse(
        shadeCenter,
        forward,
        right,
        halfLength * 0.72,
        halfWidth * 0.42,
        14,
      ),
      this.palette.shirtShade,
      0.5,
    )

    for (const side of [-1, 1]) {
      this.drawLocalLine(
        center,
        forward,
        right,
        halfLength * 0.34,
        halfWidth * 0.66 * side,
        -halfLength * 0.46,
        halfWidth * 0.74 * side,
        this.palette.trim,
        Math.max(2, visualConfig.playerScale * 2.6),
      )
    }

    const collar = this.offset(
      center,
      forward,
      halfLength * 0.6,
      right,
      0,
    )
    this.character.fillStyle(visualConfig.outlineColor, 0.9)
    this.character.fillCircle(collar.x, collar.y, 5.2)
    this.character.fillStyle(this.palette.trim, 1)
    this.character.fillCircle(collar.x, collar.y, 3.1)

    const jerseyMark = this.offset(
      center,
      forward,
      -halfLength * 0.12,
      right,
      -halfWidth * 0.08,
    )
    this.character.fillStyle(visualConfig.outlineColor, 0.34)
    this.character.fillCircle(jerseyMark.x, jerseyMark.y, 4.4)
    this.character.fillStyle(this.palette.trim, 0.9)
    this.character.fillCircle(jerseyMark.x, jerseyMark.y, 2.7)
  }

  private drawRoleAccent(
    center: Point,
    forward: Point,
    right: Point,
    length: number,
    width: number,
  ): void {
    const accent = roleAccentColors[this.options.role]
    const visualScale = visualConfig.playerScale

    switch (this.options.role) {
      case 'keeper': {
        const shoulderOffset = width * 0.52
        for (const side of [-1, 1]) {
          const shoulder = this.offset(
            center,
            forward,
            length * 0.12,
            right,
            shoulderOffset * side,
          )
          this.character.fillStyle(visualConfig.outlineColor, 1)
          this.character.fillCircle(
            shoulder.x,
            shoulder.y,
            8.5 * visualScale,
          )
          this.character.fillStyle(accent, 1)
          this.character.fillCircle(shoulder.x, shoulder.y, 6 * visualScale)
        }
        this.drawLocalLine(
          center,
          forward,
          right,
          length * 0.2,
          -width * 0.34,
          length * 0.2,
          width * 0.34,
          accent,
          5 * visualScale,
        )
        break
      }
      case 'striker':
        this.drawLocalLine(
          center,
          forward,
          right,
          -length * 0.35,
          0,
          length * 0.44,
          0,
          accent,
          6 * visualScale,
        )
        break
      case 'support':
        this.drawLocalLine(
          center,
          forward,
          right,
          -length * 0.34,
          0,
          length * 0.35,
          0,
          accent,
          4 * visualScale,
        )
        this.drawLocalLine(
          center,
          forward,
          right,
          0,
          -width * 0.3,
          0,
          width * 0.3,
          accent,
          4 * visualScale,
        )
        break
      case 'brute': {
        const padOffset = width * 0.52
        for (const side of [-1, 1]) {
          const pad = this.offset(
            center,
            forward,
            0,
            right,
            padOffset * side,
          )
          this.character.fillStyle(visualConfig.outlineColor, 1)
          this.character.fillCircle(pad.x, pad.y, 10 * visualScale)
          this.character.fillStyle(accent, 1)
          this.character.fillCircle(pad.x, pad.y, 7.2 * visualScale)
        }
        break
      }
    }
  }

  private drawHead(
    center: Point,
    forward: Point,
    right: Point,
    radius: number,
  ): void {
    this.character.fillStyle(
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.fillCircle(center.x, center.y, radius + 3.1)
    this.character.fillStyle(
      this.options.profile.skinColor ?? visualConfig.skinColor,
      1,
    )
    this.character.fillCircle(center.x, center.y, radius)

    for (const side of [-1, 1]) {
      const ear = this.offset(
        center,
        forward,
        -radius * 0.02,
        right,
        radius * 0.82 * side,
      )
      this.character.fillStyle(visualConfig.outlineColor, 0.9)
      this.character.fillCircle(ear.x, ear.y, radius * 0.25)
      this.character.fillStyle(
        this.options.profile.skinColor ?? visualConfig.skinColor,
        1,
      )
      this.character.fillCircle(ear.x, ear.y, radius * 0.17)
    }

    const faceShade = this.offset(center, forward, -1, right, radius * 0.42)
    this.character.fillStyle(
      this.options.profile.skinShadeColor ??
        visualConfig.skinShadeColor,
      0.42,
    )
    this.character.fillCircle(faceShade.x, faceShade.y, radius * 0.58)

    const crownCenter = this.offset(
      center,
      forward,
      -radius * 0.28,
      right,
      0,
    )
    const crownPoints = this.createOrientedEllipse(
      crownCenter,
      forward,
      right,
      radius * this.hairStyle.crownScaleY * 1.08,
      radius * this.hairStyle.crownScaleX * 1.12,
      16,
    )
    this.fillAndStrokePolygon(
      crownPoints,
      this.options.profile.hairColor,
    )

    if (this.hairStyle.id === 'spikes' || this.hairStyle.id === 'tuft') {
      for (const side of [-1, 1]) {
        const tuftBase = this.offset(
          crownCenter,
          forward,
          -radius * 0.55,
          right,
          radius * 0.52 * side,
        )
        const tuftLeft = this.offset(
          tuftBase,
          forward,
          0,
          right,
          -radius * 0.22,
        )
        const tuftRight = this.offset(
          tuftBase,
          forward,
          0,
          right,
          radius * 0.22,
        )
        const tuftTip = this.offset(
          tuftBase,
          forward,
          -radius * 0.48,
          right,
          radius * 0.16 * side,
        )
        this.fillAndStrokePolygon(
          [tuftLeft, tuftRight, tuftTip],
          this.options.profile.hairColor,
        )
      }
    }

    this.drawHairFringe(center, forward, right, radius)

    const hairShine = this.offset(
      crownCenter,
      forward,
      -radius * 0.16,
      right,
      -radius * 0.28,
    )
    this.character.fillStyle(this.palette.trim, 0.2)
    this.character.fillEllipse(
      hairShine.x,
      hairShine.y,
      radius * 0.46,
      radius * 0.2,
    )

    const eyeLine = this.offset(center, forward, radius * 0.55, right, 0)
    this.character.fillStyle(visualConfig.outlineColor, 0.84)
    for (const side of [-1, 1]) {
      const eye = this.offset(eyeLine, forward, 0, right, radius * 0.2 * side)
      this.character.fillCircle(
        eye.x,
        eye.y,
        Math.max(1.35, visualConfig.playerScale * 1.9),
      )
    }
    const nose = this.offset(center, forward, radius * 0.7, right, 0)
    this.character.fillStyle(this.palette.trim, 0.52)
    this.character.fillCircle(
      nose.x,
      nose.y,
      Math.max(0.95, visualConfig.playerScale * 1.25),
    )
  }

  private createOrientedEllipse(
    center: Point,
    forward: Point,
    right: Point,
    forwardRadius: number,
    rightRadius: number,
    segments: number,
  ): Point[] {
    const points: Point[] = []

    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2
      points.push(
        this.offset(
          center,
          forward,
          Math.cos(angle) * forwardRadius,
          right,
          Math.sin(angle) * rightRadius,
        ),
      )
    }

    return points
  }

  private drawHairFringe(
    center: Point,
    forward: Point,
    right: Point,
    radius: number,
  ): void {
    const fringe = this.hairStyle.fringe

    fringe.forEach((offset, index) => {
      const side = fringe.length === 1 ? 0 : index / (fringe.length - 1) - 0.5
      const base = this.offset(
        center,
        forward,
        radius * 0.12,
        right,
        side * radius * 1.25 + offset * radius * 0.08,
      )
      const left = this.offset(base, forward, 0, right, -radius * 0.24)
      const rightPoint = this.offset(base, forward, 0, right, radius * 0.24)
      const tip = this.offset(
        base,
        forward,
        radius * (0.5 + Math.abs(offset) * 0.06),
        right,
        offset * radius * 0.1,
      )
      this.fillAndStrokePolygon(
        [left, rightPoint, tip],
        this.options.profile.hairColor,
      )
    })
  }

  private drawLocalLine(
    center: Point,
    forward: Point,
    right: Point,
    startForward: number,
    startRight: number,
    endForward: number,
    endRight: number,
    color: number,
    width: number,
  ): void {
    const start = this.offset(
      center,
      forward,
      startForward,
      right,
      startRight,
    )
    const end = this.offset(center, forward, endForward, right, endRight)
    this.character.lineStyle(width, color, 1)
    this.character.lineBetween(start.x, start.y, end.x, end.y)
  }

  private fillAndStrokePolygon(points: Point[], color: number): void {
    this.character.fillStyle(color, 1)
    this.character.lineStyle(
      visualConfig.outlineWidth,
      visualConfig.outlineColor,
      visualConfig.outlineAlpha,
    )
    this.character.beginPath()
    this.character.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => {
      this.character.lineTo(point.x, point.y)
    })
    this.character.closePath()
    this.character.fillPath()
    this.character.strokePath()
  }

  private fillPolygon(points: Point[], color: number, alpha: number): void {
    this.character.fillStyle(color, alpha)
    this.character.beginPath()
    this.character.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => {
      this.character.lineTo(point.x, point.y)
    })
    this.character.closePath()
    this.character.fillPath()
  }

  private offset(
    origin: Point,
    forward: Point,
    forwardAmount: number,
    right: Point,
    rightAmount: number,
  ): Point {
    return {
      x: origin.x + forward.x * forwardAmount + right.x * rightAmount,
      y: origin.y + forward.y * forwardAmount + right.y * rightAmount,
    }
  }

  private getRoleLabel(): string {
    const handedness = stickConfig.handednessDebugEnabled
      ? ` | ${this.options.handedness.toUpperCase()}`
      : ''

    return `${this.options.id} | ${this.options.role.toUpperCase()}${handedness} | ${this.options.playStyle.toUpperCase()} | ${this.options.profile.stickStyle.toUpperCase()}`
  }

  private hash(value: string): number {
    let result = 0
    for (let index = 0; index < value.length; index += 1) {
      result = (result * 31 + value.charCodeAt(index)) >>> 0
    }
    return result
  }
}

function shade(color: number, multiplier: number): number {
  const red = Math.round(((color >> 16) & 0xff) * multiplier)
  const green = Math.round(((color >> 8) & 0xff) * multiplier)
  const blue = Math.round((color & 0xff) * multiplier)

  return (red << 16) | (green << 8) | blue
}
