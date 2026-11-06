import type { Result } from '@/shared/domain'
import type { AppError } from '@/shared/domain/errors'

/**
 * One audit record as the master audit endpoints serve it (`AuditLog` in the
 * API schema). Fields the backend serializes as optional stay nullable here —
 * the UI renders them as empty instead of inventing values.
 */
export interface AuditLogEntry {
  readonly uuid: string | null
  /** RFC3339 timestamp. */
  readonly occurredAt: string | null
  readonly actorUserId: number | null
  /** UUID of the acting user; null on legacy rows until the backend backfills. */
  readonly actorUserUuid: string | null
  readonly actorType: string | null
  readonly orgId: number | null
  /** UUID of the organization; null on legacy rows and rows without an org. */
  readonly orgUuid: string | null
  readonly action: string | null
  /** Free-form JSON payload; rendered as text, never as HTML. */
  readonly details: unknown
  readonly ip: string | null
  readonly userAgent: string | null
}

/**
 * Stable row identity: rows carry a UUID, but a row without one (legacy data)
 * falls back to its index — there is no numeric `id` to key on anymore.
 */
export const auditRowKey = (entry: Pick<AuditLogEntry, 'uuid'>, index: number): string =>
  entry.uuid ?? `row-${index}`

/**
 * RFC3339 window for the list endpoint. The backend requires `start` before
 * `end` and caps the range at 31 days; there are no other filters.
 */
export interface AuditLogRange {
  readonly start: string
  readonly end: string
}

/**
 * Read-only audit operations. The UI never sees endpoint paths, query
 * parameters or transport details, so a changed backend contract only touches
 * the infrastructure adapter.
 */
export interface AuditLogRepository {
  /** All entries in the window, newest first (the backend's fixed order). */
  list(range: AuditLogRange): Promise<Result<readonly AuditLogEntry[], AppError>>
  getByUuid(uuid: string): Promise<Result<AuditLogEntry, AppError>>
}
