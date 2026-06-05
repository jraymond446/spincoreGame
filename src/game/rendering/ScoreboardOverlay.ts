import {
  arenaPresentationConfig,
  getScoreboardReservedHeight,
} from '../config/arenaPresentationConfig'
import type { GameMode } from '../config/gameplayConfig'
import type { TeamSide } from '../data/matchTypes'
import type { MatchStats } from '../systems/MatchStatsTracker'

export type ScoreboardViewModel = {
  gameMode: GameMode
  score: Record<TeamSide, number>
  firstTo: number
  winner: TeamSide | null
  stats: MatchStats
}

type ScoreboardElements = {
  mode: HTMLElement
  teamAName: HTMLElement
  teamBName: HTMLElement
  teamAScore: HTMLElement
  teamBScore: HTMLElement
  centerLabel: HTMLElement
  aAssists: HTMLElement
  aChecks: HTMLElement
  aSaves: HTMLElement
  bAssists: HTMLElement
  bChecks: HTMLElement
  bSaves: HTMLElement
}

export class ScoreboardOverlay {
  private readonly element: HTMLElement
  private readonly elements: ScoreboardElements
  private lastView = ''

  constructor(
    hudRoot: HTMLElement,
    teamNames: Record<TeamSide, string>,
  ) {
    this.element = document.createElement('section')
    this.element.className = 'sports-scoreboard'
    this.element.setAttribute('aria-label', 'Spincore match scoreboard')
    this.element.style.setProperty(
      '--sports-scoreboard-height',
      `${arenaPresentationConfig.scoreboardHeight}px`,
    )
    this.element.innerHTML = `
      <div class="sports-scoreboard-brand">
        <strong>SPINCORE</strong>
        <span data-scoreboard-mode>LIVE MATCH</span>
      </div>
      <div class="sports-scoreboard-team is-team-a">
        <span class="sports-scoreboard-team-name" data-team-a-name></span>
        <strong class="sports-scoreboard-score" data-team-a-score>0</strong>
      </div>
      <div class="sports-scoreboard-center">
        <span data-scoreboard-center>FIRST TO 5</span>
      </div>
      <div class="sports-scoreboard-team is-team-b">
        <strong class="sports-scoreboard-score" data-team-b-score>0</strong>
        <span class="sports-scoreboard-team-name" data-team-b-name></span>
      </div>
      <div class="sports-scoreboard-stats">
        <span class="is-team-a">A</span>
        <span><b data-a-assists>0</b> AST</span>
        <span><b data-a-checks>0</b> CHK</span>
        <span><b data-a-saves>0</b> SAV</span>
        <i>LIVE STATS</i>
        <span><b data-b-assists>0</b> AST</span>
        <span><b data-b-checks>0</b> CHK</span>
        <span><b data-b-saves>0</b> SAV</span>
        <span class="is-team-b">B</span>
      </div>
    `
    hudRoot.appendChild(this.element)

    this.elements = {
      mode: required(this.element, '[data-scoreboard-mode]'),
      teamAName: required(this.element, '[data-team-a-name]'),
      teamBName: required(this.element, '[data-team-b-name]'),
      teamAScore: required(this.element, '[data-team-a-score]'),
      teamBScore: required(this.element, '[data-team-b-score]'),
      centerLabel: required(this.element, '[data-scoreboard-center]'),
      aAssists: required(this.element, '[data-a-assists]'),
      aChecks: required(this.element, '[data-a-checks]'),
      aSaves: required(this.element, '[data-a-saves]'),
      bAssists: required(this.element, '[data-b-assists]'),
      bChecks: required(this.element, '[data-b-checks]'),
      bSaves: required(this.element, '[data-b-saves]'),
    }
    this.elements.teamAName.textContent = teamNames.A.toUpperCase()
    this.elements.teamBName.textContent = teamNames.B.toUpperCase()
    this.element.classList.toggle(
      'is-stats-hidden',
      !arenaPresentationConfig.showScoreboardStats,
    )
  }

  update(view: ScoreboardViewModel): void {
    const serialized = JSON.stringify(view)

    if (serialized === this.lastView) {
      return
    }

    this.lastView = serialized
    this.elements.mode.textContent =
      view.gameMode === 'stickLab' ? 'STICK LAB' : 'LIVE MATCH'
    this.elements.teamAScore.textContent = String(view.score.A)
    this.elements.teamBScore.textContent = String(view.score.B)
    this.elements.centerLabel.textContent = view.winner
      ? `TEAM ${view.winner} WINS`
      : `FIRST TO ${view.firstTo}`
    this.elements.aAssists.textContent = String(view.stats.A.assists)
    this.elements.aChecks.textContent = String(view.stats.A.checks)
    this.elements.aSaves.textContent = String(view.stats.A.saves)
    this.elements.bAssists.textContent = String(view.stats.B.assists)
    this.elements.bChecks.textContent = String(view.stats.B.checks)
    this.elements.bSaves.textContent = String(view.stats.B.saves)
    this.element.classList.toggle('is-stick-lab', view.gameMode === 'stickLab')
    this.element.classList.toggle('has-winner', view.winner !== null)
  }

  getReservedHeight(viewportWidth: number): number {
    return getScoreboardReservedHeight(viewportWidth)
  }

  destroy(): void {
    this.element.remove()
  }
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector)

  if (!element) {
    throw new Error(`Missing scoreboard element: ${selector}`)
  }

  return element
}
