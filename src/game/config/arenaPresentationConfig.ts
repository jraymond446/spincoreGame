import { visualStyleConfig } from './visualStyleConfig'

export const arenaPresentationConfig = {
  showCrowd: true,
  showBenches: true,
  showScoreboardStats: true,
  crowdDensity: 0.94,
  benchHeadCount: 3,
  mobileCrowdSimplified: true,
  scoreboardHeight: 82,
  mobileScoreboardScale: 0.66,
  sidelineDecorationWidth: 184,
  mobileBreakpoint: 700,
  venue: {
    floorColor: visualStyleConfig.venue.backdrop,
    concourseColor: visualStyleConfig.venue.concourse,
    seatingColor: visualStyleConfig.venue.stand,
    standShade: visualStyleConfig.venue.standShade,
    seatingStripeColor: visualStyleConfig.venue.standInset,
    railColor: visualStyleConfig.venue.rail,
    aisleColor: visualStyleConfig.venue.aisle,
    courtShadowColor: visualStyleConfig.venue.shadow,
  },
  crowd: {
    alpha: 0.9,
    mobileDensityMultiplier: 0.4,
    bobAmplitude: 0.55,
    bobSpeed: 0.0022,
    redrawIntervalMs: 450,
    uniformMaskRate: 0.78,
    shirtColors: [
      0x35a5dc,
      0xef6376,
      0xf2c84b,
      0x56b889,
      0x8f73c7,
      0xf5f0df,
    ],
  },
  bench: {
    courtGap: 24,
    width: 148,
    height: 88,
    areaAlpha: 0.98,
    figureAlpha: 0.96,
    labelAlpha: 0.82,
  },
} as const

export function getScoreboardReservedHeight(viewportWidth: number): number {
  const height =
    viewportWidth <= arenaPresentationConfig.mobileBreakpoint
      ? Math.round(
          arenaPresentationConfig.scoreboardHeight *
            arenaPresentationConfig.mobileScoreboardScale,
        )
      : arenaPresentationConfig.scoreboardHeight

  return height + 12
}
