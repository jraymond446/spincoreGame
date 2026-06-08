import { createDefaultLabTuning } from '../config/tuningDefaults'
import { teams } from '../data/teams'
import type { TeamSide } from '../data/matchTypes'
import {
  cloneLabState,
  getLabState,
} from './LabState'
import {
  labOptions,
  type LabPlayerTuning,
  type LabTuningState,
} from './LabConfig'
import { labEvents } from './LabEvents'

type LabPanelActions = {
  onApply: (state: LabTuningState) => void
  onResetMatch: () => void
  onResetCore: () => void
}

type SelectOption = {
  value: string
  label: string
}

type RangeOptions = {
  min: number
  max: number
  step: number
  digits?: number
}

export class LabPanel {
  private readonly root: HTMLDivElement
  private readonly actions: LabPanelActions
  private toggle: HTMLButtonElement | null = null
  private draft: LabTuningState
  private open = false
  private desktop = false
  private status = 'Runtime draft'

  constructor(root: HTMLDivElement, actions: LabPanelActions) {
    this.root = root
    this.actions = actions
    this.draft = cloneLabState(getLabState())
    this.syncLayoutMode()
    this.render()
    window.addEventListener('resize', this.handleResize)
    window.addEventListener(labEvents.stateChanged, this.handleStateChanged)
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener(labEvents.stateChanged, this.handleStateChanged)
    this.toggle?.remove()
  }

  private handleResize = (): void => {
    const wasDesktop = this.desktop
    this.syncLayoutMode()

    if (wasDesktop !== this.desktop) {
      this.render()
    }
  }

  private handleStateChanged = (): void => {
    this.draft = cloneLabState(getLabState())
    this.status = 'Synced to live match'
    this.render()
  }

  private syncLayoutMode(): void {
    this.desktop = window.matchMedia('(min-width: 1120px)').matches
    this.open = this.desktop || this.open
  }

  private render(): void {
    this.root.className =
      `lab-console-root ${this.open ? 'is-open' : ''} ` +
      `${this.desktop ? 'is-desktop' : 'is-drawer'}`
    this.toggle?.remove()
    this.root.replaceChildren()

    const toggle = this.button('LAB', 'lab-console-toggle', () => {
      this.open = !this.open
      this.render()
    })
    this.toggle = toggle
    toggle.setAttribute('aria-expanded', String(this.open))
    toggle.hidden = this.open

    if (this.desktop) {
      this.root.appendChild(toggle)
    } else {
      document.body.appendChild(toggle)
    }

    const panel = document.createElement('aside')
    panel.className = 'lab-console'
    panel.setAttribute('aria-label', 'Spincore Lab Console')

    const header = document.createElement('header')
    header.className = 'lab-console-header'
    const headingGroup = document.createElement('div')
    const title = document.createElement('h2')
    title.textContent = 'Spincore Lab Console'
    const subtitle = document.createElement('p')
    subtitle.textContent = this.status
    headingGroup.append(title, subtitle)
    header.appendChild(headingGroup)

    if (!this.desktop) {
      header.appendChild(
        this.button('Close', 'lab-console-close', () => {
          this.open = false
          this.render()
        }),
      )
    }

    panel.appendChild(header)

    const body = document.createElement('div')
    body.className = 'lab-console-body'
    body.append(
      this.createMatchSection(),
      this.createControlledSection(),
      this.createTeamSection('A'),
      this.createTeamSection('B'),
      this.createFieldSection(),
      this.createKeeperSection(),
      this.createStickSection(),
      this.createDefenseSection(),
      this.createMatchFlowSection(),
    )
    panel.appendChild(body)

    const footer = document.createElement('footer')
    footer.className = 'lab-console-footer'
    footer.append(
      this.button('Apply + Reset Match', 'lab-primary-button', () => {
        this.status = 'Applying structural settings...'
        this.actions.onApply(cloneLabState(this.draft))
      }),
      this.button('Defaults', 'lab-secondary-button', () => {
        this.draft = createDefaultLabTuning()
        this.status = 'Defaults loaded into draft'
        this.render()
      }),
    )
    panel.appendChild(footer)
    this.root.appendChild(panel)
  }

  private createMatchSection(): HTMLElement {
    const content = document.createElement('div')
    content.className = 'lab-section-grid'
    content.append(
      this.createSelect(
        'Mode',
        this.draft.mode,
        labOptions.modes,
        (value) => {
          this.draft.mode = value as LabTuningState['mode']
          this.markDraftChanged()
        },
      ),
      this.createSelect(
        'Controlled',
        this.draft.controlledPlayer,
        labOptions.controlledPlayers,
        (value) => {
          this.draft.controlledPlayer =
            value as LabTuningState['controlledPlayer']
          this.markDraftChanged()
          this.render()
        },
      ),
      this.createSelect(
        'Team A formation',
        this.draft.formations.A,
        stringOptions(labOptions.formations),
        (value) => {
          this.draft.formations.A =
            value as LabTuningState['formations']['A']
          this.markDraftChanged()
        },
      ),
      this.createSelect(
        'Team B formation',
        this.draft.formations.B,
        stringOptions(labOptions.formations),
        (value) => {
          this.draft.formations.B =
            value as LabTuningState['formations']['B']
          this.markDraftChanged()
        },
      ),
    )

    const actions = document.createElement('div')
    actions.className = 'lab-inline-actions'
    actions.append(
      this.button('Reset Match', 'lab-secondary-button', () => {
        this.actions.onResetMatch()
        this.status = 'Match reset'
        this.render()
      }),
      this.button('Reset Core', 'lab-secondary-button', () => {
        this.actions.onResetCore()
        this.status = 'Core reset'
        this.render()
      }),
    )
    content.appendChild(actions)

    return this.createSection('Match', content, true)
  }

  private createControlledSection(): HTMLElement {
    const player = this.getControlledEditorPlayer()
    const content = document.createElement('div')

    if (!player) {
      const empty = document.createElement('p')
      empty.className = 'lab-empty'
      empty.textContent = 'No Team A player matches this control slot.'
      content.appendChild(empty)
    } else {
      content.appendChild(this.createPlayerEditor(player, true))
    }

    return this.createSection('Controlled Player', content, true)
  }

  private createTeamSection(side: TeamSide): HTMLElement {
    const content = document.createElement('div')
    content.className = 'lab-player-list'
    const controlledId =
      side === 'A' ? this.getControlledEditorPlayer()?.id : null
    const playerIds =
      teams.find((team) => team.side === side)?.roster.map((entry) => entry.id) ??
      []
    const players = playerIds
      .filter((id) => id !== controlledId)
      .map((id) => this.draft.players[id])
      .filter((player): player is LabPlayerTuning => Boolean(player))

    for (const player of players) {
      content.appendChild(this.createPlayerEditor(player, false))
    }

    return this.createSection(`Team ${side} AI Players`, content)
  }

  private createPlayerEditor(
    player: LabPlayerTuning,
    showAllAttributes: boolean,
  ): HTMLElement {
    const card = document.createElement('article')
    card.className = 'lab-player-editor'
    const heading = document.createElement('h3')
    heading.textContent = player.id
    card.appendChild(heading)

    const identity = document.createElement('div')
    identity.className = 'lab-section-grid'
    identity.append(
      this.createSelect(
        'Role',
        player.role,
        stringOptions(labOptions.roles),
        (value) => {
          player.role = value as LabPlayerTuning['role']
          this.markDraftChanged()
        },
      ),
      this.createSelect(
        'Style',
        player.playStyle,
        stringOptions(labOptions.playStyles),
        (value) => {
          player.playStyle = value as LabPlayerTuning['playStyle']
          this.markDraftChanged()
        },
      ),
      this.createSelect(
        'Hand',
        player.handedness,
        stringOptions(labOptions.handedness),
        (value) => {
          player.handedness = value as LabPlayerTuning['handedness']
          this.markDraftChanged()
        },
      ),
      this.createSelect(
        'Stick',
        player.stickStyle,
        stringOptions(labOptions.stickStyles),
        (value) => {
          player.stickStyle = value as LabPlayerTuning['stickStyle']
          this.markDraftChanged()
        },
      ),
    )
    card.appendChild(identity)

    const attributes = document.createElement('div')
    attributes.className = 'lab-attribute-grid'
    const keys = showAllAttributes
      ? labOptions.attributes
      : labOptions.attributes

    for (const attribute of keys) {
      attributes.appendChild(
        this.createRange(
          titleCase(attribute),
          player.attributes[attribute],
          { min: 0.2, max: 1.2, step: 0.02, digits: 2 },
          (value) => {
            player.attributes[attribute] = value
            this.markDraftChanged()
          },
        ),
      )
    }
    card.appendChild(attributes)

    const defenseTendencies = document.createElement('div')
    defenseTendencies.className = 'lab-attribute-grid'
    defenseTendencies.append(
      this.createRange(
        'Truck aggression',
        player.defenseTendencies.truckAggression,
        { min: 0, max: 1.4, step: 0.05, digits: 2 },
        (value) => {
          player.defenseTendencies.truckAggression = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Slash aggression',
        player.defenseTendencies.slashAggression,
        { min: 0, max: 1.4, step: 0.05, digits: 2 },
        (value) => {
          player.defenseTendencies.slashAggression = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Fumble preference',
        player.defenseTendencies.fumblePressurePreference,
        { min: 0, max: 1.4, step: 0.05, digits: 2 },
        (value) => {
          player.defenseTendencies.fumblePressurePreference = value
          this.markDraftChanged()
        },
      ),
    )
    card.appendChild(defenseTendencies)
    return card
  }

  private createFieldSection(): HTMLElement {
    const field = this.draft.field
    const content = document.createElement('div')
    content.className = 'lab-range-list'
    content.append(
      this.createRange(
        'Arena width',
        field.arenaWidth,
        { min: 700, max: 1050, step: 10 },
        (value) => {
          field.arenaWidth = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Arena height',
        field.arenaHeight,
        { min: 1100, max: 1700, step: 10 },
        (value) => {
          field.arenaHeight = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Player visual scale',
        field.playerVisualScale,
        { min: 0.65, max: 1.15, step: 0.01, digits: 2 },
        (value) => {
          field.playerVisualScale = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Player physics radius',
        field.playerPhysicsRadius,
        { min: 18, max: 34, step: 1 },
        (value) => {
          field.playerPhysicsRadius = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Stick visual scale',
        field.stickVisualScale,
        { min: 0.45, max: 1.2, step: 0.01, digits: 2 },
        (value) => {
          field.stickVisualScale = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Stick gameplay scale',
        field.stickGameplayScale,
        { min: 0.6, max: 1.15, step: 0.01, digits: 2 },
        (value) => {
          field.stickGameplayScale = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Core radius',
        field.coreRadius,
        { min: 10, max: 26, step: 1 },
        (value) => {
          field.coreRadius = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Core mass / density',
        field.coreDensity,
        { min: 0.001, max: 0.009, step: 0.0005, digits: 4 },
        (value) => {
          field.coreDensity = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Core restitution',
        field.coreRestitution,
        { min: 0.2, max: 1.2, step: 0.02, digits: 2 },
        (value) => {
          field.coreRestitution = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal width',
        field.goalWidth,
        { min: 90, max: 260, step: 5 },
        (value) => {
          field.goalWidth = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal post radius',
        field.goalPostRadius,
        { min: 8, max: 28, step: 1 },
        (value) => {
          field.goalPostRadius = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal post restitution',
        field.goalPostRestitution,
        { min: 0.2, max: 1.2, step: 0.02, digits: 2 },
        (value) => {
          field.goalPostRestitution = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal inset from end',
        field.goalInsetFromEnd,
        { min: 130, max: 360, step: 5 },
        (value) => {
          field.goalInsetFromEnd = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Keeper zone radius',
        field.keeperZoneRadius,
        { min: 100, max: 210, step: 1 },
        (value) => {
          field.keeperZoneRadius = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Inner no-body radius',
        field.innerNoBodyRadius,
        { min: 20, max: 72, step: 1 },
        (value) => {
          field.innerNoBodyRadius = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Keeper boundary buffer',
        field.keeperZoneBoundaryBuffer,
        { min: 0, max: 20, step: 1 },
        (value) => {
          field.keeperZoneBoundaryBuffer = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Keeper push strength',
        field.keeperZonePushStrength,
        { min: 0.1, max: 1, step: 0.05, digits: 2 },
        (value) => {
          field.keeperZonePushStrength = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Scoring tolerance',
        field.scoringPlaneTolerance,
        { min: 0, max: 18, step: 1 },
        (value) => {
          field.scoringPlaneTolerance = value
          this.markDraftChanged()
        },
      ),
    )

    return this.createSection('Field / Object Tuning', content)
  }

  private createKeeperSection(): HTMLElement {
    const keeper = this.draft.keeper
    const content = document.createElement('div')
    content.className = 'lab-range-list'
    content.append(
      this.createSelect(
        'Keeper control mode',
        keeper.keeperControlMode,
        labOptions.keeperControlModes,
        (value) => {
          keeper.keeperControlMode =
            value as LabTuningState['keeper']['keeperControlMode']
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Human bias enabled',
        keeper.keeperHumanBiasEnabled,
        (value) => {
          keeper.keeperHumanBiasEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Auto-switch enabled',
        keeper.keeperAutoSwitchEnabled,
        (value) => {
          keeper.keeperAutoSwitchEnabled = value
          this.markDraftChanged()
        },
      ),
    )
    const modeDescription = document.createElement('p')
    modeDescription.className = 'lab-empty'
    modeDescription.textContent =
      'AI only keeps full keeper automation. Bias assist shades the AI from human movement. Auto switch takes control during direct threats. Manual when selected enables explicit keeper control.'
    content.appendChild(modeDescription)

    const controls: Array<
      [
        string,
        Exclude<
          keyof LabTuningState['keeper'],
          | 'keeperControlMode'
          | 'keeperHumanBiasEnabled'
          | 'keeperAutoSwitchEnabled'
        >,
        RangeOptions,
      ]
    > = [
      ['Tight target ratio', 'keeperTightTargetRadiusRatio', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Balanced target ratio', 'keeperBalancedTargetRadiusRatio', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Sweeper target ratio', 'keeperSweeperTargetRadiusRatio', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Reaction multiplier', 'keeperReactionMultiplier', { min: 0.5, max: 2.2, step: 0.05, digits: 2 }],
      ['Threat lookahead ms', 'keeperThreatLookaheadMs', { min: 0, max: 700, step: 10 }],
      ['Return home speed', 'keeperReturnHomeSpeed', { min: 0.2, max: 1.4, step: 0.05, digits: 2 }],
      ['Clear aggression', 'keeperClearAggression', { min: 0, max: 1.5, step: 0.05, digits: 2 }],
      ['Deflect aggression', 'keeperDeflectAggression', { min: 0, max: 1.5, step: 0.05, digits: 2 }],
      ['Orbit smoothing', 'keeperOrbitSmoothing', { min: 0.5, max: 8, step: 0.1, digits: 1 }],
      ['Max lateral speed', 'keeperMaxLateralSpeed', { min: 2, max: 9, step: 0.1, digits: 1 }],
      ['Human bias strength', 'keeperHumanBiasStrength', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Human lateral bias', 'keeperHumanLateralBiasStrength', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Human depth bias', 'keeperHumanDepthBiasStrength', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Human bias max offset', 'keeperHumanBiasMaxOffset', { min: 0, max: 70, step: 1 }],
      ['Human bias decay', 'keeperHumanBiasDecay', { min: 1, max: 16, step: 0.5, digits: 1 }],
      ['Auto-switch threat radius', 'keeperAutoSwitchThreatRadius', { min: 100, max: 360, step: 5 }],
      ['Auto-switch delay ms', 'keeperAutoSwitchDelayMs', { min: 0, max: 600, step: 10 }],
      ['Manual override ms', 'keeperManualOverrideDurationMs', { min: 100, max: 2200, step: 50 }],
    ]

    for (const [label, key, options] of controls) {
      content.appendChild(
        this.createRange(label, keeper[key], options, (value) => {
          keeper[key] = value
          this.markDraftChanged()
        }),
      )
    }

    return this.createSection('Keeper Geometry / Control', content)
  }

  private createStickSection(): HTMLElement {
    const stick = this.draft.stick
    const content = document.createElement('div')
    content.className = 'lab-range-list'
    content.append(
      this.createCheckbox(
        'Carry control enabled',
        stick.carryControlEnabled,
        (value) => {
          stick.carryControlEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Gather snap effect',
        stick.gatherSnapEffectEnabled,
        (value) => {
          stick.gatherSnapEffectEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Hard charge enabled',
        stick.hardChargeEnabled,
        (value) => {
          stick.hardChargeEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Player charge aura',
        stick.playerChargeAuraEnabled,
        (value) => {
          stick.playerChargeAuraEnabled = value
          this.markDraftChanged()
        },
      ),
    )
    const controls: Array<
      [
        string,
        Exclude<
          keyof LabTuningState['stick'],
          | 'carryControlEnabled'
          | 'gatherSnapEffectEnabled'
          | 'hardChargeEnabled'
          | 'playerChargeAuraEnabled'
        >,
        RangeOptions,
      ]
    > = [
      ['Carry socket lag', 'carrySocketLag', { min: 0.02, max: 0.4, step: 0.01, digits: 2 }],
      ['Carry socket max offset', 'carrySocketMaxOffset', { min: 0, max: 70, step: 1 }],
      ['Carry lateral range', 'carrySocketLateralRange', { min: 0, max: 60, step: 1 }],
      ['Carry forward range', 'carrySocketForwardRange', { min: 0, max: 45, step: 1 }],
      ['Carry sway amount', 'carrySwayAmount', { min: 0, max: 0.5, step: 0.01, digits: 2 }],
      ['Carry sway smoothing', 'carrySwaySmoothing', { min: 1, max: 24, step: 0.5, digits: 1 }],
      ['Carry control deadzone', 'carryControlDeadzone', { min: 0, max: 0.4, step: 0.01, digits: 2 }],
      ['Carry responsiveness', 'carryControlResponsiveness', { min: 1, max: 24, step: 0.5, digits: 1 }],
      ['Carry aim blend', 'carryAimBlend', { min: 0, max: 1, step: 0.02, digits: 2 }],
      ['Carry pose offset', 'carryPoseOffsetRadians', { min: -1.2, max: 1.2, step: 0.02, digits: 2 }],
      ['Carry pose max arc', 'carryPoseMaxArcRadians', { min: 0.2, max: 2, step: 0.02, digits: 2 }],
      ['Carry pose smoothing', 'carryPoseSmoothing', { min: 1, max: 28, step: 0.5, digits: 1 }],
      ['Carry rotation limit', 'carryPoseRotationLimit', { min: 1, max: 16, step: 0.2, digits: 1 }],
      ['Gather assist strength', 'gatherAssistStrength', { min: 0, max: 1, step: 0.02, digits: 2 }],
      ['Gather assist radius', 'gatherAssistRadius', { min: 20, max: 120, step: 1 }],
      ['Gather assist max speed', 'gatherAssistMaxSpeed', { min: 0, max: 12, step: 0.2, digits: 1 }],
      ['Gather snap distance', 'gatherSnapDistance', { min: 0, max: 50, step: 1 }],
      ['Gather deflect suppression', 'gatherDeflectSuppression', { min: 0, max: 1, step: 0.02, digits: 2 }],
      ['Charge load-back distance', 'chargeLoadbackDistance', { min: 0, max: 36, step: 1 }],
      ['Hard charge hold ms', 'hardChargeHoldMs', { min: 100, max: 1400, step: 25 }],
      ['Hard charge multiplier', 'hardChargeMultiplier', { min: 1, max: 1.5, step: 0.01, digits: 2 }],
      ['Charge aura threshold', 'playerChargeAuraThreshold', { min: 0, max: 1, step: 0.02, digits: 2 }],
      ['Max cradle entry speed', 'maxCradleEntrySpeed', { min: 4, max: 70, step: 1 }],
      ['Cradle min radius', 'cradleMinRadius', { min: 20, max: 90, step: 1 }],
      ['Cradle max radius', 'cradleMaxRadius', { min: 80, max: 170, step: 1 }],
      ['Cradle min angle', 'cradleMinAngle', { min: 0, max: 35, step: 1 }],
      ['Cradle max angle', 'cradleMaxAngle', { min: 35, max: 90, step: 1 }],
      ['Cradle capture radius', 'cradleCaptureRadius', { min: 24, max: 100, step: 1 }],
      ['Passive nudge force', 'passiveNudgeForce', { min: 0, max: 3, step: 0.05, digits: 2 }],
      ['Active swing force', 'activeSwingForce', { min: 1, max: 14, step: 0.2, digits: 1 }],
      ['Max deflect impulse', 'maxDeflectImpulse', { min: 1, max: 16, step: 0.2, digits: 1 }],
      ['Release force min', 'releaseForceMin', { min: 2, max: 18, step: 0.2, digits: 1 }],
      ['Release force max', 'releaseForceMax', { min: 8, max: 28, step: 0.2, digits: 1 }],
      ['Charge force exponent', 'chargeForceExponent', { min: 0.4, max: 3.5, step: 0.05, digits: 2 }],
      ['Overcharge accuracy penalty', 'overchargeAccuracyPenalty', { min: 0, max: 0.6, step: 0.01, digits: 2 }],
      ['Charge load-back min', 'chargeLoadbackMinRadians', { min: 0, max: 0.8, step: 0.02, digits: 2 }],
      ['Charge load-back max', 'chargeLoadbackMaxRadians', { min: 0.1, max: 1.2, step: 0.02, digits: 2 }],
      ['Charge load-back smoothing', 'chargeLoadbackSmoothing', { min: 1, max: 24, step: 0.5, digits: 1 }],
      ['Overcharge jitter amount', 'overchargeJitterAmount', { min: 0, max: 0.16, step: 0.01, digits: 2 }],
      ['Overcharge jitter speed', 'overchargeJitterSpeed', { min: 1, max: 36, step: 1 }],
      ['Release windup ms', 'releaseWindupMs', { min: 0, max: 140, step: 5 }],
      ['Release swing ms', 'releaseSwingMs', { min: 40, max: 220, step: 5 }],
      ['Release follow-through ms', 'releaseFollowThroughMs', { min: 40, max: 300, step: 5 }],
      ['Release swing arc', 'releaseSwingArcRadians', { min: 0.2, max: 1.5, step: 0.05, digits: 2 }],
      ['Release point normalized', 'releasePointNormalized', { min: 0.2, max: 0.9, step: 0.05, digits: 2 }],
      ['Release tangential force', 'releaseTangentialForceMultiplier', { min: 0, max: 0.8, step: 0.05, digits: 2 }],
      ['Release forward force', 'releaseForwardForceMultiplier', { min: 0.4, max: 1.2, step: 0.05, digits: 2 }],
      ['Release spin influence', 'releaseSpinInfluence', { min: 0, max: 0.6, step: 0.02, digits: 2 }],
      ['Visual total length', 'stickTotalLength', { min: 72, max: 102, step: 1 }],
      ['Visual handle width', 'stickHandleWidth', { min: 6, max: 15, step: 1 }],
      ['Visual pocket width', 'stickPocketWidth', { min: 0.65, max: 1.5, step: 0.05, digits: 2 }],
      ['Visual pocket depth', 'stickPocketDepth', { min: 16, max: 36, step: 1 }],
      ['Visual lip thickness', 'stickLipThickness', { min: 0.65, max: 1.5, step: 0.05, digits: 2 }],
      ['Visual handle length', 'stickHandleLength', { min: 0.7, max: 1.35, step: 0.05, digits: 2 }],
      ['Inner pocket highlight', 'stickInnerHighlight', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Inner highlight width', 'stickInnerHighlightWidth', { min: 1, max: 7, step: 1 }],
      ['Equipment outline alpha', 'stickOutlineAlpha', { min: 0.35, max: 1, step: 0.05, digits: 2 }],
      ['Equipment outline width', 'stickOutlineWidth', { min: 1, max: 6, step: 1 }],
      ['Wood grain alpha', 'stickWoodGrainAlpha', { min: 0, max: 0.35, step: 0.01, digits: 2 }],
      ['Swing trail alpha', 'swingTrailAlpha', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Swing trail duration', 'swingTrailDuration', { min: 60, max: 360, step: 10 }],
      ['Aim smoothing', 'aimSmoothing', { min: 1, max: 28, step: 0.5, digits: 1 }],
      ['Max rotation speed', 'maxStickRotationSpeed', { min: 1, max: 18, step: 0.2, digits: 1 }],
      ['Cradle facing offset', 'cradleFacingOffsetRadians', { min: -1.2, max: 1.2, step: 0.02, digits: 2 }],
      ['Ready stance offset', 'stickStanceOffsetRadians', { min: -1.2, max: 1.2, step: 0.02, digits: 2 }],
      ['Handedness stick offset', 'handednessStickOffset', { min: 0, max: 28, step: 1 }],
      ['Handedness mirror', 'handednessMirrorMultiplier', { min: 0.5, max: 1.5, step: 0.05, digits: 2 }],
    ]

    for (const [label, key, options] of controls) {
      content.appendChild(
        this.createRange(label, stick[key], options, (value) => {
          stick[key] = value
          this.markDraftChanged()
        }),
      )
    }

    return this.createSection('Stick / Cradle Tuning', content)
  }

  private createDefenseSection(): HTMLElement {
    const defense = this.draft.defense
    const content = document.createElement('div')
    content.className = 'lab-range-list'
    content.append(
      this.createCheckbox(
        'Truck enabled',
        defense.truckEnabled,
        (value) => {
          defense.truckEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Stick slash enabled',
        defense.slashEnabled,
        (value) => {
          defense.slashEnabled = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Off-ball truck speed boost',
        defense.truckOffBallSpeedBoostAllowed,
        (value) => {
          defense.truckOffBallSpeedBoostAllowed = value
          this.markDraftChanged()
        },
      ),
    )
    const controls: Array<
      [
        string,
        Exclude<
          keyof LabTuningState['defense'],
          'truckEnabled' | 'slashEnabled' | 'truckOffBallSpeedBoostAllowed'
        >,
        RangeOptions,
      ]
    > = [
      ['Truck cooldown ms', 'truckCooldownMs', { min: 300, max: 2200, step: 25 }],
      ['Truck startup ms', 'truckStartupMs', { min: 0, max: 300, step: 5 }],
      ['Truck active ms', 'truckActiveMs', { min: 40, max: 360, step: 5 }],
      ['Truck recovery ms', 'truckRecoveryMs', { min: 80, max: 700, step: 10 }],
      ['Truck range', 'truckRange', { min: 50, max: 160, step: 2 }],
      ['Truck arc radians', 'truckArcRadians', { min: 0.4, max: 2.5, step: 0.02, digits: 2 }],
      ['Truck lunge impulse', 'truckLungeImpulse', { min: 1, max: 12, step: 0.1, digits: 1 }],
      ['Truck body impulse', 'truckBodyImpulse', { min: 1, max: 12, step: 0.1, digits: 1 }],
      ['Truck fumble pressure', 'truckFumblePressure', { min: 0.05, max: 1.2, step: 0.02, digits: 2 }],
      ['Truck overcharge multiplier', 'truckOverchargeMultiplier', { min: 0.5, max: 3, step: 0.05, digits: 2 }],
      ['Brute truck multiplier', 'bruteTruckMultiplier', { min: 0.5, max: 2.2, step: 0.05, digits: 2 }],
      ['Non-brute truck multiplier', 'nonBruteTruckMultiplier', { min: 0.2, max: 1.4, step: 0.05, digits: 2 }],
      ['Truck miss movement', 'truckMissRecoveryMovement', { min: 0.2, max: 1, step: 0.05, digits: 2 }],
      ['Slash cooldown ms', 'slashCooldownMs', { min: 200, max: 1500, step: 25 }],
      ['Slash startup ms', 'slashStartupMs', { min: 0, max: 220, step: 5 }],
      ['Slash active ms', 'slashActiveMs', { min: 40, max: 320, step: 5 }],
      ['Slash recovery ms', 'slashRecoveryMs', { min: 50, max: 500, step: 10 }],
      ['Slash arc radians', 'slashArcRadians', { min: 0.5, max: 3, step: 0.02, digits: 2 }],
      ['Slash range', 'slashRange', { min: 60, max: 180, step: 2 }],
      ['Slash fumble pressure', 'slashFumblePressure', { min: 0.05, max: 1, step: 0.02, digits: 2 }],
      ['Slash overcharge multiplier', 'slashOverchargeMultiplier', { min: 0.5, max: 3, step: 0.05, digits: 2 }],
      ['Free Core slash impulse', 'slashFreeCoreImpulse', { min: 0.5, max: 10, step: 0.1, digits: 1 }],
      ['Slash body impulse', 'slashBodyImpulse', { min: 0, max: 1, step: 0.05, digits: 2 }],
      ['Support slash precision', 'supportSlashPrecisionMultiplier', { min: 0.6, max: 1.8, step: 0.05, digits: 2 }],
      ['Brute slash power', 'bruteSlashPowerMultiplier', { min: 0.6, max: 1.8, step: 0.05, digits: 2 }],
      ['Fumble threshold', 'fumblePressureThreshold', { min: 0.3, max: 2, step: 0.05, digits: 2 }],
      ['Pressure decay / sec', 'fumblePressureDecayPerSecond', { min: 0, max: 1, step: 0.02, digits: 2 }],
      ['Overcharge vulnerability', 'overchargeFumbleVulnerability', { min: 0.5, max: 3, step: 0.05, digits: 2 }],
      ['Stable resistance', 'stableCradleFumbleResistance', { min: 0.2, max: 1.4, step: 0.05, digits: 2 }],
      ['Charging resistance', 'chargingFumbleResistance', { min: 0.2, max: 1.6, step: 0.05, digits: 2 }],
      ['Brute fumble bonus', 'bruteFumbleBonus', { min: 0, max: 0.7, step: 0.02, digits: 2 }],
      ['Support steal bonus', 'supportStealBonus', { min: 0, max: 0.7, step: 0.02, digits: 2 }],
    ]

    for (const [label, key, options] of controls) {
      content.appendChild(
        this.createRange(label, defense[key], options, (value) => {
          defense[key] = value
          this.markDraftChanged()
        }),
      )
    }

    return this.createSection('Defense / Fumble Tuning', content)
  }

  private createMatchFlowSection(): HTMLElement {
    const matchFlow = this.draft.matchFlow
    const content = document.createElement('div')
    content.className = 'lab-range-list'
    content.append(
      this.createCheckbox(
        'Enable goal celebration',
        matchFlow.enableGoalCelebration,
        (value) => {
          matchFlow.enableGoalCelebration = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal celebration ms',
        matchFlow.goalCelebrationMs,
        { min: 300, max: 3000, step: 50 },
        (value) => {
          matchFlow.goalCelebrationMs = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal flash ms',
        matchFlow.goalFlashDurationMs,
        { min: 100, max: 2000, step: 25 },
        (value) => {
          matchFlow.goalFlashDurationMs = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Goal text ms',
        matchFlow.goalTextDurationMs,
        { min: 100, max: 2500, step: 25 },
        (value) => {
          matchFlow.goalTextDurationMs = value
          this.markDraftChanged()
        },
      ),
      this.createCheckbox(
        'Enable reset countdown',
        matchFlow.enableResetCountdown,
        (value) => {
          matchFlow.enableResetCountdown = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Countdown start',
        matchFlow.resetCountdownStart,
        { min: 1, max: 5, step: 1 },
        (value) => {
          matchFlow.resetCountdownStart = value
          this.markDraftChanged()
        },
      ),
      this.createRange(
        'Countdown step ms',
        matchFlow.resetCountdownStepMs,
        { min: 300, max: 1500, step: 50 },
        (value) => {
          matchFlow.resetCountdownStepMs = value
          this.markDraftChanged()
        },
      ),
    )

    return this.createSection('Celebration / Reset Flow', content)
  }

  private createSection(
    titleText: string,
    content: HTMLElement,
    open = false,
  ): HTMLElement {
    const details = document.createElement('details')
    details.className = 'lab-section'
    details.open = open
    const summary = document.createElement('summary')
    summary.textContent = titleText
    details.append(summary, content)
    return details
  }

  private createSelect(
    labelText: string,
    value: string,
    options: readonly SelectOption[],
    onChange: (value: string) => void,
  ): HTMLElement {
    const label = document.createElement('label')
    label.className = 'lab-field'
    const text = document.createElement('span')
    text.textContent = labelText
    const select = document.createElement('select')

    for (const option of options) {
      const element = document.createElement('option')
      element.value = option.value
      element.textContent = option.label
      select.appendChild(element)
    }

    select.value = value
    select.addEventListener('change', () => onChange(select.value))
    label.append(text, select)
    return label
  }

  private createRange(
    labelText: string,
    value: number,
    options: RangeOptions,
    onChange: (value: number) => void,
  ): HTMLElement {
    const label = document.createElement('label')
    label.className = 'lab-range-field'
    const row = document.createElement('span')
    row.className = 'lab-range-label'
    const text = document.createElement('span')
    text.textContent = labelText
    const output = document.createElement('output')
    output.textContent = formatNumber(value, options.digits)
    row.append(text, output)

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(options.min)
    input.max = String(options.max)
    input.step = String(options.step)
    input.value = String(value)
    input.addEventListener('input', () => {
      const nextValue = Number.parseFloat(input.value)
      output.textContent = formatNumber(nextValue, options.digits)
      onChange(nextValue)
    })
    label.append(row, input)
    return label
  }

  private createCheckbox(
    labelText: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): HTMLElement {
    const label = document.createElement('label')
    label.className = 'lab-checkbox-field'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = checked
    const text = document.createElement('span')
    text.textContent = labelText
    input.addEventListener('change', () => onChange(input.checked))
    label.append(input, text)
    return label
  }

  private button(
    text: string,
    className: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.textContent = text
    button.addEventListener('click', onClick)
    return button
  }

  private getControlledEditorPlayer(): LabPlayerTuning | null {
    const teamAIds =
      teams.find((team) => team.side === 'A')?.roster.map((entry) => entry.id) ??
      []
    const players = teamAIds
      .map((id) => this.draft.players[id])
      .filter((player): player is LabPlayerTuning => Boolean(player))

    const preferredId =
      this.draft.controlledPlayer === 'keeper'
        ? 'a-keeper'
        : this.draft.controlledPlayer === 'flex'
          ? 'a-support'
          : 'a-striker'

    return (
      players.find((player) => player.id === preferredId) ??
      players.find((player) => player.role !== 'keeper') ??
      players[0] ??
      null
    )
  }

  private markDraftChanged(): void {
    this.status = 'Draft changed; Apply to rebuild'
  }
}

function stringOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({
    value,
    label: titleCase(value),
  }))
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}

function formatNumber(value: number, digits = 0): string {
  return value.toFixed(digits)
}
