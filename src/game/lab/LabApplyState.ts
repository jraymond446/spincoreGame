import type { LabTuningState } from './LabConfig'

export type LabApplyDiagnostics = {
  isApplyingLabSettings: boolean
  isSavingLabSettings: boolean
  applyQueued: boolean
  lastApplyStartedAt: number
  lastApplyDurationMs: number
  lastSaveStartedAt: number
  lastSaveDurationMs: number
  sanitizedSettingCount: number
  invalidSettingCount: number
  resetTriggered: boolean
  lastApplyStatus: 'idle' | 'queued' | 'applying' | 'applied' | 'failed'
  lastSaveStatus: 'idle' | 'saving' | 'saved' | 'failed'
  labApplyError: string | null
  labSaveError: string | null
}

export const labApplyRuntime: {
  isApplyingLabSettings: boolean
  isSavingLabSettings: boolean
  suppressLabEvents: boolean
  applyQueued: boolean
  pendingApplySettings: LabTuningState | null
  lastApplyStartedAt: number
  lastApplyDurationMs: number
  lastSaveStartedAt: number
  lastSaveDurationMs: number
  sanitizedSettingCount: number
  invalidSettingCount: number
  resetTriggered: boolean
  lastApplyStatus: LabApplyDiagnostics['lastApplyStatus']
  lastSaveStatus: LabApplyDiagnostics['lastSaveStatus']
  labApplyError: string | null
  labSaveError: string | null
} = {
  isApplyingLabSettings: false,
  isSavingLabSettings: false,
  suppressLabEvents: false,
  applyQueued: false,
  pendingApplySettings: null,
  lastApplyStartedAt: 0,
  lastApplyDurationMs: 0,
  lastSaveStartedAt: 0,
  lastSaveDurationMs: 0,
  sanitizedSettingCount: 0,
  invalidSettingCount: 0,
  resetTriggered: false,
  lastApplyStatus: 'idle',
  lastSaveStatus: 'idle',
  labApplyError: null,
  labSaveError: null,
}

export function getLabApplyDiagnostics(): LabApplyDiagnostics {
  return {
    isApplyingLabSettings: labApplyRuntime.isApplyingLabSettings,
    isSavingLabSettings: labApplyRuntime.isSavingLabSettings,
    applyQueued: labApplyRuntime.applyQueued,
    lastApplyStartedAt: labApplyRuntime.lastApplyStartedAt,
    lastApplyDurationMs: labApplyRuntime.lastApplyDurationMs,
    lastSaveStartedAt: labApplyRuntime.lastSaveStartedAt,
    lastSaveDurationMs: labApplyRuntime.lastSaveDurationMs,
    sanitizedSettingCount: labApplyRuntime.sanitizedSettingCount,
    invalidSettingCount: labApplyRuntime.invalidSettingCount,
    resetTriggered: labApplyRuntime.resetTriggered,
    lastApplyStatus: labApplyRuntime.lastApplyStatus,
    lastSaveStatus: labApplyRuntime.lastSaveStatus,
    labApplyError: labApplyRuntime.labApplyError,
    labSaveError: labApplyRuntime.labSaveError,
  }
}
