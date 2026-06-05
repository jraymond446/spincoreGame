import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import { formationConfig } from '../config/formationConfig'
import {
  formations,
  getFormationHalfBounds,
  resolveTeamFormation,
  type TeamFormationResolution,
} from '../data/formations'
import type { Point } from '../data/geometry'
import type {
  Formation,
  FormationAIBias,
  FormationId,
  Team,
  TeamSide,
} from '../data/matchTypes'
import { teamVisualPalettes } from '../data/visualPalettes'

export class FormationSystem {
  private readonly halfGraphics: Phaser.GameObjects.Graphics
  private readonly markerGraphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[] = []
  private readonly resolutions = new Map<TeamSide, TeamFormationResolution>()
  private readonly active: boolean
  private debugVisible = false

  constructor(scene: Phaser.Scene, teams: Team[], active: boolean) {
    this.active = active
    this.halfGraphics = scene.add.graphics().setDepth(-4)
    this.markerGraphics = scene.add.graphics().setDepth(16)

    for (const team of teams) {
      const resolution = resolveTeamFormation(team)
      this.resolutions.set(team.side, resolution)
      this.labels.push(this.createLabel(scene, team.side, resolution.formation.id))
    }
  }

  getSpawn(playerId: string): Point {
    for (const resolution of this.resolutions.values()) {
      const spawn = resolution.spawns.get(playerId)

      if (spawn) {
        return { ...spawn }
      }
    }

    throw new Error(`Missing formation spawn for ${playerId}`)
  }

  getFormation(side: TeamSide): Formation {
    return this.resolutions.get(side)?.formation ?? formations.balanced
  }

  getFormationIds(): Record<TeamSide, FormationId> {
    return {
      A: this.getFormation('A').id,
      B: this.getFormation('B').id,
    }
  }

  getFormationBiases(): Record<TeamSide, FormationAIBias> {
    return {
      A: this.getFormation('A').aiBias,
      B: this.getFormation('B').aiBias,
    }
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = this.active && visible

    for (const label of this.labels) {
      label.setVisible(this.debugVisible)
    }

    this.draw()
  }

  private createLabel(
    scene: Phaser.Scene,
    side: TeamSide,
    formationId: FormationId,
  ): Phaser.GameObjects.Text {
    const left = arenaConfig.center.x - arenaConfig.width * 0.5 + 34
    const y =
      side === 'A'
        ? arenaConfig.center.y + arenaConfig.height * 0.5 - 32
        : arenaConfig.center.y - arenaConfig.height * 0.5 + 32

    return scene.add
      .text(
        left,
        y,
        `Team ${side} Formation Half\nFormation: ${formationId}`,
        {
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: '17px',
          fontStyle: '700',
          color: '#f4fdff',
          backgroundColor: '#123f52cc',
          padding: { x: 7, y: 4 },
        },
      )
      .setOrigin(0, side === 'A' ? 1 : 0)
      .setDepth(17)
      .setVisible(false)
  }

  private draw(): void {
    this.halfGraphics.clear()
    this.markerGraphics.clear()

    if (!this.debugVisible) {
      return
    }

    this.drawFormationHalves()

    for (const [side, resolution] of this.resolutions) {
      const palette = teamVisualPalettes[side]

      for (const spawn of resolution.spawns.values()) {
        this.markerGraphics.lineStyle(
          2,
          palette.trim,
          formationConfig.ghostLineAlpha,
        )
        this.markerGraphics.strokeCircle(
          spawn.x,
          spawn.y,
          formationConfig.ghostMarkerRadius,
        )
        this.markerGraphics.fillStyle(
          palette.shirt,
          formationConfig.ghostMarkerAlpha,
        )
        this.markerGraphics.fillCircle(
          spawn.x,
          spawn.y,
          formationConfig.ghostMarkerRadius - 3,
        )
        this.markerGraphics.lineBetween(
          spawn.x - formationConfig.ghostMarkerRadius,
          spawn.y,
          spawn.x + formationConfig.ghostMarkerRadius,
          spawn.y,
        )
        this.markerGraphics.lineBetween(
          spawn.x,
          spawn.y - formationConfig.ghostMarkerRadius,
          spawn.x,
          spawn.y + formationConfig.ghostMarkerRadius,
        )
      }
    }
  }

  private drawFormationHalves(): void {
    const centerY = arenaConfig.center.y
    const topBounds = getFormationHalfBounds('B')
    const bottomBounds = getFormationHalfBounds('A')
    const width = topBounds.right - topBounds.left

    for (const side of ['A', 'B'] as const) {
      const palette = teamVisualPalettes[side]
      const bounds = side === 'A' ? bottomBounds : topBounds
      const top = side === 'A' ? bounds.halfBoundary : bounds.top
      const bottom = side === 'A' ? bounds.bottom : bounds.halfBoundary

      this.halfGraphics.fillStyle(
        palette.shirt,
        formationConfig.legalHalfFillAlpha,
      )
      this.halfGraphics.fillRect(bounds.left, top, width, bottom - top)
      this.halfGraphics.lineStyle(
        3,
        palette.trim,
        formationConfig.legalHalfLineAlpha,
      )
      this.halfGraphics.lineBetween(
        bounds.left,
        bounds.halfBoundary,
        bounds.right,
        bounds.halfBoundary,
      )
    }

    this.halfGraphics.fillStyle(
      0xffd36a,
      formationConfig.midfieldBufferAlpha,
    )
    this.halfGraphics.fillRect(
      topBounds.left,
      topBounds.halfBoundary,
      width,
      bottomBounds.halfBoundary - topBounds.halfBoundary,
    )
    this.halfGraphics.lineStyle(4, 0xffffff, 0.72)
    this.halfGraphics.lineBetween(
      topBounds.left,
      centerY,
      topBounds.right,
      centerY,
    )
  }
}
