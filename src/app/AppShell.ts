import {
  equipmentCatalog,
  equipmentShops,
  getEquipmentItem,
} from '../equipment/equipmentCatalog'
import type { EquipmentItem } from '../equipment/equipmentTypes'
import { opponentTeams } from '../game/data/opponentTeams'
import { defaultLeagues } from '../league/defaultLeagues'
import {
  createMatchResult,
  type MatchResult,
} from '../match/MatchResult'
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
import { recordMatchResult } from '../save/progression'
import type {
  EquipmentSlot,
  PlayerAttributeKey,
  SaveGame,
} from '../save/saveTypes'
import { playerAttributeMax } from '../save/saveTypes'
import { createBootScreen } from './BootScreen'
import { createCreatePlayerScreen } from './CreatePlayerScreen'
import type { AppScreen } from './GameScreen'
import { GameHost } from './GameHost'
import { createLeagueHubScreen } from './LeagueHubScreen'
import { createMainMenu } from './MainMenu'
import type { RewardNotice } from './MainMenu'
import { createMatchResultsScreen } from './MatchResultsScreen'
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
        onStore: () => this.renderStore(),
        onSpendPoint: (key) => this.spendAttributePoint(key),
      }),
    )
  }

  private renderLeagueHub(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    const league =
      defaultLeagues.find(
        (candidate) => candidate.id === save.league.currentLeagueId,
      ) ?? defaultLeagues[0]
    const nextOpponentId =
      league?.teams[save.league.rookieCircuit.currentOpponentIndex]
        ?.opponentTeamId
    const nextOpponent =
      opponentTeams.find(
        (candidate) => candidate.id === nextOpponentId,
      ) ?? null

    if (!league) {
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
          if (!nextOpponent) {
            return
          }

          this.selectedOpponentId = nextOpponent.id
          this.startMatch('league', nextOpponent.id)
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
        shops: equipmentShops,
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

  private startMatch(
    mode: MatchLaunchConfig['mode'],
    opponentId = this.selectedOpponentId,
  ): void {
    const save = this.save
    const opponent =
      opponentTeams.find(
        (candidate) => candidate.id === opponentId,
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
      onExit: () => {
        this.gameHost?.destroy()
        this.gameHost = null

        if (mode === 'lab') {
          this.save = loadSave()
        }

        this.renderMainMenu()
      },
      onCompleted: (completion) => {
        window.setTimeout(() => {
          this.completeMatch(completion, launch)
        }, 0)
      },
    })
  }

  private completeMatch(
    completion: Parameters<typeof createMatchResult>[0],
    launch: MatchLaunchConfig,
  ): void {
    if (this.screen !== 'match' || launch.mode === 'lab') {
      return
    }

    this.gameHost?.destroy()
    this.gameHost = null
    const current = this.save ?? loadSave()

    if (!current) {
      this.renderCreatePlayer()
      return
    }

    const result = createMatchResult(completion, launch)
    const draft = structuredClone(current)
    result.rewards = recordMatchResult(draft, result)
    const saved = saveGame(draft)

    if (!saved) {
      this.save = loadSave()
    } else {
      this.save = saved
    }

    this.rewardNotice = {
      title: result.won ? 'Match won' : 'Match complete',
      xp: result.rewards.xp,
      money: result.rewards.money,
      details:
        `Final score ${result.playerTeamScore}-${result.opponentTeamScore}. ` +
        `${result.playerStats.goals} goals, ` +
        `${result.playerStats.bankShotGoals} bank goals.`,
    }
    this.renderMatchResults(result, launch)
  }

  private renderMatchResults(
    result: MatchResult,
    launch: MatchLaunchConfig,
  ): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'matchResults'
    this.show(
      createMatchResultsScreen({
        result,
        player: save.player,
        onContinue: () => {
          if (result.mode === 'league') {
            this.renderLeagueHub()
          } else {
            this.renderMainMenu()
          }
        },
        onRematch: () => {
          this.selectedOpponentId = result.opponentTeamId
          this.startMatch(launch.mode, result.opponentTeamId)
        },
        onMainMenu: () => this.renderMainMenu(),
        onPlayerProfile: () => this.renderPlayerProfile(),
      }),
    )
  }

  private spendAttributePoint(key: PlayerAttributeKey): void {
    const next = updateSave((draft) => {
      if (
        draft.progression.unspentAttributePoints <= 0 ||
        draft.player.attributes[key] >= playerAttributeMax
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

    if (item.ultraUnique) {
      for (const key of Object.keys(draft.equipment.equipped) as EquipmentSlot[]) {
        const equippedItem = getEquipmentItem(draft.equipment.equipped[key])

        if (equippedItem?.ultraUnique && key !== slot) {
          draft.equipment.equipped[key] = null
        }
      }
    }

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
