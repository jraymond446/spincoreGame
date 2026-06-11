import { stickConfig } from '../config/stickConfig'

export function getHandlingAdjustedFumbleMs(
  ballHandling: number,
): number {
  const handling = Math.max(0, Math.min(1, ballHandling))
  return stickConfig.fumbleMs * (1 + handling * 0.2)
}
