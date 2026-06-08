import { goalConfigs } from '../config/goalConfig'
import { keeperConfig } from '../config/keeperConfig'
import type { TeamSide } from '../data/matchTypes'
import type { Core } from '../entities/Core'
import type { Player } from '../entities/Player'
import type { StickInteractionEvent } from './StickInteractionSystem'

export class KeeperSaveSystem {
  private threatened: Record<TeamSide, boolean> = {
    A: false,
    B: false,
  }
  private cooldowns: Record<TeamSide, number> = {
    A: 0,
    B: 0,
  }

  update(
    core: Core,
    players: Player[],
    interaction: StickInteractionEvent | null,
    deltaMs: number,
  ): TeamSide | null {
    for (const side of ['A', 'B'] as const) {
      this.cooldowns[side] = Math.max(
        0,
        this.cooldowns[side] - deltaMs,
      )
    }

    let savedSide: TeamSide | null = null

    if (
      interaction &&
      (interaction.result === 'active swing' ||
        interaction.result === 'passive nudge')
    ) {
      const player = players.find(
        (candidate) => candidate.id === interaction.playerId,
      )

      if (
        player?.role === 'keeper' &&
        this.threatened[player.teamSide] &&
        this.cooldowns[player.teamSide] === 0
      ) {
        savedSide = player.teamSide
        this.cooldowns[player.teamSide] =
          keeperConfig.saveDetectionCooldownMs
      }
    }

    this.threatened = {
      A: isCoreThreateningGoal(core, 'A'),
      B: isCoreThreateningGoal(core, 'B'),
    }

    return savedSide
  }

  reset(): void {
    this.threatened = { A: false, B: false }
    this.cooldowns = { A: 0, B: 0 }
  }
}

function isCoreThreateningGoal(
  core: Core,
  defendingSide: TeamSide,
): boolean {
  const goal = goalConfigs.find((candidate) =>
    defendingSide === 'A'
      ? candidate.id === 'bottom-goal'
      : candidate.id === 'top-goal',
  )

  if (!goal) {
    return false
  }

  const velocity = core.velocity
  const movingToward =
    defendingSide === 'A' ? velocity.y > 0.25 : velocity.y < -0.25

  if (!movingToward || Math.abs(velocity.y) < 0.01) {
    return false
  }

  const travelFrames = (goal.y - core.position.y) / velocity.y

  if (travelFrames < 0 || travelFrames > 72) {
    return false
  }

  const crossingX =
    core.position.x + velocity.x * travelFrames

  return Math.abs(crossingX - goal.x) <= goal.length / 2
}
