import { computed, inject, ref } from 'vue'

import type { AppError } from '@/shared/domain/errors'

import { AuditLogRepositoryKey } from '../di'
import type { AuditLogEntry, AuditLogRange } from '../../domain/auditLog'

/** Rows per client-side page. The backend returns the whole window at once. */
export const AUDIT_PAGE_SIZE = 25

/** The window presets the page offers; `end` is always "now" at load time. */
export type AuditRangePresetId = '1h' | '24h' | '7d' | '31d'

const PRESET_MS: Record<AuditRangePresetId, number> = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  // Exactly the backend's 31-day cap; `start` is derived from `end`, so the
  // pair never trips the server's "range must not exceed 31 days" check.
  '31d': 31 * 86_400_000,
}

export const AUDIT_RANGE_PRESETS: readonly AuditRangePresetId[] = ['1h', '24h', '7d', '31d']

/** RFC3339 UTC window for a preset, anchored on one `end` instant. */
export const toAuditRange = (preset: AuditRangePresetId, end: Date): AuditLogRange => ({
  end: end.toISOString(),
  start: new Date(end.getTime() - PRESET_MS[preset]).toISOString(),
})

export type AuditLogsStatus = 'loading' | 'ready' | 'error'

/**
 * List state for the Audit Logs page: the latest window's entries plus a small
 * client-side pagination, since the backend has no pagination of its own.
 */
export const useAuditLogs = () => {
  const repository = inject(AuditLogRepositoryKey)
  if (repository === undefined) {
    throw new Error('Audit log repository was not provided by the composition root')
  }

  const entries = ref<readonly AuditLogEntry[]>([])
  const status = ref<AuditLogsStatus>('loading')
  const errorKind = ref<AppError['kind'] | null>(null)
  const preset = ref<AuditRangePresetId>('24h')
  const page = ref(1)

  // Only the newest request may write state, so switching presets mid-flight
  // can never let a stale response overwrite the current view.
  let requestSeq = 0

  const total = computed(() => entries.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / AUDIT_PAGE_SIZE)))
  const pageEntries = computed(() => {
    const start = (page.value - 1) * AUDIT_PAGE_SIZE
    return entries.value.slice(start, start + AUDIT_PAGE_SIZE)
  })

  const load = async (nextPreset?: AuditRangePresetId): Promise<void> => {
    if (nextPreset !== undefined) preset.value = nextPreset
    const seq = ++requestSeq
    status.value = 'loading'
    errorKind.value = null

    const result = await repository.list(toAuditRange(preset.value, new Date()))
    if (seq !== requestSeq) return

    if (!result.ok) {
      status.value = 'error'
      errorKind.value = result.error.kind
      return
    }
    entries.value = result.value
    page.value = 1
    status.value = 'ready'
  }

  return {
    status,
    errorKind,
    preset,
    load,
    page,
    total,
    pageCount,
    pageEntries,
  }
}
