export type AppearanceColorOption = {
  id: string
  label: string
  value: string
}

export const hairColorOptions = [
  { id: 'black', label: 'Black', value: '#181719' },
  { id: 'dark-brown', label: 'Dark Brown', value: '#3b2924' },
  { id: 'brown', label: 'Brown', value: '#674536' },
  { id: 'light-brown', label: 'Light Brown', value: '#9a7053' },
  { id: 'blond', label: 'Blond', value: '#d8b866' },
  { id: 'platinum', label: 'Platinum', value: '#e8dfc6' },
  { id: 'auburn', label: 'Auburn', value: '#8f442d' },
  { id: 'red', label: 'Red', value: '#c75038' },
  { id: 'blue', label: 'Blue', value: '#3c78c4' },
  { id: 'green', label: 'Green', value: '#348b66' },
  { id: 'purple', label: 'Purple', value: '#7550a3' },
  { id: 'pink', label: 'Pink', value: '#d76499' },
] as const satisfies readonly AppearanceColorOption[]

export const skinColorOptions = [
  { id: 'porcelain-neutral', label: 'Porcelain', value: '#f2cfb2' },
  { id: 'light-warm', label: 'Light Warm', value: '#efc09b' },
  { id: 'light-cool', label: 'Light Cool', value: '#d9ad98' },
  { id: 'golden', label: 'Golden', value: '#d59a6f' },
  { id: 'olive', label: 'Olive', value: '#b98261' },
  { id: 'medium-neutral', label: 'Medium', value: '#a96f52' },
  { id: 'deep-warm', label: 'Deep Warm', value: '#7b4937' },
  { id: 'deep-cool', label: 'Deep Cool', value: '#56382f' },
] as const satisfies readonly AppearanceColorOption[]

export const uniformPrimaryColorOptions = [
  { id: 'river-teal', label: 'River Teal', value: '#169ca3' },
  { id: 'circuit-blue', label: 'Circuit Blue', value: '#198bd5' },
  { id: 'neon-rose', label: 'Neon Rose', value: '#df4f79' },
  { id: 'solar-gold', label: 'Solar Gold', value: '#e7b83f' },
  { id: 'locker-green', label: 'Locker Green', value: '#35a970' },
  { id: 'wall-purple', label: 'Wall Purple', value: '#7868ba' },
  { id: 'crash-orange', label: 'Crash Orange', value: '#df823e' },
  { id: 'deep-navy', label: 'Deep Navy', value: '#16324f' },
] as const satisfies readonly AppearanceColorOption[]

export const uniformAccentColorOptions = [
  { id: 'cream', label: 'Cream', value: '#fff8df' },
  { id: 'white', label: 'White', value: '#f7f5ec' },
  { id: 'gold', label: 'Gold', value: '#f2c84b' },
  { id: 'cyan', label: 'Cyan', value: '#78e5ff' },
  { id: 'rose', label: 'Rose', value: '#e54872' },
  { id: 'mint', label: 'Mint', value: '#8df0cf' },
  { id: 'navy', label: 'Navy', value: '#16324f' },
  { id: 'orange', label: 'Orange', value: '#e78c3f' },
] as const satisfies readonly AppearanceColorOption[]

export const legacySkinTonePalette = {
  light: skinColorOptions[0].value,
  tan: skinColorOptions[3].value,
  medium: skinColorOptions[4].value,
  brown: skinColorOptions[6].value,
  dark: skinColorOptions[7].value,
} as const

export const legacyHairColorPalette = {
  black: hairColorOptions[0].value,
  brown: hairColorOptions[2].value,
  blonde: hairColorOptions[4].value,
  red: hairColorOptions[7].value,
  gray: hairColorOptions[5].value,
  blue: hairColorOptions[8].value,
  pink: hairColorOptions[11].value,
} as const

export const legacyShirtColorPalette = {
  cyan: '#25b9c7',
  blue: '#198bd5',
  red: '#df4b4b',
  pink: '#e4588d',
  yellow: '#f2c84b',
  green: '#35a970',
  purple: '#7868ba',
  black: '#253344',
  white: '#f7f3e7',
} as const

export const legacyAccentColorPalette = {
  gold: '#f2c84b',
  cyan: '#78e5ff',
  pink: '#e54872',
  navy: '#16324f',
  orange: '#e78c3f',
  lime: '#8fd26e',
} as const

export function normalizeAppearanceColor(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const color = value.trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback
}
