import type Phaser from 'phaser'
import { createArenaLayout, type ArenaLayout } from '../arena/ArenaLayout'
import type { ArenaMatchPresentation } from '../arena/ArenaPresentation'
import { getArenaTheme } from '../arena/arenaThemes'
import type { ArenaTheme } from '../arena/ArenaTheme'
import { arenaPresentationConfig } from '../config/arenaPresentationConfig'
import { ArenaGeometryOverlay } from './ArenaGeometryOverlay'
import { ArenaShellRenderer } from './ArenaShellRenderer'
import { BenchRenderer } from './BenchRenderer'
import { CourtRenderer } from './CourtRenderer'
import { CrowdRenderer, type CrowdDebugState } from './CrowdRenderer'
import { HomeCrestRenderer } from './HomeCrestRenderer'

export class ArenaRenderer {
  private readonly arenaLayout: ArenaLayout
  private theme: ArenaTheme
  private readonly shell: ArenaShellRenderer
  private readonly court: CourtRenderer
  private readonly crowd: CrowdRenderer
  private readonly benches: BenchRenderer
  private readonly crest: HomeCrestRenderer
  private readonly geometryOverlay: ArenaGeometryOverlay

  constructor(
    scene: Phaser.Scene,
    presentation: ArenaMatchPresentation,
  ) {
    this.arenaLayout = createArenaLayout()
    this.theme = getArenaTheme(
      presentation.themeId,
      this.arenaLayout,
    )
    this.shell = new ArenaShellRenderer(
      scene,
      this.arenaLayout,
      this.theme,
    )
    this.court = new CourtRenderer(
      scene,
      this.arenaLayout,
      this.theme,
      presentation,
    )
    this.crowd = new CrowdRenderer(
      scene,
      this.arenaLayout,
      this.theme,
      presentation,
    )
    this.benches = new BenchRenderer(scene, presentation)
    this.crest = new HomeCrestRenderer(
      scene,
      this.theme.crestPlacement,
      presentation.teams.A,
    )
    this.geometryOverlay = new ArenaGeometryOverlay(
      scene,
      this.arenaLayout,
    )
    this.geometryOverlay.setVisible(presentation.geometryOverlay)
    this.layout(scene.scale.width)
  }

  get layoutDefinition(): ArenaLayout {
    return this.arenaLayout
  }

  layout(viewportWidth: number): void {
    const simplified =
      viewportWidth <= arenaPresentationConfig.mobileBreakpoint

    this.shell.draw(simplified)
    this.crowd.setSimplified(simplified)
    this.benches.draw(simplified)
  }

  applyPresentation(presentation: ArenaMatchPresentation): void {
    this.theme = getArenaTheme(
      presentation.themeId,
      this.arenaLayout,
    )
    this.crest.setPlacement(this.theme.crestPlacement)
    this.crest.draw(presentation.teams.A)
    this.court.applyPresentation(presentation)
    this.crowd.applyPresentation(
      this.arenaLayout,
      this.theme,
      presentation,
    )
    this.benches.applyPresentation(presentation)
    this.geometryOverlay.setVisible(presentation.geometryOverlay)
  }

  update(time: number): void {
    this.crowd.update(time)
  }

  getCrowdDebugState(): CrowdDebugState {
    return this.crowd.getDebugState()
  }

  destroy(): void {
    this.shell.destroy()
    this.court.destroy()
    this.crowd.destroy()
    this.benches.destroy()
    this.crest.destroy()
    this.geometryOverlay.destroy()
  }
}
