import {
  getCharacterBodyDefinition,
  getCharacterHairDefinition,
  type CharacterBodyDefinition,
  type CharacterHairDefinition,
} from '../assets/characterAssetManifest.ts'
import {
  normalizeAppearanceColor,
} from '../player/playerAppearancePalettes.ts'
import type {
  BodyAssetId,
  HairAssetId,
  PlayerAppearance,
} from '../player/playerAppearanceTypes.ts'

export type CharacterPortraitSize = 'sm' | 'md' | 'lg' | 'hero'

export type CharacterPortraitOptions = {
  bodyId: BodyAssetId
  hairId: HairAssetId
  skinColor: string
  hairColor: string
  uniformPrimaryColor: string
  uniformAccentColor: string
  animated: boolean
  selected: boolean
  size?: CharacterPortraitSize
  className?: string
  showFrame?: boolean
  showAlignmentOverlay?: boolean
  label?: string
}

const warnedMissingAssets = new Set<string>()
const imageCache = new Map<string, Promise<HTMLImageElement>>()
const recoloredBodyCache = new Map<string, Promise<string>>()
const tintedHairCache = new Map<string, Promise<string>>()

export function characterPortraitOptionsFromAppearance(
  appearance: PlayerAppearance,
): Pick<
  CharacterPortraitOptions,
  | 'bodyId'
  | 'hairId'
  | 'skinColor'
  | 'hairColor'
  | 'uniformPrimaryColor'
  | 'uniformAccentColor'
> {
  return {
    bodyId: appearance.bodyId,
    hairId: appearance.hairId,
    skinColor: appearance.skinColor,
    hairColor: appearance.hairColor,
    uniformPrimaryColor: appearance.uniformPrimaryColor,
    uniformAccentColor: appearance.uniformAccentColor,
  }
}

export function createCharacterPortrait(
  initial: CharacterPortraitOptions,
): {
  element: HTMLElement
  update: (options: CharacterPortraitOptions) => void
} {
  const element = document.createElement('div')
  const shadow = document.createElement('div')
  shadow.className = 'character-portrait-shadow'
  const stage = document.createElement('div')
  stage.className = 'character-portrait-stage'
  const fallback = document.createElement('div')
  fallback.className = 'character-portrait-fallback'
  const body = createLayer('body')
  const treatment = document.createElement('div')
  treatment.className = 'character-portrait-treatment'
  const hair = createLayer('hair')
  const futureLayers = document.createElement('div')
  futureLayers.className = 'character-portrait-future-layers'
  const overlay = createAlignmentOverlay()
  stage.append(fallback, body, treatment, hair, futureLayers, overlay)
  element.append(shadow, stage)
  let updateToken = 0

  const update = (options: CharacterPortraitOptions): void => {
    updateToken += 1
    const token = updateToken
    const size = options.size ?? 'md'
    const bodyDefinition = getCharacterBodyDefinition(options.bodyId)
    const hairDefinition = getCharacterHairDefinition(options.hairId)
    const skinColor = normalizeAppearanceColor(options.skinColor, '#d59a6f')
    const hairColor = normalizeAppearanceColor(
      options.hairColor,
      hairDefinition.defaultColor ?? '#674536',
    )
    const uniformPrimaryColor = normalizeAppearanceColor(
      options.uniformPrimaryColor,
      '#169ca3',
    )
    const uniformAccentColor = normalizeAppearanceColor(
      options.uniformAccentColor,
      '#f7f5ec',
    )

    element.className = [
      'character-portrait',
      `is-${size}`,
      options.showFrame === false ? '' : 'has-frame',
      options.animated ? 'is-animated' : '',
      options.selected ? 'is-selected' : '',
      options.showAlignmentOverlay ? 'shows-alignment' : '',
      options.className ?? '',
    ].filter(Boolean).join(' ')
    element.setAttribute('role', 'img')
    element.setAttribute(
      'aria-label',
      options.label ?? `${bodyDefinition.label} with ${hairDefinition.label}`,
    )
    element.dataset.bodyId = bodyDefinition.id
    element.dataset.hairId = hairDefinition.id
    element.style.setProperty('--portrait-skin', skinColor)
    element.style.setProperty('--portrait-hair', hairColor)
    element.style.setProperty(
      '--portrait-uniform-primary',
      uniformPrimaryColor,
    )
    element.style.setProperty(
      '--portrait-uniform-accent',
      uniformAccentColor,
    )
    element.style.setProperty(
      '--portrait-hair-x',
      `${(hairDefinition.offset?.x ?? 0) / 5.12}%`,
    )
    element.style.setProperty(
      '--portrait-hair-y',
      `${(hairDefinition.offset?.y ?? 0) / 5.12}%`,
    )
    element.style.setProperty(
      '--portrait-hair-scale',
      String(hairDefinition.scale ?? 1),
    )

    fallback.hidden = true
    getRecoloredBodySource(
      bodyDefinition,
      skinColor,
      uniformPrimaryColor,
      uniformAccentColor,
    )
      .catch(() => bodyDefinition.assetPath)
      .then((source) =>
        setLayerSource(body, source, bodyDefinition.fallbackPath),
      )
      .then((loaded) => {
        if (token !== updateToken) {
          return
        }
        fallback.hidden = loaded
        element.classList.toggle('has-missing-body', !loaded)
      })

    getTintedHairSource(hairDefinition, hairColor)
      .then((source) => {
        if (token !== updateToken) {
          return
        }
        return setLayerSource(hair, source, hairDefinition.fallbackPath)
      })
      .then((loaded) => {
        if (token !== updateToken || loaded === undefined) {
          return
        }
        element.classList.toggle('has-missing-hair', !loaded)
      })
      .catch(() => {
        if (token === updateToken) {
          hair.hidden = true
          element.classList.add('has-missing-hair')
        }
      })
  }

  update(initial)
  return { element, update }
}

function createLayer(layer: 'body' | 'hair'): HTMLImageElement {
  const image = document.createElement('img')
  image.className = `character-portrait-layer is-${layer}`
  image.alt = ''
  image.decoding = 'async'
  image.draggable = false
  return image
}

async function setLayerSource(
  image: HTMLImageElement,
  source: string,
  fallbackSource?: string,
): Promise<boolean> {
  image.hidden = true

  try {
    const loaded = await loadImage(source)
    image.src = loaded.src
    image.hidden = false
    return true
  } catch {
    warnMissingAsset(source)
  }

  if (fallbackSource) {
    try {
      const fallback = await loadImage(fallbackSource)
      image.src = fallback.src
      image.hidden = false
      return true
    } catch {
      warnMissingAsset(fallbackSource)
    }
  }

  return false
}

function getRecoloredBodySource(
  definition: CharacterBodyDefinition,
  skinColor: string,
  uniformPrimaryColor: string,
  uniformAccentColor: string,
): Promise<string> {
  if (!definition.skinRecoloring || !definition.uniformRecoloring) {
    return Promise.resolve(definition.assetPath)
  }

  const key = [
    definition.id,
    skinColor,
    uniformPrimaryColor,
    uniformAccentColor,
  ].join(':')
  const cached = recoloredBodyCache.get(key)

  if (cached) {
    return cached
  }

  const result = createRecoloredBodySource(
    definition,
    skinColor,
    uniformPrimaryColor,
    uniformAccentColor,
  )
  recoloredBodyCache.set(key, result)
  return result
}

async function createRecoloredBodySource(
  definition: CharacterBodyDefinition,
  skinColor: string,
  uniformPrimaryColor: string,
  uniformAccentColor: string,
): Promise<string> {
  const skinRecoloring = definition.skinRecoloring
  const uniformRecoloring = definition.uniformRecoloring

  if (!skinRecoloring || !uniformRecoloring) {
    return definition.assetPath
  }

  const [source, skinMask, primaryMask, accentMask] = await Promise.all([
    loadImage(definition.assetPath),
    loadImage(skinRecoloring.maskPath),
    loadImage(uniformRecoloring.primaryMaskPath),
    loadImage(uniformRecoloring.accentMaskPath),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Canvas rendering is unavailable for body recoloring.')
  }

  context.clearRect(0, 0, 512, 512)
  context.drawImage(source, 0, 0, 512, 512)
  const bodyPixels = context.getImageData(0, 0, 512, 512)
  const skinPixels = readMaskPixels(skinMask)
  const primaryPixels = readMaskPixels(primaryMask)
  const accentPixels = readMaskPixels(accentMask)

  applyMaskedColor(bodyPixels.data, skinPixels, skinColor)
  applyMaskedColor(bodyPixels.data, primaryPixels, uniformPrimaryColor)
  applyMaskedColor(bodyPixels.data, accentPixels, uniformAccentColor)
  context.putImageData(bodyPixels, 0, 0)
  return canvas.toDataURL('image/png')
}

function readMaskPixels(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Canvas rendering is unavailable for mask reading.')
  }

  context.clearRect(0, 0, 512, 512)
  context.drawImage(image, 0, 0, 512, 512)
  return context.getImageData(0, 0, 512, 512).data
}

function applyMaskedColor(
  body: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  color: string,
): void {
  const target = rgbToHsl(parseHexColor(color))
  const referenceLightness = getMaskedReferenceLightness(body, mask)
  const targetSaturation = Math.min(1, target.s * 1.08)

  for (let index = 0; index < body.length; index += 4) {
    const maskAmount = mask[index + 3] / 255

    if (maskAmount <= 0 || body[index + 3] === 0) {
      continue
    }

    const source = rgbToHsl({
      r: body[index],
      g: body[index + 1],
      b: body[index + 2],
    })
    const recolored = hslToRgb({
      h: target.h,
      s: targetSaturation,
      l: clamp(
        target.l + (source.l - referenceLightness) * 0.78,
        0.035,
        0.97,
      ),
    })

    body[index] = blendChannel(body[index], recolored.r, maskAmount)
    body[index + 1] = blendChannel(body[index + 1], recolored.g, maskAmount)
    body[index + 2] = blendChannel(body[index + 2], recolored.b, maskAmount)
  }
}

function getMaskedReferenceLightness(
  body: Uint8ClampedArray,
  mask: Uint8ClampedArray,
): number {
  let weightedLightness = 0
  let totalWeight = 0

  for (let index = 0; index < body.length; index += 4) {
    const weight = mask[index + 3] / 255

    if (weight <= 0 || body[index + 3] === 0) {
      continue
    }

    const source = rgbToHsl({
      r: body[index],
      g: body[index + 1],
      b: body[index + 2],
    })
    weightedLightness += source.l * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedLightness / totalWeight : 0.5
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function blendChannel(source: number, target: number, amount: number): number {
  return Math.round(source + (target - source) * amount)
}

function rgbToHsl(color: { r: number; g: number; b: number }): {
  h: number
  s: number
  l: number
} {
  const red = color.r / 255
  const green = color.g / 255
  const blue = color.b / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  const lightness = (maximum + minimum) / 2
  let hue = 0

  if (delta > 0) {
    if (maximum === red) {
      hue = ((green - blue) / delta) % 6
    } else if (maximum === green) {
      hue = (blue - red) / delta + 2
    } else {
      hue = (red - green) / delta + 4
    }

    hue /= 6
    if (hue < 0) {
      hue += 1
    }
  }

  const saturation = delta === 0
    ? 0
    : delta / (1 - Math.abs(2 * lightness - 1))
  return { h: hue, s: saturation, l: lightness }
}

function hslToRgb(color: { h: number; s: number; l: number }): {
  r: number
  g: number
  b: number
} {
  const chroma = (1 - Math.abs(2 * color.l - 1)) * color.s
  const section = color.h * 6
  const secondary = chroma * (1 - Math.abs((section % 2) - 1))
  let red = 0
  let green = 0
  let blue = 0

  if (section < 1) {
    red = chroma
    green = secondary
  } else if (section < 2) {
    red = secondary
    green = chroma
  } else if (section < 3) {
    green = chroma
    blue = secondary
  } else if (section < 4) {
    green = secondary
    blue = chroma
  } else if (section < 5) {
    red = secondary
    blue = chroma
  } else {
    red = chroma
    blue = secondary
  }

  const match = color.l - chroma / 2
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  }
}

function getTintedHairSource(
  definition: CharacterHairDefinition,
  color: string,
): Promise<string> {
  const key = `${definition.id}:${color}`
  const cached = tintedHairCache.get(key)

  if (cached) {
    return cached
  }

  const result = createTintedHairSource(definition, color)
  tintedHairCache.set(key, result)
  return result
}

async function createTintedHairSource(
  definition: CharacterHairDefinition,
  color: string,
): Promise<string> {
  const mask = await loadImage(definition.assetPath)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Canvas rendering is unavailable for hair recoloring.')
  }

  context.clearRect(0, 0, 512, 512)
  context.drawImage(mask, 0, 0, 512, 512)
  const pixels = context.getImageData(0, 0, 512, 512)
  const target = parseHexColor(color)
  const referenceLuminance = Math.max(1, definition.referenceLuminance ?? 92)

  for (let index = 0; index < pixels.data.length; index += 4) {
    if (pixels.data[index + 3] === 0) {
      continue
    }

    const luminance = pixels.data[index]
    const ratio = luminance / referenceLuminance
    pixels.data[index] = shadeChannel(target.r, ratio)
    pixels.data[index + 1] = shadeChannel(target.g, ratio)
    pixels.data[index + 2] = shadeChannel(target.b, ratio)
  }

  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}

function shadeChannel(channel: number, ratio: number): number {
  if (ratio <= 1) {
    return Math.round(channel * Math.max(0, ratio))
  }

  const highlight = Math.min(1, (ratio - 1) * 0.68)
  return Math.round(channel + (255 - channel) * highlight)
}

function parseHexColor(value: string): { r: number; g: number; b: number } {
  const normalized = value.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(source)

  if (cached) {
    return cached
  }

  const result = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', reject, { once: true })
    image.src = source
  })
  imageCache.set(source, result)
  return result
}

function warnMissingAsset(source: string): void {
  if (warnedMissingAssets.has(source)) {
    return
  }

  warnedMissingAssets.add(source)
  console.warn(`[CharacterPortrait] Missing asset: ${source}`)
}

function createAlignmentOverlay(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'character-portrait-alignment'
  overlay.setAttribute('aria-hidden', 'true')

  for (const [className, label] of [
    ['is-bounds', '512'],
    ['is-head-center', 'HEAD'],
    ['is-hair-safe', 'HAIR SAFE'],
    ['is-face-safe', 'FACE SAFE'],
    ['is-feet-baseline', 'BASELINE'],
  ] as const) {
    const guide = document.createElement('span')
    guide.className = className
    guide.textContent = label
    overlay.appendChild(guide)
  }

  return overlay
}
