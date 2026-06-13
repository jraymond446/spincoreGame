import Phaser from 'phaser'
import { matchFlowConfig } from '../config/matchFlowConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'

export class GoalCelebrationSystem {
  private readonly scene: Phaser.Scene
  private readonly root: HTMLDivElement
  private readonly title: HTMLDivElement
  private readonly subtitle: HTMLDivElement
  private readonly graphics: Phaser.GameObjects.Graphics
  private effectElapsedMs = 0
  private effectDurationMs = 0
  private textRemainingMs = 0
  private effectPoint: Point | null = null

  constructor(scene: Phaser.Scene, hudRoot: HTMLDivElement) {
    this.scene = scene
    this.root = document.createElement('div')
    this.root.className = 'match-flow-overlay'
    this.title = document.createElement('div')
    this.title.className = 'match-flow-title'
    this.subtitle = document.createElement('div')
    this.subtitle.className = 'match-flow-subtitle'
    this.root.append(this.title, this.subtitle)
    this.root.hidden = true
    hudRoot.appendChild(this.root)
    this.graphics = scene.add.graphics().setDepth(24)
  }

  showGoal(side: TeamSide, point: Point): void {
    this.root.hidden = false
    this.root.classList.remove('is-intro')
    this.root.classList.add('is-goal')
    this.title.textContent = 'GOAL!'
    this.subtitle.textContent = `TEAM ${side} SCORES`
    this.effectPoint = { ...point }
    this.effectElapsedMs = 0
    this.effectDurationMs = matchFlowConfig.goalCelebrationMs
    this.textRemainingMs = matchFlowConfig.goalTextDurationMs
    this.scene.cameras.main.shake(150, 0.0022)
    this.drawGoalRipple()
  }

  showCountdown(label: string): void {
    this.root.hidden = false
    this.root.classList.remove('is-goal', 'is-intro')
    this.title.textContent = label
    this.subtitle.textContent = label === 'GO' ? 'PLAY' : 'FACE OFF'
  }

  showIntro(title: string, subtitle: string): void {
    this.root.hidden = false
    this.root.classList.remove('is-goal')
    this.root.classList.add('is-intro')
    this.title.textContent = title
    this.subtitle.textContent = subtitle
  }

  update(deltaMs: number): void {
    if (this.root.classList.contains('is-goal')) {
      this.textRemainingMs = Math.max(0, this.textRemainingMs - deltaMs)

      if (this.textRemainingMs === 0) {
        this.root.hidden = true
      }
    }

    if (!this.effectPoint || this.effectDurationMs <= 0) {
      return
    }

    this.effectElapsedMs += deltaMs

    if (this.effectElapsedMs >= this.effectDurationMs) {
      this.effectPoint = null
      this.graphics.clear()
      return
    }

    this.drawGoalRipple()
  }

  hide(): void {
    this.root.hidden = true
    this.root.classList.remove('is-goal', 'is-intro')
    this.graphics.clear()
    this.effectPoint = null
    this.textRemainingMs = 0
  }

  destroy(): void {
    this.graphics.destroy()
    this.root.remove()
  }

  private drawGoalRipple(): void {
    if (!this.effectPoint) {
      return
    }

    const progress = Phaser.Math.Clamp(
      this.effectElapsedMs / Math.max(1, this.effectDurationMs),
      0,
      1,
    )
    const alpha = 1 - progress

    this.graphics.clear()
    this.graphics.lineStyle(5, 0xffffff, alpha * 0.92)
    this.graphics.strokeCircle(
      this.effectPoint.x,
      this.effectPoint.y,
      28 + progress * 105,
    )
    this.graphics.lineStyle(3, 0x67f4ff, alpha * 0.82)
    this.graphics.strokeCircle(
      this.effectPoint.x,
      this.effectPoint.y,
      58 + progress * 150,
    )

    const rayRadius = 34 + progress * 118
    this.graphics.lineStyle(5, 0xffdc83, alpha * 0.74)
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 + progress * 0.22
      const inner = rayRadius - 12
      const outer = rayRadius + 15
      this.graphics.lineBetween(
        this.effectPoint.x + Math.cos(angle) * inner,
        this.effectPoint.y + Math.sin(angle) * inner,
        this.effectPoint.x + Math.cos(angle) * outer,
        this.effectPoint.y + Math.sin(angle) * outer,
      )
    }
  }
}
