import { err, ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiCall, ApiClient } from '@/shared/infrastructure/api/client'
import { networkError, toAppError } from '@/shared/infrastructure/http/errors'

import type { AdminListQuery, AdminPage } from '../domain/adminQuery'
import type { AdminRepository } from '../domain/ports'
import {
  toAdminIdentity,
  toAdminOrg,
  toAdminRole,
  toAdminSystemUser,
  toAdminUser,
  type SetRolesRequestDto,
} from './mappers'

export interface AdminRepositoryDeps {
  /**
   * The SYSTEM API client: it carries the SYSTEM bearer token and retries a
   * 401 once through the session runtime's single-flight refresh.
   */
  readonly client: ApiClient
}

/**
 * Normalises a list call into an `AdminPage`, reading `X-Total-Count` from the
 * response headers. `toResult` intentionally drops headers, so list endpoints
 * are handled here instead.
 */
const toPage = <Dto, Entity>(
  call: ApiCall<Dto[] | undefined>,
  map: (dto: Dto) => Entity,
): Result<AdminPage<Entity>> => {
  if (call.response === undefined) return err(networkError())
  if (!call.response.ok) return err(toAppError(call.response, call.error))
  const items = (call.data ?? []).map(map)
  const header = call.response.headers.get('X-Total-Count')
  const parsed = header === null ? Number.NaN : Number(header)
  return ok({ items, total: Number.isFinite(parsed) ? parsed : items.length })
}

const uuidPath = (uuid: string) => ({ params: { path: { uuid } } })

export const createAdminRepository = ({ client }: AdminRepositoryDeps): AdminRepository => ({
  async getMe() {
    const result = toResult(await client.GET('/api/v1/admin/me'))
    if (!result.ok) return result
    const identity = toAdminIdentity(result.value)
    if (identity === null) return err({ kind: 'Unknown', status: null })
    return ok(identity)
  },

  // ── Organizations ─────────────────────────────────────────────────────────
  async listOrgs(query: AdminListQuery) {
    return toPage(
      await client.GET('/api/v1/admin/orgs', {
        params: {
          query: { search: query.search, limit: query.limit, offset: query.offset },
        },
      }),
      toAdminOrg,
    )
  },

  async getOrg(uuid) {
    const result = toResult(await client.GET('/api/v1/admin/orgs/{uuid}', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminOrg(result.value))
  },

  async blockOrg(uuid) {
    const result = toResult(await client.POST('/api/v1/admin/orgs/{uuid}/block', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminOrg(result.value))
  },

  async unblockOrg(uuid) {
    const result = toResult(await client.POST('/api/v1/admin/orgs/{uuid}/unblock', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminOrg(result.value))
  },

  // ── PERSON/ORG users ─────────────────────────────────────────────────────
  async listUsers(query: AdminListQuery) {
    return toPage(
      await client.GET('/api/v1/admin/users', {
        params: {
          query: { search: query.search, limit: query.limit, offset: query.offset },
        },
      }),
      toAdminUser,
    )
  },

  async getUser(uuid) {
    const result = toResult(await client.GET('/api/v1/admin/users/{uuid}', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminUser(result.value))
  },

  async blockUser(uuid) {
    const result = toResult(await client.POST('/api/v1/admin/users/{uuid}/block', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminUser(result.value))
  },

  async unblockUser(uuid) {
    const result = toResult(await client.POST('/api/v1/admin/users/{uuid}/unblock', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminUser(result.value))
  },

  async revokeUserSessions(uuid) {
    const result = toResult(
      await client.POST('/api/v1/admin/users/{uuid}/sessions/revoke', uuidPath(uuid)),
    )
    return result.ok ? ok(undefined) : result
  },

  // ── SYSTEM users ─────────────────────────────────────────────────────────
  async listSystemUsers(query: AdminListQuery) {
    return toPage(
      await client.GET('/api/v1/admin/system-users', {
        params: {
          query: { search: query.search, limit: query.limit, offset: query.offset },
        },
      }),
      toAdminSystemUser,
    )
  },

  async getSystemUser(uuid) {
    const result = toResult(await client.GET('/api/v1/admin/system-users/{uuid}', uuidPath(uuid)))
    if (!result.ok) return result
    return ok(toAdminSystemUser(result.value))
  },

  async setSystemUserRoles(uuid, roles) {
    const body: SetRolesRequestDto = { roles: [...roles] }
    const result = toResult(
      await client.PUT('/api/v1/admin/system-users/{uuid}/roles', {
        ...uuidPath(uuid),
        body,
      }),
    )
    if (!result.ok) return result
    return ok(toAdminSystemUser(result.value))
  },

  async blockSystemUser(uuid) {
    const result = toResult(
      await client.POST('/api/v1/admin/system-users/{uuid}/block', uuidPath(uuid)),
    )
    if (!result.ok) return result
    return ok(toAdminUser(result.value))
  },

  async unblockSystemUser(uuid) {
    const result = toResult(
      await client.POST('/api/v1/admin/system-users/{uuid}/unblock', uuidPath(uuid)),
    )
    if (!result.ok) return result
    return ok(toAdminUser(result.value))
  },

  async revokeSystemUserSessions(uuid) {
    const result = toResult(
      await client.POST('/api/v1/admin/system-users/{uuid}/sessions/revoke', uuidPath(uuid)),
    )
    return result.ok ? ok(undefined) : result
  },

  // ── Role catalogue ───────────────────────────────────────────────────────
  async listRoles() {
    const result = toResult(await client.GET('/api/v1/admin/roles'))
    if (!result.ok) return result
    return ok((result.value ?? []).map(toAdminRole))
  },
})
