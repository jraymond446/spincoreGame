import { equipmentCatalog } from '../equipment/equipmentCatalog'
import type { EquipmentItem } from '../equipment/equipmentTypes'
import { opponentTeams } from '../game/data/opponentTeams'
import { defaultLeagues } from '../league/defaultLeagues'
import type { MatchLaunchConfig } from '../match/MatchLaunchConfig'
import {
  createCreatedPlayer,
  createNewSave,
} from '../save/defaultSave'
import {
  loadSave,
  resetSave,
  saveGame,
  updateSave,
} from '../save/saveStorage'
import {
  recordMatchRewards,
  type MatchRewardBreakdown,
} from '../save/progression'
import type {
  EquipmentSlot,
  PlayerAttributeKey,
  SaveGame,
} from '../save/saveTypes'
import { createBootScreen } from './BootScreen'
import { createCreatePlayerScreen } from './CreatePlayerScreen'
import type { AppScreen } from './GameScreen'
import { GameHost } from './GameHost'
import { createLeagueHubScreen } from './LeagueHubScreen'
import { createMainMenu } from './MainMenu'
import type { RewardNotice } from './MainMenu'
import type { MatchExitSummary } from './GameHost'
import { createPlayerProfileScreen } from './PlayerProfileScreen'
import { createSettingsScreen } from './SettingsScreen'
import { createStoreScreen } from './StoreScreen'

export class AppShell {
  private readonly root: HTMLElement
  private save: SaveGame | null = null
  private screen: AppScreen = 'boot'
  private selectedOpponentId = opponentTeams[0]?.id ?? ''
  private gameHost: GameHost | null = null
  private rewardNotice: RewardNotice | null = null

  constructor(root: HTMLElement) {
    this.root = root
    this.syncViewport()
    window.visualViewport?.addEventListener(
      'resize',
      this.syncViewport,
    )
    window.addEventListener('resize', this.syncViewport)
    window.addEventListener('orientationchange', this.syncViewport)
    this.renderBoot()
    window.setTimeout(() => this.loadInitialScreen(), 180)
  }

  destroy(): void {
    this.gameHost?.destroy()
    this.gameHost = null
    window.visualViewport?.removeEventListener(
      'resize',
      this.syncViewport,
    )
    window.removeEventListener('resize', this.syncViewport)
    window.removeEventListener('orientationchange', this.syncViewport)
  }

  private loadInitialScreen(): void {
    this.save = loadSave()

    if (this.save?.settings.createdPlayerComplete) {
      this.renderMainMenu()
    } else {
      this.renderCreatePlayer()
    }
  }

  private renderBoot(): void {
    this.screen = 'boot'
    this.show(createBootScreen())
  }

  private renderCreatePlayer(): void {
    this.screen = 'createPlayer'
    this.show(
      createCreatePlayerScreen({
        onCreate: (values) => {
          const player = createCreatedPlayer(values)
          const saved = saveGame(
            createNewSave(player, values.unspentStartingPoints),
          )

          if (!saved) {
            return
          }

          this.save = saved
          this.renderMainMenu()
        },
      }),
    )
  }

  private renderMainMenu(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'mainMenu'
    this.show(
      createMainMenu({
        save,
        opponents: opponentTeams,
        selectedOpponentId: this.selectedOpponentId,
        rewardNotice: this.rewardNotice,
        onOpponentChange: (id) => {
          this.selectedOpponentId = id
        },
        onPlay: () => this.startMatch('exhibition'),
        onPlayer: () => this.renderPlayerProfile(),
        onLeague: () => this.renderLeagueHub(),
        onStore: () => this.renderStore(),
        onLab: () => this.startMatch('lab'),
        onSettings: () => this.renderSettings(),
        onResetSave: () => this.confirmResetSave(),
      }),
    )
  }

  private renderPlayerProfile(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'playerProfile'
    this.show(
      createPlayerProfileScreen({
        save,
        onBack: () => this.renderMainMenu(),
        onPlay: () => this.startMatch('exhibition'),
        onSpendPoint: (key) => this.spendAttributePoint(key),
      }),
    )
  }

  private renderLeagueHub(): void {
    const save = this.requireSave()
    const league =
      defaultLeagues.find(
        (candidate) => candidate.id === save?.league.currentLeagueId,
      ) ?? defaultLeagues[0]
    const nextOpponent =
      opponentTeams.find(
        (candidate) =>
          candidate.id ===
          league?.schedule.find((match) => !match.played)?.opponentTeamId,
      ) ?? opponentTeams[0]

    if (!save || !league || !nextOpponent) {
      this.renderMainMenu()
      return
    }

    this.screen = 'leagueHub'
    this.show(
      createLeagueHubScreen({
        save,
        league,
        nextOpponent,
        onBack: () => this.renderMainMenu(),
        onPlayNext: () => {
          this.selectedOpponentId = nextOpponent.id
          this.startMatch('league')
        },
      }),
    )
  }

  private renderStore(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'store'
    this.show(
      createStoreScreen({
        save,
        catalog: equipmentCatalog,
        onBack: () => this.renderMainMenu(),
        onBuy: (item) => this.buyItem(item),
        onEquip: (item) => this.equipItem(item),
      }),
    )
  }

  private renderSettings(): void {
    this.screen = 'settings'
    this.show(
      createSettingsScreen({
        onBack: () => this.renderMainMenu(),
        onOpenLab: () => this.startMatch('lab'),
      }),
    )
  }

  private startMatch(mode: MatchLaunchConfig['mode']): void {
    const save = this.save
    const opponent =
      opponentTeams.find(
        (candidate) => candidate.id === this.selectedOpponentId,
      ) ?? opponentTeams[0]
    const launch: MatchLaunchConfig = {
      mode,
      useCreatedPlayer: mode !== 'lab' && Boolean(save),
      teamAOverride: mode !== 'lab' ? save?.player : undefined,
      opponentTeamId: mode !== 'lab' ? opponent?.id : undefined,
      opponentTeam: mode !== 'lab' ? opponent : undefined,
      saveGameSnapshot: mode !== 'lab' ? save ?? undefined : undefined,
    }

    this.screen = 'match'
    this.rewardNotice = null
    this.gameHost?.destroy()
    this.gameHost = new GameHost({
      root: this.root,
      launch,
      onExit: (summary) => {
        this.gameHost?.destroy()
        this.gameHost = null

        if (mode === 'lab') {
          this.save = loadSave()
        } else {
          this.applyMatchRewards(summary)
        }

        this.renderMainMenu()
      },
    })
  }

  private applyMatchRewards(summary: MatchExitSummary): void {
    const current = this.save ?? loadSave()

    if (!current) {
      return
    }

    const draft = structuredClone(current)
    const result = summary.result
    const rewards: MatchRewardBreakdown = recordMatchRewards(
      draft,
      result
        ? {
            won: result.winner === 'A',
            goals: result.playerGoals,
            bankShotGoals: result.playerBankShotGoals,
          }
        : null,
    )
    const saved = saveGame(draft)

    if (!saved) {
      this.save = loadSave()
      return
    }

    this.save = saved
    const score = summary.result?.score
    this.rewardNotice = {
      title: rewards.completed
        ? rewards.won
          ? 'Match won'
          : 'Match complete'
        : 'Exhibition run logged',
      xp: rewards.xp,
      money: rewards.money,
      details: score
        ? `Final score ${score.A}-${score.B}. ` +
          `${rewards.goals} goals, ${rewards.bankShotGoals} bank goals.`
        : 'Participation rewards banked. Results were not recorded.',
    }
  }

  private spendAttributePoint(key: PlayerAttributeKey): void {
    const next = updateSave((draft) => {
      if (
        draft.progression.unspentAttributePoints <= 0 ||
        draft.player.attributes[key] >= 99
      ) {
        return
      }

      draft.player.attributes[key] += 1
      draft.progression.unspentAttributePoints -= 1
    })

    if (next) {
      this.save = next
      this.renderPlayerProfile()
    }
  }

  private buyItem(item: EquipmentItem): void {
    const save = this.requireSave()

    if (
      !save ||
      save.equipment.inventory.includes(item.id) ||
      save.wallet.money < item.price
    ) {
      return
    }

    const draft = structuredClone(save)
    draft.wallet.money -= item.price
    draft.equipment.inventory.push(item.id)
    const saved = saveGame(draft)

    if (saved) {
      this.save = saved
      this.renderStore()
    }
  }

  private equipItem(item: EquipmentItem): void {
    const save = this.requireSave()

    if (!save?.equipment.inventory.includes(item.id)) {
      return
    }

    const slot = `${item.type}Id` as EquipmentSlot
    const draft = structuredClone(save)
    draft.equipment.equipped[slot] = item.id

    if (item.type === 'stick') {
      draft.player.selectedStickId = item.id
    }

    const saved = saveGame(draft)

    if (saved) {
      this.save = saved
      this.renderStore()
    }
  }

  private confirmResetSave(): void {
    const confirmed = window.confirm(
      'Reset your Spincore career save? Lab tuning will not be affected.',
    )

    if (!confirmed) {
      return
    }

    resetSave()
    this.save = null
    this.renderCreatePlayer()
  }

  private requireSave(): SaveGame | null {
    if (!this.save) {
      this.renderCreatePlayer()
      return null
    }

    return this.save
  }

  private show(screen: HTMLElement): void {
    this.gameHost?.destroy()
    this.gameHost = null
    this.root.dataset.screen = this.screen
    this.root.replaceChildren(screen)
  }

  private syncViewport = (): void => {
    const viewport = window.visualViewport
    const width = Math.max(
      1,
      Math.round(viewport?.width ?? window.innerWidth),
    )
    const height = Math.max(
      1,
      Math.round(viewport?.height ?? window.innerHeight),
    )
    document.documentElement.style.setProperty(
      '--app-width',
      `${width}px`,
    )
    document.documentElement.style.setProperty(
      '--app-height',
      `${height}px`,
    )
  }
}
