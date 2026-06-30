import {
  equipmentCatalog,
  equipmentShops,
  getEquipmentItem,
} from '../equipment/equipmentCatalog'
import {
  getInventoryItemCount,
} from '../equipment/equipmentInventory'
import type { EquipmentItem } from '../equipment/equipmentTypes'
import {
  getCoach,
  getOptionalCoach,
} from '../franchise/coachCatalog'
import { getFreeAgent } from '../franchise/freeAgentCatalog'
import { getTeamFinance } from '../franchise/teamFinance'
import { opponentTeams } from '../game/data/opponentTeams'
import type { PlayerAppearance } from '../player/playerAppearanceTypes.ts'
import { defaultLeagues } from '../league/defaultLeagues'
import { buildLeagueStandings } from '../league/leagueStandings'
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
  TeamRosterSlotId,
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
import {
  createPlayerProfileScreen,
  type PlayerProfileSection,
} from './PlayerProfileScreen'
import { createPlayerRoomScreen } from './PlayerRoomScreen'
import { createSettingsScreen } from './SettingsScreen'
import { createStoreScreen } from './StoreScreen'
import { createTeamLoadoutScreen } from './TeamLoadoutScreen'
import {
  createTeamManagementScreen,
  type TeamIdentityChanges,
} from './TeamManagementScreen'
import { createWorldMapScreen } from './WorldMapScreen'
import {
  getAvailableLoadoutCopies,
  canCutRosterSlot,
  canSwapRosterSlotWithBench,
  createEmptyRosterLoadout,
  getFirstAvailableRosterSlotForFreeAgent,
  getCreatedPlayerRosterSlot,
  getTeamRosterReadiness,
  isFreeAgentSigned,
} from '../franchise/teamRoster'
import {
  AppLoadingOverlay,
  waitForScreenAssets,
} from './AppLoadingOverlay'

export class AppShell {
  private readonly root: HTMLElement
  private save: SaveGame | null = null
  private screen: AppScreen = 'boot'
  private selectedOpponentId = opponentTeams[0]?.id ?? ''
  private gameHost: GameHost | null = null
  private rewardNotice: RewardNotice | null = null
  private renderedScreen: AppScreen | null = null
  private navigationOverlay: AppLoadingOverlay | null = null
  private navigationToken = 0

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
    this.navigationToken += 1
    this.navigationOverlay?.destroy()
    this.navigationOverlay = null
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
      this.renderWorldMap()
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
          this.renderWorldMap()
        },
      }),
    )
  }

  private renderWorldMap(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    const league = this.getCurrentLeague()

    if (!league) {
      this.renderMainMenu()
      return
    }

    const nextOpponent = this.getNextLeagueOpponent(league, save)
    const matchReadiness = getTeamRosterReadiness(save)

    this.screen = 'worldMap'
    this.show(
      createWorldMapScreen({
        save,
        league,
        nextOpponent,
        matchReadiness,
        rewardNotice: this.rewardNotice,
        onArena: () => {
          if (!matchReadiness.ready) {
            this.renderTeamManagement()
            return
          }

          if (nextOpponent) {
            this.selectedOpponentId = nextOpponent.id
            this.startMatch('league', nextOpponent.id)
            return
          }

          this.startMatch('exhibition')
        },
        onPlayer: () => this.renderPlayerRoom(),
        onLeague: () => this.renderLeagueHub(),
        onTeam: () => this.renderTeamManagement(),
        onStore: () => this.renderStore(),
        onStatus: () => this.renderMainMenu(),
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
        matchReadiness: getTeamRosterReadiness(save),
        rewardNotice: this.rewardNotice,
        onOpponentChange: (id) => {
          this.selectedOpponentId = id
        },
        onPlay: () => this.startMatch('exhibition'),
        onPlayer: () => this.renderPlayerRoom(),
        onTeam: () => this.renderTeamManagement(),
        onLeague: () => this.renderLeagueHub(),
        onStore: () => this.renderStore(),
        onLab: () => this.startMatch('lab'),
        onSettings: () => this.renderSettings(),
        onWorldMap: () => this.renderWorldMap(),
        onResetSave: () => this.confirmResetSave(),
      }),
    )
  }

  private renderPlayerRoom(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'playerRoom'
    this.show(
      createPlayerRoomScreen({
        save,
        onBack: () => this.renderWorldMap(),
        onCloset: () => this.renderPlayerProfile('appearance'),
        onAttributes: () => this.renderPlayerProfile('attributes'),
        onItems: () =>
          this.renderTeamLoadout(
            getCreatedPlayerRosterSlot(save.player),
            'playerRoom',
          ),
        onStats: () => this.renderPlayerProfile('stats'),
      }),
    )
  }

  private renderPlayerProfile(
    section: PlayerProfileSection = 'appearance',
  ): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'playerProfile'
    this.show(
      createPlayerProfileScreen({
        save,
        section,
        matchReadiness: getTeamRosterReadiness(save),
        onBack: () => this.renderPlayerRoom(),
        onPlay: () => this.startMatch('exhibition'),
        onTeam: () => this.renderTeamManagement(),
        onSpendPoint: (key) => this.spendAttributePoint(key, section),
        onAppearanceChange: (appearance) =>
          this.updatePlayerAppearance(appearance),
      }),
    )
  }

  private renderTeamManagement(): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    const league =
      defaultLeagues.find(
        (candidate) => candidate.id === save.league.currentLeagueId,
      ) ?? defaultLeagues[0]

    if (!league) {
      this.renderMainMenu()
      return
    }

    this.screen = 'teamManagement'
    this.show(
      createTeamManagementScreen({
        save,
        league,
        onBack: () => this.renderWorldMap(),
        onLeague: () => this.renderLeagueHub(),
        onPlayer: () => this.renderPlayerRoom(),
        onStore: () => this.renderStore(),
        onEquip: (item) => this.equipItem(item, 'teamManagement'),
        onOpenLoadout: (slotId) => this.renderTeamLoadout(slotId),
        onSignFreeAgent: (agentId) => this.signFreeAgent(agentId),
        onCutRosterPlayer: (slotId) => this.cutRosterPlayer(slotId),
        onSwapRosterPlayer: (slotId) =>
          this.swapRosterPlayerWithBench(slotId),
        onSignCoach: (coachId) => this.signCoach(coachId),
        onFireCoach: () => this.fireCoach(),
        onTeamChange: (changes) => this.updateTeamIdentity(changes),
      }),
    )
  }

  private renderTeamLoadout(
    slotId: TeamRosterSlotId,
    origin: 'team' | 'playerRoom' = 'team',
  ): void {
    const save = this.requireSave()

    if (!save) {
      return
    }

    this.screen = 'teamLoadout'
    this.show(
      createTeamLoadoutScreen({
        save,
        slotId,
        origin,
        onBack: () =>
          origin === 'playerRoom'
            ? this.renderPlayerRoom()
            : this.renderTeamManagement(),
        onStore: () => this.renderStore(),
        onEquip: (selectedSlotId, item) =>
          this.equipRosterItem(selectedSlotId, item),
        onClear: (selectedSlotId, slot) =>
          this.clearRosterItem(selectedSlotId, slot),
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
    if (!league) {
      this.renderWorldMap()
      return
    }

    const nextOpponent = this.getNextLeagueOpponent(league, save)

    this.screen = 'leagueHub'
    this.show(
      createLeagueHubScreen({
        save,
        league,
        nextOpponent,
        matchReadiness: getTeamRosterReadiness(save),
        standings: buildLeagueStandings(league, save),
        onBack: () => this.renderWorldMap(),
        onTeam: () => this.renderTeamManagement(),
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
        onBack: () => this.renderWorldMap(),
        onBuy: (item) => this.buyItem(item),
        onEquip: (item) => this.equipItem(item),
      }),
    )
  }

  private renderSettings(): void {
    this.screen = 'settings'
    this.show(
      createSettingsScreen({
        onBack: () => this.renderWorldMap(),
        onOpenLab: () => this.startMatch('lab'),
      }),
    )
  }

  private startMatch(
    mode: MatchLaunchConfig['mode'],
    opponentId = this.selectedOpponentId,
  ): void {
    const save = this.save

    if (mode !== 'lab') {
      if (!save) {
        this.renderCreatePlayer()
        return
      }

      const readiness = getTeamRosterReadiness(save)

      if (!readiness.ready) {
        window.alert(
          `${readiness.message} Open Team HQ to sign starters before playing.`,
        )
        this.renderTeamManagement()
        return
      }
    }

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
    this.renderedScreen = 'match'
    this.navigationToken += 1
    this.navigationOverlay?.destroy()
    this.navigationOverlay = null
    this.root.dataset.screen = 'match'
    this.root.dataset.navigationState = 'ready'
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

        this.renderWorldMap()
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
        onContinue: () => this.renderWorldMap(),
        onRematch: () => {
          this.selectedOpponentId = result.opponentTeamId
          this.startMatch(launch.mode, result.opponentTeamId)
        },
        onMainMenu: () => this.renderWorldMap(),
        onPlayerProfile: () => this.renderPlayerRoom(),
      }),
    )
  }

  private spendAttributePoint(
    key: PlayerAttributeKey,
    section: PlayerProfileSection = 'attributes',
  ): void {
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
      this.renderPlayerProfile(section)
    }
  }

  private updatePlayerAppearance(appearance: PlayerAppearance): void {
    const next = updateSave((draft) => {
      draft.player.appearance = structuredClone(appearance)
    })

    if (next) {
      this.save = next
    }
  }

  private updateTeamIdentity(changes: TeamIdentityChanges): void {
    const next = updateSave((draft) => {
      if (typeof changes.name === 'string') {
        const name = changes.name.trim()

        if (name) {
          draft.team.name = name.slice(0, 32)
        }
      }

      if (changes.colors) {
        draft.team.colors = {
          ...draft.team.colors,
          ...changes.colors,
        }
      }
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private signFreeAgent(agentId: string): void {
    const save = this.requireSave()
    const agent = getFreeAgent(agentId)
    const league = this.getCurrentLeague()

    if (!save || !agent || !league || isFreeAgentSigned(save, agent.id)) {
      return
    }

    const slotId = getFirstAvailableRosterSlotForFreeAgent(save, agent)

    if (!slotId) {
      return
    }

    const coach = getOptionalCoach(save.team.coachId)
    const finance = getTeamFinance(save, league, coach)
    const replacedSalary =
      finance.salaryLines.find((line) => line.id === slotId)?.salary ?? 0
    const projectedPayroll =
      finance.payroll - replacedSalary + agent.salary

    if (projectedPayroll > finance.salaryCap) {
      return
    }

    const next = updateSave((draft) => {
      draft.team.rosterAssignments[slotId] = agent.id
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private cutRosterPlayer(slotId: TeamRosterSlotId): void {
    const save = this.requireSave()

    if (!save || !canCutRosterSlot(save, slotId)) {
      return
    }

    const next = updateSave((draft) => {
      draft.team.rosterAssignments[slotId] = null
      draft.team.rosterLoadouts[slotId] = createEmptyRosterLoadout()
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private swapRosterPlayerWithBench(slotId: TeamRosterSlotId): void {
    const save = this.requireSave()

    if (!save || !canSwapRosterSlotWithBench(save, slotId)) {
      return
    }

    const next = updateSave((draft) => {
      const activePlayerId = draft.team.rosterAssignments[slotId]
      const benchPlayerId = draft.team.rosterAssignments.bench
      const activeLoadout = structuredClone(draft.team.rosterLoadouts[slotId])
      const benchLoadout = structuredClone(draft.team.rosterLoadouts.bench)

      draft.team.rosterAssignments.bench = activePlayerId
      draft.team.rosterLoadouts.bench = activeLoadout
      draft.team.rosterAssignments[slotId] = benchPlayerId
      draft.team.rosterLoadouts[slotId] =
        benchPlayerId ? benchLoadout : createEmptyRosterLoadout()
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private signCoach(coachId: string): void {
    const save = this.requireSave()
    const league = this.getCurrentLeague()
    const candidate = getCoach(coachId)

    if (!save || !league) {
      return
    }

    const currentCoach = getOptionalCoach(save.team.coachId)

    if (candidate.id === currentCoach?.id) {
      return
    }

    const finance = getTeamFinance(save, league, currentCoach)
    const projectedPayroll =
      finance.payroll - (currentCoach?.salary ?? 0) + candidate.salary

    if (projectedPayroll > finance.salaryCap) {
      return
    }

    const next = updateSave((draft) => {
      draft.team.coachId = candidate.id
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private fireCoach(): void {
    const save = this.requireSave()
    const currentCoach = getOptionalCoach(save?.team.coachId)

    if (!save || !currentCoach) {
      return
    }

    const next = updateSave((draft) => {
      draft.team.coachId = null
    })

    if (next) {
      this.save = next
      this.renderTeamManagement()
    }
  }

  private buyItem(item: EquipmentItem): void {
    const save = this.requireSave()

    if (
      !save ||
      save.wallet.money < item.price ||
      (item.ultraUnique &&
        getInventoryItemCount(save.equipment.inventory, item.id) > 0)
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

  private equipItem(
    item: EquipmentItem,
    destination: 'store' | 'teamManagement' = 'store',
  ): void {
    const save = this.requireSave()

    if (!save?.equipment.inventory.includes(item.id)) {
      return
    }

    const slot = `${item.type}Id` as EquipmentSlot
    const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)

    if (
      getAvailableLoadoutCopies(save, item.id, {
        excludeSlotId: createdPlayerSlotId,
      }) <= 0
    ) {
      return
    }

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
      if (destination === 'teamManagement') {
        this.renderTeamManagement()
      } else {
        this.renderStore()
      }
    }
  }

  private equipRosterItem(
    slotId: TeamRosterSlotId,
    item: EquipmentItem,
  ): void {
    const save = this.requireSave()

    if (!save?.equipment.inventory.includes(item.id)) {
      return
    }

    if (
      getAvailableLoadoutCopies(save, item.id, {
        excludeSlotId: slotId,
      }) <= 0
    ) {
      return
    }

    const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)

    if (slotId === createdPlayerSlotId) {
      this.equipItemForCreatedPlayerSlot(item, slotId)
      return
    }

    const equipmentSlot = `${item.type}Id` as EquipmentSlot
    const next = updateSave((draft) => {
      const loadout = draft.team.rosterLoadouts[slotId]

      if (item.ultraUnique) {
        for (const key of Object.keys(loadout.equipment) as EquipmentSlot[]) {
          const equippedItem = getEquipmentItem(loadout.equipment[key])

          if (equippedItem?.ultraUnique && key !== equipmentSlot) {
            loadout.equipment[key] = null
          }
        }
      }

      loadout.equipment[equipmentSlot] = item.id
    })

    if (next) {
      this.save = next
      this.renderTeamLoadout(slotId)
    }
  }

  private equipItemForCreatedPlayerSlot(
    item: EquipmentItem,
    slotId: TeamRosterSlotId,
  ): void {
    const save = this.requireSave()

    if (!save?.equipment.inventory.includes(item.id)) {
      return
    }

    const slot = `${item.type}Id` as EquipmentSlot

    if (
      getAvailableLoadoutCopies(save, item.id, {
        excludeSlotId: slotId,
      }) <= 0
    ) {
      return
    }

    const next = updateSave((draft) => {
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
    })

    if (next) {
      this.save = next
      this.renderTeamLoadout(slotId)
    }
  }

  private clearRosterItem(
    slotId: TeamRosterSlotId,
    slot: EquipmentSlot,
  ): void {
    const save = this.requireSave()

    if (
      !save ||
      (slot === 'stickId' &&
        slotId === getCreatedPlayerRosterSlot(save.player))
    ) {
      return
    }

    const createdPlayerSlotId = getCreatedPlayerRosterSlot(save.player)
    const next = updateSave((draft) => {
      if (slotId === createdPlayerSlotId) {
        draft.equipment.equipped[slot] = null
        return
      }

      draft.team.rosterLoadouts[slotId].equipment[slot] = null
    })

    if (next) {
      this.save = next
      this.renderTeamLoadout(slotId)
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

  private getCurrentLeague(): (typeof defaultLeagues)[number] | null {
    const save = this.save

    if (!save) {
      return null
    }

    return (
      defaultLeagues.find(
        (candidate) => candidate.id === save.league.currentLeagueId,
      ) ??
      defaultLeagues[0] ??
      null
    )
  }

  private getNextLeagueOpponent(
    league: (typeof defaultLeagues)[number],
    save: SaveGame,
  ): (typeof opponentTeams)[number] | null {
    const nextOpponentId =
      league.teams[save.league.rookieCircuit.currentOpponentIndex]
        ?.opponentTeamId

    return (
      opponentTeams.find(
        (candidate) => candidate.id === nextOpponentId,
      ) ?? null
    )
  }

  private show(screen: HTMLElement): void {
    this.gameHost?.destroy()
    this.gameHost = null
    const destination = this.screen
    const shouldTransition =
      destination !== 'boot' && this.renderedScreen !== destination

    this.renderedScreen = destination
    this.navigationToken += 1
    const token = this.navigationToken
    this.navigationOverlay?.destroy()
    this.navigationOverlay = null
    this.root.dataset.screen = destination

    if (!shouldTransition) {
      this.root.dataset.navigationState = 'ready'
      this.root.replaceChildren(screen)
      return
    }

    this.root.dataset.navigationState = 'loading'
    screen.inert = true
    screen.setAttribute('aria-hidden', 'true')
    this.root.replaceChildren(screen)
    const overlay = new AppLoadingOverlay(this.root, destination)
    this.navigationOverlay = overlay
    overlay.update(0.08, 'Preparing interface')

    void waitForScreenAssets(screen, (progress, step) => {
      if (token === this.navigationToken) {
        overlay.update(progress, step)
      }
    }).then(() => {
      if (token !== this.navigationToken) {
        return
      }

      overlay.setFinalizing()
      screen.inert = false
      screen.removeAttribute('aria-hidden')
      this.root.dataset.navigationState = 'ready'
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      overlay.reveal(reducedMotion ? 60 : 220)
      this.navigationOverlay = null
    })
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
