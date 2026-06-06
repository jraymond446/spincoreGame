export const arenaPresentationConfig = {
  showCrowd: true,
  showBenches: true,
  showScoreboardStats: true,
  crowdDensity: 0.58,
  benchHeadCount: 5,
  mobileCrowdSimplified: true,
  scoreboardHeight: 82,
  mobileScoreboardScale: 0.66,
  sidelineDecorationWidth: 184,
  mobileBreakpoint: 700,
  venue: {
    floorColor: 0x174f61,
    concourseColor: 0x277385,
    seatingColor: 0x1a5262,
    seatingStripeColor: 0x4b8995,
    railColor: 0xb9dcda,
    courtShadowColor: 0x06151b,
  },
  crowd: {
    alpha: 0.56,
    mobileDensityMultiplier: 0.28,
    bobAmplitude: 1,
    bobSpeed: 0.0022,
    redrawIntervalMs: 100,
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
    courtGap: 34,
    width: 132,
    height: 104,
    areaAlpha: 0.48,
    figureAlpha: 0.74,
    labelAlpha: 0.64,
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
