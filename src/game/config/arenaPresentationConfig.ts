export const arenaPresentationConfig = {
  showCrowd: true,
  showBenches: true,
  showScoreboardStats: true,
  crowdDensity: 0.78,
  benchHeadCount: 5,
  mobileCrowdSimplified: true,
  scoreboardHeight: 86,
  sidelineDecorationWidth: 150,
  mobileBreakpoint: 700,
  venue: {
    floorColor: 0x174f61,
    concourseColor: 0x1d6475,
    seatingColor: 0x123e4d,
    seatingStripeColor: 0x2a7180,
    railColor: 0xa9dce0,
    courtShadowColor: 0x06151b,
  },
  crowd: {
    alpha: 0.72,
    mobileDensityMultiplier: 0.42,
    bobAmplitude: 1.35,
    bobSpeed: 0.0022,
    redrawIntervalMs: 80,
    shirtColors: [
      0x6eb6c4,
      0xef8a6f,
      0xf0c96b,
      0x83b982,
      0x9e8abb,
      0xc9dde0,
    ],
  },
  bench: {
    areaAlpha: 0.8,
    figureAlpha: 0.9,
    labelAlpha: 0.78,
  },
} as const

export function getScoreboardReservedHeight(viewportWidth: number): number {
  const height =
    viewportWidth <= arenaPresentationConfig.mobileBreakpoint
      ? Math.round(arenaPresentationConfig.scoreboardHeight * 0.72)
      : arenaPresentationConfig.scoreboardHeight

  return height + 12
}
