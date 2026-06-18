import { equipmentCatalog } from '../equipment/equipmentCatalog.ts'
import { getInventoryItemCount } from '../equipment/equipmentInventory.ts'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects.ts'
import { getFreeAgent } from '../franchise/freeAgentCatalog.ts'
import { getTeamRosterReadiness } from '../franchise/teamRoster.ts'
import type { PlayerRosterEntry } from '../game/data/matchTypes.ts'
import { mapCreatedPlayerAttributesToMatchAttributes } from '../player/playerAttributeAdapter.ts'
import { defaultPlayerCosmetics } from '../player/playerCosmetics.ts'
import {
  createCreatedPlayer,
  createNewSave,
} from '../save/defaultSave.ts'
import {
  playerAttributeDefault,
  playerEffectiveAttributeMax,
  type CreatedPlayerAttributes,
  type PlayerAttributeKey,
} from '../save/saveTypes.ts'
import { validateSave } from '../save/saveValidation.ts'
import { applyMatchRosterOverrides } from './buildRosterFromSave.ts'

const baseline = attributes()
const low = mapCreatedPlayerAttributesToMatchAttributes(attributes(1))
const neutral = mapCreatedPlayerAttributesToMatchAttributes(baseline)
const elite = mapCreatedPlayerAttributesToMatchAttributes(attributes(25))

assertGreater(
  neutral.speed,
  0.8,
  'neutral created speed should feel match-competent',
)
assertGreater(
  elite.speed - low.speed,
  0.75,
  '1-25 speed spread should create a clear gameplay gap',
)
assertGreater(
  elite.ballHandling - low.ballHandling,
  0.75,
  '1-25 handling spread should affect gathering and fumble resistance',
)

const save = createNewSave(
  createCreatedPlayer({
    name: 'Stat Tester',
    jerseyNumber: 27,
    handedness: 'left',
    archetype: 'striker',
    cosmetics: defaultPlayerCosmetics,
    attributes: baseline,
    selectedStickId: 'balanced-cesta',
  }),
)
const beforeGear = getEffectivePlayerAttributes(save)
save.equipment.inventory.push(
  'quick-whip',
  'apex-runners',
  'apex-runners',
  'crash-padding',
  'spin-sling',
)
save.equipment.equipped.stickId = 'quick-whip'
save.equipment.equipped.shoesId = 'apex-runners'
save.equipment.equipped.armorId = 'crash-padding'
save.team.rosterAssignments['a-support'] = 'miko-banks'
save.team.rosterLoadouts['a-support'].equipment.stickId = 'spin-sling'
save.team.rosterLoadouts['a-support'].equipment.shoesId = 'apex-runners'
const afterGear = getEffectivePlayerAttributes(save)
const incompleteReadiness = getTeamRosterReadiness(save)

assertEqual(
  incompleteReadiness.ready,
  false,
  'lineup should not be match-ready without a signed keeper',
)
assertEqual(
  incompleteReadiness.missingActiveSlotIds.includes('a-keeper'),
  true,
  'lineup readiness should identify the missing keeper',
)

save.team.rosterAssignments['a-keeper'] = 'rhea-stone'

assertEqual(
  getTeamRosterReadiness(save).ready,
  true,
  'lineup should be match-ready once all active slots are filled',
)

assertGreater(
  afterGear.speed,
  beforeGear.speed,
  'equipped speed gear should change effective speed',
)
assertGreater(
  afterGear.reaction,
  beforeGear.reaction,
  'equipped reaction gear should change effective reaction',
)
assertGreater(
  afterGear.toughness,
  beforeGear.toughness,
  'equipped armor should change effective toughness',
)

const endgameSave = createNewSave(
  createCreatedPlayer({
    name: 'Cap Tester',
    jerseyNumber: 99,
    handedness: 'right',
    archetype: 'striker',
    cosmetics: defaultPlayerCosmetics,
    attributes: attributes(25),
    selectedStickId: 'orbit-breaker',
  }),
)
endgameSave.equipment.inventory.push('redline-spikes')
endgameSave.equipment.equipped.stickId = 'orbit-breaker'
endgameSave.equipment.equipped.shoesId = 'redline-spikes'
const endgameAttributes = getEffectivePlayerAttributes(endgameSave)
assertEqual(
  endgameAttributes.speed,
  playerEffectiveAttributeMax,
  'endgame speed should reach effective cap',
)
assertEqual(
  endgameAttributes.shotPower,
  playerEffectiveAttributeMax,
  'endgame shot power should reach effective cap',
)

const duplicateInventorySave = createNewSave(
  createCreatedPlayer({
    name: 'Copy Tester',
    jerseyNumber: 12,
    handedness: 'right',
    archetype: 'support',
    cosmetics: defaultPlayerCosmetics,
    attributes: baseline,
    selectedStickId: 'balanced-cesta',
  }),
)
duplicateInventorySave.equipment.inventory.push('balanced-cesta')
const validatedDuplicateInventory = validateSave(duplicateInventorySave)

if (!validatedDuplicateInventory) {
  throw new Error('duplicate inventory save failed validation')
}

assertEqual(
  getInventoryItemCount(
    validatedDuplicateInventory.equipment.inventory,
    'balanced-cesta',
  ),
  2,
  'duplicate inventory copies should survive validation',
)

const teamA = createTeamARoster()
const teamB: PlayerRosterEntry[] = []
const overrides = applyMatchRosterOverrides(
  teamA,
  teamB,
  save,
  undefined,
)
const createdPlayerRuntime = overrides.archetypes.get('a-striker')
const supportRuntime = overrides.archetypes.get('a-support')
const supportEntry = teamA.find((entry) => entry.id === 'a-support')
const signedSupport = getFreeAgent('miko-banks')

if (!createdPlayerRuntime) {
  throw new Error('created player runtime archetype was not applied')
}

if (!supportRuntime) {
  throw new Error('teammate runtime archetype was not applied')
}

if (!signedSupport) {
  throw new Error('signed support free agent missing from catalog')
}

assertEqual(
  teamA.find((entry) => entry.id === 'a-striker')?.controllerType,
  'human',
  'created player should control the matching roster slot',
)
assertEqual(
  supportEntry?.displayName,
  'Miko Banks',
  'signed free agent should replace the live teammate identity',
)
assertEqual(
  supportEntry?.handedness,
  'left',
  'signed free agent handedness should reach the live roster',
)
assertGreater(
  createdPlayerRuntime.attributes.speed,
  neutral.speed,
  'equipped speed should reach the live match archetype',
)
assertGreater(
  createdPlayerRuntime.attributes.ballHandling,
  neutral.ballHandling,
  'equipped handling should reach the live match archetype',
)
assertGreater(
  createdPlayerRuntime.attributes.power,
  neutral.power,
  'equipped power should reach the live match archetype',
)
assertGreater(
  supportRuntime.attributes.speed,
  mapCreatedPlayerAttributesToMatchAttributes(signedSupport.attributes).speed,
  'signed teammate shoes should affect the live match archetype',
)
assertGreater(
  supportRuntime.attributes.passing,
  neutral.passing,
  'signed teammate attributes should affect the live match archetype',
)
assertEqual(
  supportEntry?.stickStyle,
  'fork',
  'teammate stick assignment should reach the live roster',
)

for (const itemId of [
  'quick-whip',
  'apex-runners',
  'crash-padding',
  'orbit-breaker',
  'redline-spikes',
]) {
  if (!equipmentCatalog.some((item) => item.id === itemId)) {
    throw new Error(`${itemId} missing from equipment catalog`)
  }
}

console.info('Attribute gameplay bridge cases passed: 23')

function attributes(value = playerAttributeDefault): CreatedPlayerAttributes {
  const result = {} as CreatedPlayerAttributes

  for (const key of [
    'speed',
    'reaction',
    'shotPower',
    'shotAccuracy',
    'shotSpin',
    'toughness',
  ] satisfies PlayerAttributeKey[]) {
    result[key] = value
  }

  return result
}

function createTeamARoster(): PlayerRosterEntry[] {
  return [
    {
      id: 'a-keeper',
      teamId: 'team-a',
      teamSide: 'A',
      role: 'keeper',
      controllerType: 'ai',
      archetypeId: 'keeper',
      handedness: 'right',
      playStyle: 'tight',
      stickStyle: 'cradle',
    },
    {
      id: 'a-support',
      teamId: 'team-a',
      teamSide: 'A',
      role: 'support',
      controllerType: 'ai',
      archetypeId: 'support',
      handedness: 'right',
      playStyle: 'creative',
      stickStyle: 'cradle',
    },
    {
      id: 'a-striker',
      teamId: 'team-a',
      teamSide: 'A',
      role: 'striker',
      controllerType: 'ai',
      archetypeId: 'striker',
      handedness: 'right',
      playStyle: 'aggressive',
      stickStyle: 'hook',
    },
  ]
}

function assertGreater(
  actual: number,
  expectedExclusiveFloor: number,
  label: string,
): void {
  if (actual <= expectedExclusiveFloor) {
    throw new Error(
      `${label}: expected > ${expectedExclusiveFloor}, got ${actual}`,
    )
  }
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    )
  }
}
