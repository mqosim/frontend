import { err, ok } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import type { components } from '@/shared/infrastructure/api/schema'

import type { AuditLogEntry, AuditLogRepository } from '../domain/auditLog'

type AuditLogDto = components['schemas']['AuditLog']

export interface AuditLogRepositoryDeps {
  /**
   * The SYSTEM API client: it carries the SYSTEM bearer token and retries a
   * 401 once through the session runtime's single-flight refresh.
   */
  readonly client: ApiClient
}

/** The DTO fields are optional in the generated types; missing values stay visibly empty. */
export const toEntry = (dto: AuditLogDto): AuditLogEntry => ({
  uuid: dto.uuid ?? null,
  occurredAt: dto.occurred_at ?? null,
  actorUserId: dto.actor_user_id ?? null,
  actorUserUuid: dto.actor_user_uuid ?? null,
  actorType: dto.actor_type ?? null,
  orgId: dto.org_id ?? null,
  orgUuid: dto.org_uuid ?? null,
  action: dto.action ?? null,
  details: dto.details,
  ip: dto.ip ?? null,
  userAgent: dto.user_agent ?? null,
})

export const createAuditLogRepository = ({
  client,
}: AuditLogRepositoryDeps): AuditLogRepository => ({
  async list(range) {
    // `start`/`end` are the endpoint's only parameters (RFC3339, ≤ 31 days).
    const result = toResult(
      await client.GET('/api/v1/admin/audit', {
        params: { query: { start: range.start, end: range.end } },
      }),
    )
    if (!result.ok) return result
    return ok((result.value ?? []).map(toEntry))
  },

  async getByUuid(uuid) {
    const result = toResult(
      await client.GET('/api/v1/admin/audit/{uuid}', { params: { path: { uuid } } }),
    )
    if (!result.ok) return result
    const dto = result.value
    if (dto === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toEntry(dto))
  },
})
