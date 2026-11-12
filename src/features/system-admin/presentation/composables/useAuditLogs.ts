import { computed, inject, ref, shallowRef } from 'vue'

import type { AppError } from '@/shared/domain/errors'

import { AuditLogRepositoryKey } from '../di'
import type { AuditLogEntry, AuditLogPage, AuditVerifyResult } from '../../domain/auditLog'

/** Rows requested per page (the contract's `limit`). */
export const AUDIT_PAGE_SIZE = 25

/** The window presets the page offers; `to` is always "now" at load time. */
export type AuditRangePresetId = '1h' | '24h' | '7d' | '31d'

const PRESET_MS: Record<AuditRangePresetId, number> = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '31d': 31 * 86_400_000,
}

export const AUDIT_RANGE_PRESETS: readonly AuditRangePresetId[] = ['1h', '24h', '7d', '31d']

/** The RFC3339 `occurred_from`/`occurred_to` window derived from a preset. */
export interface AuditRange {
  readonly from: string
  readonly to: string
}

/** RFC3339 UTC window for a preset, anchored on one `to` instant. */
export const toAuditRange = (preset: AuditRangePresetId, to: Date): AuditRange => ({
  to: to.toISOString(),
  from: new Date(to.getTime() - PRESET_MS[preset]).toISOString(),
})

export type AuditLogsStatus = 'loading' | 'ready' | 'error'

/**
 * Cursor-paginated list state for the Audit Logs page: the entries loaded so
 * far plus the backend's `next_cursor`. `load` starts a window over,
 * `loadMore` appends the next slice; a `null` cursor means the end.
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
  const loadingMore = ref(false)
  /** `null` once the backend stops returning `next_cursor` (the last page). */
  const nextCursor = ref<number | null>(null)

  // Only the newest request may write state, so switching presets mid-flight
  // can never let a stale response overwrite the current view.
  let requestSeq = 0

  const total = computed(() => entries.value.length)
  const hasMore = computed(() => nextCursor.value !== null)

  const fetchPage = async (
    query: { cursor?: number } & AuditRange,
    append: boolean,
  ): Promise<void> => {
    const seq = ++requestSeq
    if (append) loadingMore.value = true
    else status.value = 'loading'
    errorKind.value = null

    const result = await repository.list({
      limit: AUDIT_PAGE_SIZE,
      cursor: query.cursor,
      occurredFrom: query.from,
      occurredTo: query.to,
    })
    if (seq !== requestSeq) return

    if (!result.ok) {
      if (!append) status.value = 'error'
      errorKind.value = result.error.kind
      return
    }
    const page: AuditLogPage = result.value
    entries.value = append ? [...entries.value, ...page.items] : page.items
    nextCursor.value = page.nextCursor
    if (!append) status.value = 'ready'
    loadingMore.value = false
  }

  const load = async (nextPreset?: AuditRangePresetId): Promise<void> => {
    if (nextPreset !== undefined) preset.value = nextPreset
    await fetchPage(toAuditRange(preset.value, new Date()), false)
  }

  const loadMore = async (): Promise<void> => {
    const cursor = nextCursor.value
    if (cursor === null || loadingMore.value) return
    await fetchPage({ ...toAuditRange(preset.value, new Date()), cursor }, true)
  }

  // ── Chain verification (`audit.verify`, superadmin only) ──────────────────
  // The page only calls `verify` when the caller holds the grant; the backend
  // enforces it regardless. A previous result is cleared before every run.
  const verifying = ref(false)
  const verifyResult = shallowRef<AuditVerifyResult | null>(null)
  const verifyError = shallowRef<AppError | null>(null)

  const verify = async (): Promise<void> => {
    if (verifying.value) return
    verifying.value = true
    verifyError.value = null
    verifyResult.value = null
    const result = await repository.verify()
    verifying.value = false
    if (!result.ok) {
      verifyError.value = result.error
      return
    }
    verifyResult.value = result.value
  }

  return {
    status,
    errorKind,
    preset,
    load,
    loadMore,
    loadingMore,
    hasMore,
    total,
    entries,
    verifying,
    verifyResult,
    verifyError,
    verify,
  }
}
