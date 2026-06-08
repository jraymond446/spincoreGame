export type CrowdHairStyle =
  | 'crop'
  | 'cap'
  | 'bob'
  | 'tuft'
  | 'spikes'

export type CrowdVariant = {
  skinColor: number
  skinShade: number
  hairColor: number
  hairStyle: CrowdHairStyle
  shirtColor: number
  shirtTrim: number
}

export const crowdVariants: CrowdVariant[] = [
  {
    skinColor: 0xf0bd91,
    skinShade: 0xd99268,
    hairColor: 0x17283b,
    hairStyle: 'crop',
    shirtColor: 0x2b9bcf,
    shirtTrim: 0xeaf9ff,
  },
  {
    skinColor: 0xe5a779,
    skinShade: 0xc47b55,
    hairColor: 0x59382f,
    hairStyle: 'tuft',
    shirtColor: 0xe86378,
    shirtTrim: 0xfff1d7,
  },
  {
    skinColor: 0xf3cda4,
    skinShade: 0xd89d73,
    hairColor: 0xc08a38,
    hairStyle: 'bob',
    shirtColor: 0x54ae84,
    shirtTrim: 0xeaf9ff,
  },
  {
    skinColor: 0xa96f50,
    skinShade: 0x7e4d3b,
    hairColor: 0x20283a,
    hairStyle: 'spikes',
    shirtColor: 0x7b65b5,
    shirtTrim: 0xffed91,
  },
  {
    skinColor: 0x744836,
    skinShade: 0x533126,
    hairColor: 0x162b32,
    hairStyle: 'cap',
    shirtColor: 0xf0bd3f,
    shirtTrim: 0x194d72,
  },
  {
    skinColor: 0xe7b88d,
    skinShade: 0xc98964,
    hairColor: 0x2f746b,
    hairStyle: 'crop',
    shirtColor: 0xf5f0df,
    shirtTrim: 0x2b8a9d,
  },
  {
    skinColor: 0xc98760,
    skinShade: 0x9f6047,
    hairColor: 0x72538d,
    hairStyle: 'bob',
    shirtColor: 0x41a8bd,
    shirtTrim: 0xffffff,
  },
  {
    skinColor: 0xf0c49c,
    skinShade: 0xd49470,
    hairColor: 0xd8d0ba,
    hairStyle: 'spikes',
    shirtColor: 0xe47a45,
    shirtTrim: 0xfff0b2,
  },
]
