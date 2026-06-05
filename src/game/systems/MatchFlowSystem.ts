import { matchFlowConfig } from '../config/matchFlowConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { GoalCelebrationSystem } from './GoalCelebrationSystem'

export type MatchFlowState =
  | 'PLAYING'
  | 'GOAL_SCORED'
  | 'CELEBRATING'
  | 'RESETTING_FORMATION'
  | 'COUNTDOWN'

type MatchFlowCallbacks = {
  onResetFormation: () => void
  onResumePlay: () => void
}

export class MatchFlowSystem {
  private readonly celebration: GoalCelebrationSystem
  private readonly callbacks: MatchFlowCallbacks
  private state: MatchFlowState = 'PLAYING'
  private timerMs = 0
  private countdownValue = 0
  private lastScorer: TeamSide | null = null

  constructor(
    celebration: GoalCelebrationSystem,
    callbacks: MatchFlowCallbacks,
  ) {
    this.celebration = celebration
    this.callbacks = callbacks
  }

  scoreGoal(side: TeamSide, point: Point): boolean {
    if (!this.isPlaying()) {
      return false
    }

    this.state = 'GOAL_SCORED'
    this.lastScorer = side

    if (matchFlowConfig.enableGoalCelebration) {
      this.state = 'CELEBRATING'
      this.timerMs = matchFlowConfig.goalCelebrationMs
      this.celebration.showGoal(side, point)
    } else {
      this.beginFormationReset()
    }

    return true
  }

  update(deltaMs: number): void {
    this.celebration.update(deltaMs)

    if (this.state === 'CELEBRATING') {
      this.timerMs = Math.max(0, this.timerMs - deltaMs)

      if (this.timerMs === 0) {
        this.beginFormationReset()
      }
      return
    }

    if (this.state !== 'COUNTDOWN') {
      return
    }

    this.timerMs = Math.max(0, this.timerMs - deltaMs)

    if (this.timerMs > 0) {
      return
    }

    if (this.countdownValue > 1) {
      this.countdownValue -= 1
      this.timerMs = matchFlowConfig.resetCountdownStepMs
      this.celebration.showCountdown(String(this.countdownValue))
      return
    }

    if (this.countdownValue === 1) {
      this.countdownValue = 0
      this.timerMs = matchFlowConfig.resetCountdownStepMs
      this.celebration.showCountdown('GO')
      return
    }

    this.resumePlay()
  }

  isPlaying(): boolean {
    return this.state === 'PLAYING'
  }

  getState(): MatchFlowState {
    return this.state
  }

  getTimerMs(): number {
    return this.timerMs
  }

  getCountdownLabel(): string {
    if (this.state !== 'COUNTDOWN') {
      return '-'
    }

    return this.countdownValue === 0
      ? 'GO'
      : String(this.countdownValue)
  }

  getLastScorer(): TeamSide | null {
    return this.lastScorer
  }

  reset(): void {
    this.state = 'PLAYING'
    this.timerMs = 0
    this.countdownValue = 0
    this.lastScorer = null
    this.celebration.hide()
  }

  destroy(): void {
    this.celebration.destroy()
  }

  private beginFormationReset(): void {
    this.state = 'RESETTING_FORMATION'
    this.celebration.hide()
    this.callbacks.onResetFormation()

    if (matchFlowConfig.enableResetCountdown) {
      this.state = 'COUNTDOWN'
      this.countdownValue = Math.max(
        1,
        Math.round(matchFlowConfig.resetCountdownStart),
      )
      this.timerMs = matchFlowConfig.resetCountdownStepMs
      this.celebration.showCountdown(String(this.countdownValue))
      return
    }

    this.resumePlay()
  }

  private resumePlay(): void {
    this.state = 'PLAYING'
    this.timerMs = 0
    this.countdownValue = 0
    this.celebration.hide()
    this.callbacks.onResumePlay()
  }
}
