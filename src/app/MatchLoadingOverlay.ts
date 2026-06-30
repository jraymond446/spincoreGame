import type { MatchLoadingSnapshot } from '../game/loading/MatchAssetPreloader'

export class MatchLoadingOverlay {
  readonly element: HTMLDivElement
  private readonly matchup: HTMLParagraphElement
  private readonly progressBar: HTMLDivElement
  private readonly progressLabel: HTMLSpanElement
  private readonly step: HTMLParagraphElement
  private removeTimer: number | null = null

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div')
    this.element.className = 'match-loading-overlay'
    this.element.setAttribute('role', 'status')
    this.element.setAttribute('aria-live', 'polite')
    this.element.setAttribute('aria-label', 'Loading match')

    const card = document.createElement('section')
    card.className = 'match-loading-card'

    const mark = document.createElement('div')
    mark.className = 'match-loading-mark'
    mark.setAttribute('aria-hidden', 'true')
    mark.textContent = 'SC'

    const brand = document.createElement('p')
    brand.className = 'match-loading-brand'
    brand.textContent = 'SPINCORE'

    const title = document.createElement('h1')
    title.textContent = 'Loading Match'

    this.matchup = document.createElement('p')
    this.matchup.className = 'match-loading-matchup'
    this.matchup.textContent = 'Preparing the arena'

    const progressTrack = document.createElement('div')
    progressTrack.className = 'match-loading-progress'
    this.progressBar = document.createElement('div')
    this.progressBar.className = 'match-loading-progress-bar'
    progressTrack.appendChild(this.progressBar)

    const status = document.createElement('div')
    status.className = 'match-loading-status'
    this.step = document.createElement('p')
    this.step.textContent = 'Preparing arena'
    this.progressLabel = document.createElement('span')
    this.progressLabel.textContent = '0%'
    status.append(this.step, this.progressLabel)

    card.append(
      mark,
      brand,
      title,
      this.matchup,
      progressTrack,
      status,
    )
    this.element.appendChild(card)
    parent.appendChild(this.element)
  }

  update(snapshot: MatchLoadingSnapshot): void {
    const percent = Math.round(snapshot.progress * 100)
    this.matchup.textContent =
      `${snapshot.matchup.home} vs ${snapshot.matchup.away}`
    this.step.textContent = snapshot.currentStep
    this.progressLabel.textContent = `${percent}%`
    this.progressBar.style.width = `${percent}%`
    this.element.dataset.loadingState = snapshot.state
  }

  reset(parent: HTMLElement): void {
    if (this.removeTimer !== null) {
      window.clearTimeout(this.removeTimer)
      this.removeTimer = null
    }
    this.element.classList.remove('is-leaving')
    this.element.style.removeProperty('--match-loading-fade-ms')
    if (!this.element.isConnected) {
      parent.appendChild(this.element)
    }
  }

  setFinalizing(): void {
    this.step.textContent = 'Finalizing match presentation'
    this.progressLabel.textContent = '100%'
    this.progressBar.style.width = '100%'
  }

  reveal(durationMs: number): void {
    this.element.style.setProperty('--match-loading-fade-ms', `${durationMs}ms`)
    this.element.classList.add('is-leaving')
    this.removeTimer = window.setTimeout(() => {
      this.element.remove()
      this.removeTimer = null
    }, durationMs + 40)
  }

  destroy(): void {
    if (this.removeTimer !== null) {
      window.clearTimeout(this.removeTimer)
      this.removeTimer = null
    }
    this.element.remove()
  }
}
