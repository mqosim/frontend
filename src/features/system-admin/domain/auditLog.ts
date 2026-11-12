import type { Result } from '@/shared/domain'
import type { AppError } from '@/shared/domain/errors'

/**
 * One audit record as the SYSTEM audit endpoint serves it
 * (`SystemAuditEntryResponse`). The list item carries every displayable field —
 * the contract has no separate detail endpoint, so expanding a row reads the
 * item itself. Fields the backend serializes as optional stay nullable here —
 * the UI renders them as empty instead of inventing values.
 */
export interface AuditLogEntry {
  readonly id: string
  /** Monotonic position in the audit chain (`seq`). */
  readonly seq: number
  /** RFC3339 timestamp. */
  readonly occurredAt: string
  readonly action: string
  readonly outcome: string
  readonly actorUserId: string | null
  readonly actorType: string
  readonly authMethod: string | null
  readonly certSerial: string | null
  readonly resourceType: string | null
  readonly resourceId: string | null
  /** Free-form JSON payload; rendered as text, never as HTML. */
  readonly details: unknown
  readonly ip: string | null
  readonly requestId: string | null
}

/** Stable row identity: every entry carries an `id`. */
export const auditRowKey = (entry: Pick<AuditLogEntry, 'id'>): string => entry.id

/**
 * Query for the audit list. The endpoint is cursor-paginated (`next_cursor` in
 * the response feeds the next request) and filters by an RFC3339 `occurred`
 * window plus action/actor/resource; the UI uses the window presets.
 */
export interface AuditLogQuery {
  readonly limit: number
  readonly cursor?: number
  readonly occurredFrom?: string
  readonly occurredTo?: string
}

/** One cursor-paged slice; `nextCursor` is `null` on the last slice. */
export interface AuditLogPage {
  readonly items: readonly AuditLogEntry[]
  readonly nextCursor: number | null
}

/**
 * The bounded chain-verification result (`GET /system/audit/verify`). The
 * backend re-hashes the newest `SYSTEM_AUDIT_VERIFY_MAX_ROWS` entries and
 * checks the chain head, so `truncated` reports a suffix-only verification.
 */
export interface AuditVerifyResult {
  readonly ok: boolean
  readonly rowsChecked: number
  /** First verified sequence number; `null` when the chain is empty. */
  readonly verifiedFromSeq: number | null
  /** True when only the newest rows were verified (bounded range). */
  readonly truncated: boolean
  /** First inconsistent position; `null` when `ok`. */
  readonly firstBadSeq: number | null
  readonly headSeq: number | null
}

/**
 * Read-only audit operations. The UI never sees endpoint paths, query
 * parameters or transport details, so a changed backend contract only touches
 * the infrastructure adapter.
 */
export interface AuditLogRepository {
  /** One page of entries, newest first (the backend's fixed order). */
  list(query: AuditLogQuery): Promise<Result<AuditLogPage, AppError>>
  /** Verify the newest slice of the SYSTEM audit chain (`audit.verify`). */
  verify(): Promise<Result<AuditVerifyResult, AppError>>
}
