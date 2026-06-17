import type { EquipmentPerk } from './equipmentTypes.ts'

export const equipmentPerks = {
  bankReverse: {
    id: 'bank-reverse',
    name: 'Reverse Bite',
    tier: 'standard',
    description:
      'Future perk hook: banked shots can leave the wall with opposite spin.',
    tags: ['bank', 'release', 'wall'],
    allowedTypes: ['stick'],
    rollWeight: 0.9,
  },
  bankReverseEnhanced: {
    id: 'bank-reverse-plus',
    name: 'Reverse Bite+',
    tier: 'enhanced',
    description:
      'Future enhanced hook: stronger late-bank spin reversal window.',
    tags: ['bank', 'release', 'wall'],
    allowedTypes: ['stick'],
    rollWeight: 0.9,
  },
  longCharge: {
    id: 'long-charge',
    name: 'Deep Charge',
    tier: 'standard',
    description:
      'Future perk hook: extends the safe charge window before fumble risk.',
    tags: ['charge', 'defense'],
    allowedTypes: ['stick', 'shield', 'armor'],
    rollWeight: 1,
  },
  longChargeEnhanced: {
    id: 'long-charge-plus',
    name: 'Deep Charge+',
    tier: 'enhanced',
    description:
      'Future enhanced hook: longer charge safety with better contact resistance.',
    tags: ['charge', 'defense'],
    allowedTypes: ['stick', 'shield', 'armor'],
    rollWeight: 1,
  },
  snapPass: {
    id: 'snap-pass',
    name: 'Snap Feed',
    tier: 'standard',
    description:
      'Future perk hook: faster low-charge passes to nearby teammates.',
    tags: ['passing', 'release'],
    allowedTypes: ['stick', 'shoes', 'armor'],
    rollWeight: 1.15,
  },
  snapPassEnhanced: {
    id: 'snap-pass-plus',
    name: 'Snap Feed+',
    tier: 'enhanced',
    description:
      'Future enhanced hook: crisper quick passes with a tighter catch window.',
    tags: ['passing', 'release'],
    allowedTypes: ['stick', 'shoes', 'armor'],
    rollWeight: 1.15,
  },
  wallMagnet: {
    id: 'wall-magnet',
    name: 'Wall Magnet',
    tier: 'standard',
    description:
      'Future perk hook: slightly steadier gathers after wall rebounds.',
    tags: ['gather', 'wall'],
    allowedTypes: ['stick', 'shield', 'shoes'],
    rollWeight: 1.1,
  },
  wallMagnetEnhanced: {
    id: 'wall-magnet-plus',
    name: 'Wall Magnet+',
    tier: 'enhanced',
    description:
      'Future enhanced hook: stronger wall-rebound gather assist.',
    tags: ['gather', 'wall'],
    allowedTypes: ['stick', 'shield', 'shoes'],
    rollWeight: 1.1,
  },
  creaseAnchor: {
    id: 'crease-anchor',
    name: 'Crease Anchor',
    tier: 'standard',
    description:
      'Future keeper hook: steadier shield catches during crease pressure.',
    tags: ['defense', 'gather'],
    allowedTypes: ['shield', 'armor'],
    rollWeight: 1,
  },
  creaseAnchorEnhanced: {
    id: 'crease-anchor-plus',
    name: 'Crease Anchor+',
    tier: 'enhanced',
    description:
      'Future enhanced keeper hook: stronger crease stability and recovery.',
    tags: ['defense', 'gather'],
    allowedTypes: ['shield', 'armor'],
    rollWeight: 1,
  },
  firstStep: {
    id: 'first-step',
    name: 'First Step',
    tier: 'standard',
    description:
      'Future movement hook: sharper acceleration after a catch or loose-ball win.',
    tags: ['gather', 'passing'],
    allowedTypes: ['shoes', 'armor'],
    rollWeight: 1,
  },
  firstStepEnhanced: {
    id: 'first-step-plus',
    name: 'First Step+',
    tier: 'enhanced',
    description:
      'Future enhanced hook: stronger burst after a catch or loose-ball win.',
    tags: ['gather', 'passing'],
    allowedTypes: ['shoes', 'armor'],
    rollWeight: 1,
  },
  exoticOrbit: {
    id: 'exotic-orbit-break',
    name: 'Orbit Break',
    tier: 'exotic',
    description:
      'Future exotic hook: one signature shot can bend late after a bank.',
    tags: ['bank', 'release', 'ultra', 'wall'],
    allowedTypes: ['stick', 'shoes'],
    rollWeight: 1,
  },
  exoticStonewall: {
    id: 'exotic-stonewall',
    name: 'Stonewall Heart',
    tier: 'exotic',
    description:
      'Future exotic keeper hook: one clutch shield stand can erase a point-blank shot.',
    tags: ['defense', 'gather', 'ultra'],
    allowedTypes: ['shield', 'armor'],
    rollWeight: 1,
  },
} as const satisfies Record<string, EquipmentPerk>

export type EquipmentPerkKey = keyof typeof equipmentPerks
export type EquipmentPerkId =
  (typeof equipmentPerks)[EquipmentPerkKey]['id']

export const equipmentPerkCatalog: EquipmentPerk[] =
  Object.values(equipmentPerks)

export function getEquipmentPerk(
  id: string | null | undefined,
): EquipmentPerk | null {
  return equipmentPerkCatalog.find((perk) => perk.id === id) ?? null
}
