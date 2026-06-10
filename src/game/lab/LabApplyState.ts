import type { LabTuningState } from './LabConfig'

export type LabApplyDiagnostics = {
  isApplyingLabSettings: boolean
  applyInProgress: boolean
  hasPendingApply: boolean
  lastApplyTimestamp: number
  sanitizedSettingCount: number
  invalidSettingCount: number
  resetTriggered: boolean
  error: string | null
}

export const labApplyRuntime: {
  isApplyingLabSettings: boolean
  suppressLabChangeEvents: boolean
  pendingApplySettings: LabTuningState | null
  lastApplyTimestamp: number
  applyInProgress: boolean
  sanitizedSettingCount: number
  invalidSettingCount: number
  resetTriggered: boolean
  error: string | null
} = {
  isApplyingLabSettings: false,
  suppressLabChangeEvents: false,
  pendingApplySettings: null,
  lastApplyTimestamp: 0,
  applyInProgress: false,
  sanitizedSettingCount: 0,
  invalidSettingCount: 0,
  resetTriggered: false,
  error: null,
}

export function getLabApplyDiagnostics(): LabApplyDiagnostics {
  return {
    isApplyingLabSettings: labApplyRuntime.isApplyingLabSettings,
    applyInProgress: labApplyRuntime.applyInProgress,
    hasPendingApply: labApplyRuntime.pendingApplySettings !== null,
    lastApplyTimestamp: labApplyRuntime.lastApplyTimestamp,
    sanitizedSettingCount: labApplyRuntime.sanitizedSettingCount,
    invalidSettingCount: labApplyRuntime.invalidSettingCount,
    resetTriggered: labApplyRuntime.resetTriggered,
    error: labApplyRuntime.error,
  }
}
