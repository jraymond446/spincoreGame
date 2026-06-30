import {
  arenaPresentationConfig,
  getScoreboardReservedHeight,
} from '../config/arenaPresentationConfig'
import type { GameMode } from '../config/gameplayConfig'
import type { TeamSide } from '../data/matchTypes'
import type { MatchStats } from '../systems/MatchStatsTracker'
import type { ArenaMatchPresentation } from '../arena/ArenaPresentation'
import type { ArenaTheme } from '../arena/ArenaTheme'

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
  teamACrest: HTMLElement
  teamBCrest: HTMLElement
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
    presentation: ArenaMatchPresentation,
    theme: ArenaTheme,
    frameAvailable: boolean,
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
        <span class="sports-scoreboard-mark" aria-hidden="true">SC</span>
        <span class="sports-scoreboard-brand-copy">
          <strong>SPINCORE</strong>
          <small data-scoreboard-mode>LIVE MATCH</small>
        </span>
      </div>
      <div class="sports-scoreboard-team is-team-a">
        <span class="sports-scoreboard-team-code" aria-hidden="true">A</span>
        <span class="sports-scoreboard-team-name" data-team-a-name></span>
        <strong class="sports-scoreboard-score" data-team-a-score>0</strong>
      </div>
      <div class="sports-scoreboard-center">
        <small>MATCH</small>
        <span data-scoreboard-center>FIRST TO 5</span>
      </div>
      <div class="sports-scoreboard-team is-team-b">
        <strong class="sports-scoreboard-score" data-team-b-score>0</strong>
        <span class="sports-scoreboard-team-name" data-team-b-name></span>
        <span class="sports-scoreboard-team-code" aria-hidden="true">B</span>
      </div>
      <div class="sports-scoreboard-stats">
        <span class="sports-scoreboard-stat-team is-team-a">A</span>
        <span><b data-a-assists>0</b><small>AST</small></span>
        <span><b data-a-checks>0</b><small>CHK</small></span>
        <span><b data-a-saves>0</b><small>SAV</small></span>
        <i><span aria-hidden="true"></span> LIVE STATS <span aria-hidden="true"></span></i>
        <span><b data-b-assists>0</b><small>AST</small></span>
        <span><b data-b-checks>0</b><small>CHK</small></span>
        <span><b data-b-saves>0</b><small>SAV</small></span>
        <span class="sports-scoreboard-stat-team is-team-b">B</span>
      </div>
    `
    hudRoot.appendChild(this.element)

    this.elements = {
      mode: required(this.element, '[data-scoreboard-mode]'),
      teamAName: required(this.element, '[data-team-a-name]'),
      teamBName: required(this.element, '[data-team-b-name]'),
      teamAScore: required(this.element, '[data-team-a-score]'),
      teamBScore: required(this.element, '[data-team-b-score]'),
      teamACrest: required(
        this.element,
        '.sports-scoreboard-team.is-team-a .sports-scoreboard-team-code',
      ),
      teamBCrest: required(
        this.element,
        '.sports-scoreboard-team.is-team-b .sports-scoreboard-team-code',
      ),
      centerLabel: required(this.element, '[data-scoreboard-center]'),
      aAssists: required(this.element, '[data-a-assists]'),
      aChecks: required(this.element, '[data-a-checks]'),
      aSaves: required(this.element, '[data-a-saves]'),
      bAssists: required(this.element, '[data-b-assists]'),
      bChecks: required(this.element, '[data-b-checks]'),
      bSaves: required(this.element, '[data-b-saves]'),
    }
    this.setPresentation(presentation, theme, frameAvailable)
    this.element.classList.toggle(
      'is-stats-hidden',
      !arenaPresentationConfig.showScoreboardStats,
    )
  }

  setPresentation(
    presentation: ArenaMatchPresentation,
    theme: ArenaTheme,
    frameAvailable: boolean,
  ): void {
    const home = presentation.teams.A
    const away = presentation.teams.B
    this.elements.teamAName.textContent = home.name.toUpperCase()
    this.elements.teamBName.textContent = away.name.toUpperCase()
    this.elements.teamACrest.textContent = home.shortName.slice(0, 3)
    this.elements.teamBCrest.textContent = away.shortName.slice(0, 3)
    this.element.dataset.arenaTheme = theme.id
    this.element.dataset.attendance =
      presentation.attendance.attendanceRate.toFixed(2)
    this.element.dataset.crowdSeed = String(presentation.crowdSeed)
    this.element.dataset.reducedMotion = String(presentation.reducedMotion)
    this.element.style.setProperty(
      '--scoreboard-home-primary',
      cssHex(home.primaryColor),
    )
    this.element.style.setProperty(
      '--scoreboard-home-accent',
      cssHex(home.accentColor),
    )
    this.element.style.setProperty(
      '--scoreboard-away-primary',
      cssHex(away.primaryColor),
    )
    this.element.style.setProperty(
      '--scoreboard-away-accent',
      cssHex(away.accentColor),
    )
    this.element.style.setProperty(
      '--scoreboard-theme-accent',
      cssHex(theme.palette.accent),
    )
    this.applyOptionalFrame(theme, frameAvailable)
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

  private applyOptionalFrame(
    theme: ArenaTheme,
    frameAvailable: boolean,
  ): void {
    const frame = theme.scoreboardFrameAsset

    if (!frame || !frameAvailable) {
      this.element.classList.remove('has-theme-frame')
      this.element.dataset.frameAsset = 'missing'
      this.element.style.removeProperty('--scoreboard-theme-frame')
      return
    }

    this.element.style.setProperty(
      '--scoreboard-theme-frame',
      `url("${frame.path}")`,
    )
    this.element.classList.add('has-theme-frame')
    this.element.dataset.frameAsset = 'loaded'
  }
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector)

  if (!element) {
    throw new Error(`Missing scoreboard element: ${selector}`)
  }

  return element
}

function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
