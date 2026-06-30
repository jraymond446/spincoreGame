import type { AppScreen } from './GameScreen'

const minimumDisplayMs = 180
const assetWaitTimeoutMs = 2400
const settledChecksRequired = 3

const screenPresentation: Record<
  AppScreen,
  { title: string; detail: string }
> = {
  boot: {
    title: 'Loading Spincore',
    detail: 'Preparing your circuit profile',
  },
  worldMap: {
    title: 'Loading World Map',
    detail: 'Charting the circuit',
  },
  playerRoom: {
    title: 'Loading Player Room',
    detail: 'Opening your home base',
  },
  mainMenu: {
    title: 'Loading Status',
    detail: 'Updating your club overview',
  },
  createPlayer: {
    title: 'Loading Create Player',
    detail: 'Preparing the portrait studio',
  },
  playerProfile: {
    title: 'Loading Player Profile',
    detail: 'Updating player records',
  },
  teamManagement: {
    title: 'Loading Team Office',
    detail: 'Preparing the club roster',
  },
  teamLoadout: {
    title: 'Loading Locker',
    detail: 'Collecting equipment',
  },
  leagueHub: {
    title: 'Loading League Office',
    detail: 'Updating the standings',
  },
  store: {
    title: 'Loading Store Row',
    detail: 'Stocking the shelves',
  },
  settings: {
    title: 'Loading Settings',
    detail: 'Preparing game options',
  },
  match: {
    title: 'Loading Match',
    detail: 'Preparing the arena',
  },
  matchResults: {
    title: 'Loading Match Report',
    detail: 'Calculating rewards and statistics',
  },
}

export class AppLoadingOverlay {
  readonly element: HTMLDivElement
  private readonly progressBar: HTMLDivElement
  private readonly progressLabel: HTMLSpanElement
  private readonly step: HTMLParagraphElement
  private removeTimer: number | null = null

  constructor(parent: HTMLElement, destination: AppScreen) {
    const presentation = screenPresentation[destination]
    this.element = document.createElement('div')
    this.element.className = 'match-loading-overlay app-loading-overlay'
    this.element.setAttribute('role', 'status')
    this.element.setAttribute('aria-live', 'polite')
    this.element.setAttribute('aria-label', presentation.title)

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
    title.textContent = presentation.title

    const detail = document.createElement('p')
    detail.className = 'match-loading-matchup'
    detail.textContent = presentation.detail

    const progressTrack = document.createElement('div')
    progressTrack.className = 'match-loading-progress'
    this.progressBar = document.createElement('div')
    this.progressBar.className = 'match-loading-progress-bar'
    progressTrack.appendChild(this.progressBar)

    const status = document.createElement('div')
    status.className = 'match-loading-status'
    this.step = document.createElement('p')
    this.step.textContent = 'Preparing interface'
    this.progressLabel = document.createElement('span')
    this.progressLabel.textContent = '0%'
    status.append(this.step, this.progressLabel)

    card.append(mark, brand, title, detail, progressTrack, status)
    this.element.appendChild(card)
    parent.appendChild(this.element)
  }

  update(progress: number, step: string): void {
    const normalized = Math.max(0, Math.min(1, progress))
    const percent = Math.round(normalized * 100)
    this.step.textContent = step
    this.progressLabel.textContent = `${percent}%`
    this.progressBar.style.width = `${percent}%`
  }

  setFinalizing(): void {
    this.update(1, 'Finalizing presentation')
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

export async function waitForScreenAssets(
  screen: HTMLElement,
  onProgress: (progress: number, step: string) => void,
): Promise<void> {
  const startedAt = performance.now()
  let settledChecks = 0
  let previousSignature = ''

  while (performance.now() - startedAt < assetWaitTimeoutMs) {
    await delay(40)
    const images = getLoadableImages(screen)
    const settledImages = images.filter((image) => image.complete)
    const elapsed = performance.now() - startedAt
    const assetProgress = images.length
      ? settledImages.length / images.length
      : Math.min(1, elapsed / minimumDisplayMs)
    const progress = 0.12 + assetProgress * 0.78
    const signature = `${images.length}:${settledImages.length}`

    onProgress(
      progress,
      images.length ? 'Loading screen artwork' : 'Preparing interface',
    )

    if (
      elapsed >= minimumDisplayMs &&
      signature === previousSignature &&
      settledImages.length === images.length
    ) {
      settledChecks += 1
    } else {
      settledChecks = 0
    }

    if (settledChecks >= settledChecksRequired) {
      await decodeImages(images)
      return
    }

    previousSignature = signature
  }
}

function getLoadableImages(screen: HTMLElement): HTMLImageElement[] {
  return Array.from(screen.querySelectorAll('img')).filter(
    (image) => Boolean(image.currentSrc || image.src),
  )
}

async function decodeImages(images: HTMLImageElement[]): Promise<void> {
  await Promise.allSettled(
    images.map((image) =>
      typeof image.decode === 'function' ? image.decode() : Promise.resolve(),
    ),
  )
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs))
}
