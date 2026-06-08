import Phaser from 'phaser'
import { tacticalGuideConfig } from '../config/tacticalGuideConfig'
import type { GameMode } from '../config/gameplayConfig'
import type { Player } from '../entities/Player'
import type { TacticalAssignment } from '../tactics/TacticalJobs'

export class TacticalGuideRenderer {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels = new Map<string, Phaser.GameObjects.Text>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(2)
  }

  update(
    players: Player[],
    assignments: Map<string, TacticalAssignment>,
    time: number,
    debugEnabled: boolean,
    gameMode: GameMode,
  ): void {
    this.graphics.clear()
    for (const label of this.labels.values()) {
      label.setVisible(false)
    }

    const visible =
      tacticalGuideConfig.tacticalGuidesEnabled &&
      gameMode === 'match3v3' &&
      (debugEnabled ||
        tacticalGuideConfig.tacticalGuidesNormalModeEnabled)

    if (!visible) {
      return
    }

    const pulse = tacticalGuideConfig.tacticalGuidePulse
      ? 1 + Math.sin(time * 0.004) * 0.08
      : 1

    for (const player of players) {
      const assignment = assignments.get(player.id)

      if (
        !assignment ||
        assignment.job === 'keeper' ||
        (tacticalGuideConfig.tacticalGuideOnlyHumanTeam &&
          player.teamSide !== 'A')
      ) {
        continue
      }

      const color =
        player.teamSide === 'A'
          ? tacticalGuideConfig.teamAColor
          : tacticalGuideConfig.teamBColor
      const radius = tacticalGuideConfig.tacticalGuideRadius * pulse
      const distanceToTarget = Math.hypot(
        player.position.x - assignment.target.x,
        player.position.y - assignment.target.y,
      )
      const occupied =
        distanceToTarget <= tacticalGuideConfig.tacticalGuideRadius * 1.35
      const alpha =
        tacticalGuideConfig.tacticalGuideAlpha *
        (occupied ? tacticalGuideConfig.occupiedDimMultiplier : 1)

      this.graphics.fillStyle(color, alpha * 0.34)
      this.graphics.fillCircle(
        assignment.target.x,
        assignment.target.y,
        radius,
      )
      this.graphics.lineStyle(2, color, alpha)
      this.graphics.strokeCircle(
        assignment.target.x,
        assignment.target.y,
        radius,
      )
      this.graphics.lineStyle(1, color, alpha * 0.62)
      this.graphics.strokeCircle(
        assignment.target.x,
        assignment.target.y,
        radius * 0.48,
      )

      if (
        debugEnabled ||
        tacticalGuideConfig.tacticalGuideShowLines
      ) {
        this.graphics.lineStyle(
          1,
          color,
          alpha * tacticalGuideConfig.lineAlphaMultiplier,
        )
        this.graphics.lineBetween(
          player.position.x,
          player.position.y,
          assignment.target.x,
          assignment.target.y,
        )
      }

      if (
        debugEnabled ||
        tacticalGuideConfig.tacticalGuideShowLabels
      ) {
        this.getLabel(player.id)
          .setPosition(
            assignment.target.x,
            assignment.target.y - radius - 10,
          )
          .setText(abbreviateJob(assignment.job))
          .setColor(player.teamSide === 'A' ? '#baf8ff' : '#ffd0dc')
          .setVisible(true)
      }
    }
  }

  destroy(): void {
    this.graphics.destroy()
    for (const label of this.labels.values()) {
      label.destroy()
    }
    this.labels.clear()
  }

  clear(): void {
    this.graphics.clear()
    for (const label of this.labels.values()) {
      label.setVisible(false)
    }
  }

  private getLabel(playerId: string): Phaser.GameObjects.Text {
    const existing = this.labels.get(playerId)
    if (existing) {
      return existing
    }

    const label = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setVisible(false)

    this.labels.set(playerId, label)
    return label
  }
}

function abbreviateJob(job: TacticalAssignment['job']): string {
  const abbreviations: Record<TacticalAssignment['job'], string> = {
    primaryPresser: 'PRESS',
    supportOutlet: 'OUT',
    frontSlot: 'SLOT',
    behindNet: 'BEHIND',
    weakSideLane: 'WEAK',
    strongSideLane: 'STRONG',
    verticalHigh: 'HIGH',
    verticalMiddle: 'MID',
    verticalLow: 'LOW',
    defensiveCover: 'COVER',
    manMark: 'MARK',
    zoneGuard: 'ZONE',
    reboundHunter: 'REBOUND',
    bankRebound: 'BANK',
    keeper: 'KEEP',
  }

  return abbreviations[job]
}
