import { equipmentCatalog } from '../equipment/equipmentCatalog.ts'
import { getEffectivePlayerAttributes } from '../equipment/equipmentEffects.ts'
import type { PlayerRosterEntry } from '../game/data/matchTypes.ts'
import { mapCreatedPlayerAttributesToMatchAttributes } from '../player/playerAttributeAdapter.ts'
import { defaultPlayerCosmetics } from '../player/playerCosmetics.ts'
import {
  createCreatedPlayer,
  createNewSave,
} from '../save/defaultSave.ts'
import {
  playerAttributeDefault,
  type CreatedPlayerAttributes,
  type PlayerAttributeKey,
} from '../save/saveTypes.ts'
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
  'crash-padding',
)
save.equipment.equipped.stickId = 'quick-whip'
save.equipment.equipped.shoesId = 'apex-runners'
save.equipment.equipped.armorId = 'crash-padding'
const afterGear = getEffectivePlayerAttributes(save)

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

const teamA = createTeamARoster()
const teamB: PlayerRosterEntry[] = []
const overrides = applyMatchRosterOverrides(
  teamA,
  teamB,
  save,
  undefined,
)
const createdPlayerRuntime = overrides.archetypes.get('a-striker')

if (!createdPlayerRuntime) {
  throw new Error('created player runtime archetype was not applied')
}

assertEqual(
  teamA.find((entry) => entry.id === 'a-striker')?.controllerType,
  'human',
  'created player should control the matching roster slot',
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

for (const itemId of [
  'quick-whip',
  'apex-runners',
  'crash-padding',
]) {
  if (!equipmentCatalog.some((item) => item.id === itemId)) {
    throw new Error(`${itemId} missing from equipment catalog`)
  }
}

console.info('Attribute gameplay bridge cases passed: 12')

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
