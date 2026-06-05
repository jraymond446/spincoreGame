import Phaser from 'phaser'
import { arenaConfig } from '../config/arenaConfig'
import {
  formationConfig,
  formations,
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
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[] = []
  private readonly resolutions = new Map<TeamSide, TeamFormationResolution>()
  private readonly active: boolean
  private debugVisible = false

  constructor(scene: Phaser.Scene, teams: Team[], active: boolean) {
    this.active = active
    this.graphics = scene.add.graphics().setDepth(16)

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
      .text(left, y, `Team ${side} Formation: ${formationId}`, {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '17px',
        fontStyle: '700',
        color: '#f4fdff',
        backgroundColor: '#123f52cc',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0, side === 'A' ? 1 : 0)
      .setDepth(17)
      .setVisible(false)
  }

  private draw(): void {
    this.graphics.clear()

    if (!this.debugVisible) {
      return
    }

    for (const [side, resolution] of this.resolutions) {
      const palette = teamVisualPalettes[side]

      for (const spawn of resolution.spawns.values()) {
        this.graphics.lineStyle(
          2,
          palette.trim,
          formationConfig.ghostLineAlpha,
        )
        this.graphics.strokeCircle(
          spawn.x,
          spawn.y,
          formationConfig.ghostMarkerRadius,
        )
        this.graphics.fillStyle(
          palette.shirt,
          formationConfig.ghostMarkerAlpha,
        )
        this.graphics.fillCircle(
          spawn.x,
          spawn.y,
          formationConfig.ghostMarkerRadius - 3,
        )
        this.graphics.lineBetween(
          spawn.x - formationConfig.ghostMarkerRadius,
          spawn.y,
          spawn.x + formationConfig.ghostMarkerRadius,
          spawn.y,
        )
        this.graphics.lineBetween(
          spawn.x,
          spawn.y - formationConfig.ghostMarkerRadius,
          spawn.x,
          spawn.y + formationConfig.ghostMarkerRadius,
        )
      }
    }
  }
}
