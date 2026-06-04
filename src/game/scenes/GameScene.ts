import Phaser from 'phaser'
import { coreConfig } from '../config/entityConfig'
import { Core } from '../entities/Core'
import { GoalGate } from '../entities/GoalGate'
import { Player } from '../entities/Player'
import { initialScoreState, scoreLabels, type ScoreState } from '../data/scoreData'
import type { Point } from '../data/geometry'
import { GoalRule, type GoalCrossing } from '../rules/GoalRule'
import { ArenaSystem } from '../systems/ArenaSystem'
import { InputController } from '../systems/InputController'
import { StickContactSystem } from '../systems/StickContactSystem'

export class GameScene extends Phaser.Scene {
  private core!: Core
  private goalGate!: GoalGate
  private goalRule!: GoalRule
  private inputController!: InputController
  private player!: Player
  private stickContactSystem!: StickContactSystem
  private scoreText!: Phaser.GameObjects.Text
  private scoreState: ScoreState = { ...initialScoreState }

  constructor() {
    super('GameScene')
  }

  create(): void {
    this.matter.world.setGravity(0, 0)
    this.cameras.main.setBackgroundColor('#071016')

    new ArenaSystem(this)
    this.goalGate = new GoalGate(this)
    this.core = new Core(this)
    this.player = new Player(this)
    this.inputController = new InputController(this)
    this.stickContactSystem = new StickContactSystem()
    this.goalRule = new GoalRule(this.core.position)

    this.createHud()
  }

  update(_time: number, delta: number): void {
    const movement = this.inputController.getMovementVector()
    const aimAngle = this.inputController.getAimAngle(this.player.position)

    this.player.update(movement, aimAngle)
    this.stickContactSystem.update(this.core, this.player)
    this.core.update()
    this.goalGate.update(delta)

    const crossing = this.goalRule.check(this.core.position, this.goalGate)

    if (crossing) {
      this.scoreGoal(crossing)
    }
  }

  private createHud(): void {
    this.scoreText = this.add.text(34, 28, '', {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: '700',
      color: '#d7fbff',
      lineSpacing: 7,
    })
    this.scoreText.setShadow(0, 0, '#2eeeff', 12, true, true)
    this.scoreText.setDepth(10)

    this.updateHud()
  }

  private scoreGoal(crossing: GoalCrossing): void {
    this.scoreState = {
      goals: this.scoreState.goals + 1,
      lastCall: crossing.directionSign > 0 ? scoreLabels.forward : scoreLabels.reverse,
    }

    this.goalGate.flash()
    this.burstAt(crossing.impactPoint)
    this.core.reset()
    this.goalRule.reset({
      x: coreConfig.spawn.x,
      y: coreConfig.spawn.y,
    })
    this.updateHud()
  }

  private updateHud(): void {
    this.scoreText.setText(
      `${scoreLabels.title}\n${scoreLabels.goals} ${this.scoreState.goals}\n${scoreLabels.last} ${this.scoreState.lastCall}`,
    )
  }

  private burstAt(point: Point): void {
    const burst = this.add.graphics()

    burst.lineStyle(4, 0xf8fbff, 0.9)
    burst.strokeCircle(point.x, point.y, 32)
    burst.lineStyle(2, 0x67f4ff, 0.8)
    burst.strokeCircle(point.x, point.y, 52)
    burst.setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.8,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        burst.destroy()
      },
    })
  }
}
