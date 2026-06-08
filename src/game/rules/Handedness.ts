import type { PlayerHandedness } from '../data/matchTypes'

export type HandednessSign = -1 | 1

export type HandednessFrame = {
  mountSign: HandednessSign
  pocketFacingSign: HandednessSign
  visualMirrorSign: HandednessSign
  cradleSocketSign: HandednessSign
}

export function getHandednessFrame(
  handedness: PlayerHandedness,
): HandednessFrame {
  const mountSign = handedness === 'right' ? 1 : -1

  // The cesta artwork is authored with its pocket on local +Y. Right-handed
  // players mirror the pocket while still mounting the handle on local right.
  const pocketFacingSign = handedness === 'right' ? -1 : 1

  return {
    mountSign,
    pocketFacingSign,
    visualMirrorSign: pocketFacingSign,
    cradleSocketSign: mountSign,
  }
}
