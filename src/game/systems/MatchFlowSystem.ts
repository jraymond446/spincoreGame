import { matchFlowConfig } from '../config/matchFlowConfig'
import type { Point } from '../data/geometry'
import type { TeamSide } from '../data/matchTypes'
import { GoalCelebrationSystem } from './GoalCelebrationSystem'

export type MatchFlowState =
  | 'INTRO'
  | 'PLAYING'
  | 'GOAL_SCORED'
  | 'CELEBRATING'
  | 'RESETTING_FORMATION'
  | 'COUNTDOWN'
  | 'MATCH_COMPLETE'

type MatchFlowCallbacks = {
  onResetFormation: () => void
  onResumePlay: () => void
  onMatchComplete: () => void
}

export class MatchFlowSystem {
  private readonly celebration: GoalCelebrationSystem
  private readonly callbacks: MatchFlowCallbacks
  private state: MatchFlowState = 'PLAYING'
  private timerMs = 0
  private countdownValue = 0
  private countdownStepMs = matchFlowConfig.resetCountdownStepMs
  private lastScorer: TeamSide | null = null
  private finalGoalPending = false

  constructor(
    celebration: GoalCelebrationSystem,
    callbacks: MatchFlowCallbacks,
  ) {
    this.celebration = celebration
    this.callbacks = callbacks
  }

  startMatch(title: string, subtitle: string): void {
    this.lastScorer = null
    this.finalGoalPending = false

    if (matchFlowConfig.enableMatchIntro) {
      this.state = 'INTRO'
      this.timerMs = matchFlowConfig.matchIntroMs
      this.celebration.showIntro(title, subtitle)
      return
    }

    this.beginInitialCountdown()
  }

  scoreGoal(
    side: TeamSide,
    point: Point,
    completesMatch = false,
  ): boolean {
    if (!this.isPlaying()) {
      return false
    }

    this.state = 'GOAL_SCORED'
    this.lastScorer = side
    this.finalGoalPending = completesMatch

    if (matchFlowConfig.enableGoalCelebration) {
      this.state = 'CELEBRATING'
      this.timerMs = matchFlowConfig.goalCelebrationMs
      this.celebration.showGoal(side, point)
    } else {
      this.finishGoalSequence()
    }

    return true
  }

  restartForFaceoff(): boolean {
    if (!this.isPlaying()) {
      return false
    }

    this.lastScorer = null
    this.beginFormationReset()
    return true
  }

  update(deltaMs: number): void {
    this.celebration.update(deltaMs)

    if (this.state === 'INTRO') {
      this.timerMs = Math.max(0, this.timerMs - deltaMs)

      if (this.timerMs === 0) {
        this.beginInitialCountdown()
      }
      return
    }

    if (this.state === 'CELEBRATING') {
      this.timerMs = Math.max(0, this.timerMs - deltaMs)

      if (this.timerMs === 0) {
        this.finishGoalSequence()
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
      this.timerMs = this.countdownStepMs
      this.celebration.showCountdown(String(this.countdownValue))
      return
    }

    if (this.countdownValue === 1) {
      this.countdownValue = 0
      this.timerMs = this.countdownStepMs
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
    this.countdownStepMs = matchFlowConfig.resetCountdownStepMs
    this.lastScorer = null
    this.finalGoalPending = false
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
      this.beginCountdown(
        matchFlowConfig.resetCountdownStart,
        matchFlowConfig.resetCountdownStepMs,
      )
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

  private finishGoalSequence(): void {
    if (this.finalGoalPending) {
      this.state = 'MATCH_COMPLETE'
      this.timerMs = 0
      this.celebration.hide()
      this.callbacks.onMatchComplete()
      return
    }

    this.beginFormationReset()
  }

  private beginInitialCountdown(): void {
    this.beginCountdown(
      matchFlowConfig.initialCountdownStart,
      matchFlowConfig.initialCountdownStepMs,
    )
  }

  private beginCountdown(start: number, stepMs: number): void {
    this.state = 'COUNTDOWN'
    this.countdownValue = Math.max(1, Math.round(start))
    this.countdownStepMs = Math.max(1, stepMs)
    this.timerMs = this.countdownStepMs
    this.celebration.showCountdown(String(this.countdownValue))
  }
}
