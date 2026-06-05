export const viewConfig = {
  width: 900,
  height: 1400,
  backgroundColor: '#123f52',
  camera: {
    arenaPadding: 72,
    maxZoom: 1.15,
  },
  hud: {
    padding: {
      x: 52,
      y: 42,
    },
    debugPadding: {
      x: 26,
      y: 28,
    },
    debugHudDefaultExpandedDesktop: false,
    debugHudDefaultExpandedMobile: false,
    debugHudMobileFontSize: 10,
    debugHudMaxHeightPercent: 52,
    debugHudOpacity: 0.84,
    debugMiniHud: true,
  },
} as const
