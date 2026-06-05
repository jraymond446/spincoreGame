export type HairStyleId = 'crop' | 'spikes' | 'swoop' | 'tuft' | 'bob'

export type HairStyle = {
  id: HairStyleId
  fringe: number[]
  crownScaleX: number
  crownScaleY: number
}

export const hairStyles: Record<HairStyleId, HairStyle> = {
  crop: {
    id: 'crop',
    fringe: [-0.7, -0.2, 0.35, 0.72],
    crownScaleX: 1.02,
    crownScaleY: 0.72,
  },
  spikes: {
    id: 'spikes',
    fringe: [-0.88, -0.48, -0.08, 0.34, 0.78],
    crownScaleX: 1.12,
    crownScaleY: 0.82,
  },
  swoop: {
    id: 'swoop',
    fringe: [-0.78, -0.42, 0.05, 0.58],
    crownScaleX: 1.08,
    crownScaleY: 0.76,
  },
  tuft: {
    id: 'tuft',
    fringe: [-0.62, -0.18, 0.18, 0.64],
    crownScaleX: 0.98,
    crownScaleY: 0.8,
  },
  bob: {
    id: 'bob',
    fringe: [-0.82, -0.36, 0.12, 0.55, 0.82],
    crownScaleX: 1.16,
    crownScaleY: 0.86,
  },
}

export const hairStyleOrder: HairStyleId[] = [
  'crop',
  'spikes',
  'swoop',
  'tuft',
  'bob',
]
