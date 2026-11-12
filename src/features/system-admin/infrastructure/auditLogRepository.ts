import { err, ok } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'

import type { AuditLogQuery, AuditLogRepository } from '../domain/auditLog'
import { toAuditEntry, toAuditVerifyResult } from './mappers'

export interface AuditLogRepositoryDeps {
  /**
   * The SYSTEM API client: it carries the SYSTEM bearer token and retries a
   * 401 once through the session runtime's single-flight refresh.
   */
  readonly client: ApiClient
}

export const createAuditLogRepository = ({
  client,
}: AuditLogRepositoryDeps): AuditLogRepository => ({
  async list(query: AuditLogQuery) {
    // Cursor pagination: `next_cursor` from one slice feeds the next request;
    // the RFC3339 window and the action/actor/resource filters are optional.
    const result = toResult(
      await client.GET('/api/v1/system/audit/entries', {
        params: {
          query: {
            limit: query.limit,
            ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
            ...(query.occurredFrom === undefined ? {} : { occurred_from: query.occurredFrom }),
            ...(query.occurredTo === undefined ? {} : { occurred_to: query.occurredTo }),
          },
        },
      }),
    )
    if (!result.ok) return result
    const body = result.value
    if (body === undefined) return err({ kind: 'Unknown', status: null })
    return ok({ items: body.items.map(toAuditEntry), nextCursor: body.next_cursor ?? null })
  },

  async verify() {
    // Bounded suffix verification: the backend caps the checked rows and says
    // so via `truncated`; the UI reports the result as-is.
    const result = toResult(await client.GET('/api/v1/system/audit/verify'))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAuditVerifyResult(result.value))
  },
})
