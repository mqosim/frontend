import { err, ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'

import type { AdminListQuery, AdminPage } from '../domain/adminQuery'
import type {
  AdminImportRequest,
  AdminLanguagePatch,
  AdminPageCreateInput,
  AdminPagePatch,
} from '../domain/adminI18n'
import type { AdminSystemUserPatch } from '../domain/adminUser'
import type { AdminRepository } from '../domain/ports'
import {
  toAdminIdentity,
  toAdminMember,
  toAdminOrg,
  toAdminOrgDetail,
  toAdminRoleOptions,
  toAdminSystemUser,
  toSystemUserUpdateRequest,
} from './mappers'
import {
  toAdminImportReport,
  toAdminLanguage,
  toAdminMissingLanguage,
  toAdminPhrase,
  toAdminTranslationPage,
  toImportRequest,
  toLanguageUpdateRequest,
  toPageCreateRequest,
  toPageUpdateRequest,
  toPhraseUpsertRequest,
} from './i18nMappers'

export interface AdminRepositoryDeps {
  /**
   * The SYSTEM API client: it carries the SYSTEM bearer token and retries a
   * 401 once through the session runtime's single-flight refresh.
   */
  readonly client: ApiClient
}

/**
 * Normalises a `{items, total}` list body into an `AdminPage`. The new
 * contract puts the total in the body — the retired `X-Total-Count` header is
 * no longer read.
 */
const toBodyPage = <Dto, Entity>(
  result: Result<{ items: Dto[]; total: number } | undefined>,
  map: (dto: Dto) => Entity,
): Result<AdminPage<Entity>> => {
  if (!result.ok) return result
  const body = result.value
  if (body === undefined) return err({ kind: 'Unknown', status: null })
  return ok({ items: body.items.map(map), total: body.total })
}

const tenantPath = (id: string) => ({ params: { path: { tenant_id: id } } })
const userPath = (id: string) => ({ params: { path: { user_id: id } } })

export const createAdminRepository = ({ client }: AdminRepositoryDeps): AdminRepository => ({
  async getMe() {
    // The SYSTEM identity surface is `/system/auth/me`: the staff profile with
    // the permission set the backend resolves from the caller's single role.
    const result = toResult(await client.GET('/api/v1/system/auth/me'))
    if (!result.ok) return result
    const identity = toAdminIdentity(result.value)
    if (identity === null) return err({ kind: 'Unknown', status: null })
    return ok(identity)
  },

  // ── Tenants (organizations) ───────────────────────────────────────────────
  async listOrgs(query: AdminListQuery) {
    return toBodyPage(
      toResult(
        await client.GET('/api/v1/system/tenants', {
          params: { query: { limit: query.limit, offset: query.offset } },
        }),
      ),
      toAdminOrg,
    )
  },

  async getOrg(id: string) {
    const result = toResult(await client.GET('/api/v1/system/tenants/{tenant_id}', tenantPath(id)))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminOrgDetail(result.value))
  },

  async suspendOrg(id: string, reason: string) {
    // The lifecycle change is audited with the caller's reason (required,
    // 1..200 chars — the confirm dialog enforces the non-empty part).
    const result = toResult(
      await client.POST('/api/v1/system/tenants/{tenant_id}/suspend', {
        ...tenantPath(id),
        body: { reason: reason.trim() },
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminOrg(result.value))
  },

  async reactivateOrg(id: string, reason: string) {
    const result = toResult(
      await client.POST('/api/v1/system/tenants/{tenant_id}/reactivate', {
        ...tenantPath(id),
        body: { reason: reason.trim() },
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminOrg(result.value))
  },

  async listOrgMembers(id: string, query: AdminListQuery) {
    return toBodyPage(
      toResult(
        await client.GET('/api/v1/system/tenants/{tenant_id}/users', {
          params: {
            path: { tenant_id: id },
            query: { limit: query.limit, offset: query.offset },
          },
        }),
      ),
      toAdminMember,
    )
  },

  // ── Staff (system users) ──────────────────────────────────────────────────
  async listSystemUsers(query: AdminListQuery) {
    return toBodyPage(
      toResult(
        await client.GET('/api/v1/system/users', {
          params: { query: { limit: query.limit, offset: query.offset } },
        }),
      ),
      toAdminSystemUser,
    )
  },

  async getSystemUser(id: string) {
    const result = toResult(await client.GET('/api/v1/system/users/{user_id}', userPath(id)))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminSystemUser(result.value))
  },

  async updateSystemUser(id: string, patch: AdminSystemUserPatch) {
    // Values outside the contract's fixed sets become a local validation error
    // instead of a request the backend would answer 422.
    const body = toSystemUserUpdateRequest(patch)
    if (body === null) return err({ kind: 'Validation', status: 400, fields: {} })
    const result = toResult(
      await client.PATCH('/api/v1/system/users/{user_id}', {
        ...userPath(id),
        body,
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminSystemUser(result.value))
  },

  // ── Fixed permission catalogue ────────────────────────────────────────────
  async listRoles() {
    const result = toResult(await client.GET('/api/v1/system/permissions'))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminRoleOptions(result.value))
  },

  // ── i18n catalog management ───────────────────────────────────────────────
  async listI18nLanguages() {
    const result = toResult(await client.GET('/api/v1/system/i18n/languages'))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(result.value.items.map(toAdminLanguage))
  },

  async updateI18nLanguage(code: string, patch: AdminLanguagePatch) {
    const result = toResult(
      await client.PATCH('/api/v1/system/i18n/languages/{code}', {
        params: { path: { code } },
        body: toLanguageUpdateRequest(patch),
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminLanguage(result.value))
  },

  async listI18nPages() {
    const result = toResult(await client.GET('/api/v1/system/i18n/pages'))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(result.value.items.map(toAdminTranslationPage))
  },

  async createI18nPage(input: AdminPageCreateInput) {
    const result = toResult(
      await client.POST('/api/v1/system/i18n/pages', { body: toPageCreateRequest(input) }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminTranslationPage(result.value))
  },

  async updateI18nPage(key: string, patch: AdminPagePatch) {
    const result = toResult(
      await client.PATCH('/api/v1/system/i18n/pages/{page_key}', {
        params: { path: { page_key: key } },
        body: toPageUpdateRequest(patch),
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminTranslationPage(result.value))
  },

  async deleteI18nPage(key: string) {
    const result = toResult(
      await client.DELETE('/api/v1/system/i18n/pages/{page_key}', {
        params: { path: { page_key: key } },
      }),
    )
    if (!result.ok) return result
    return ok(undefined)
  },

  async listI18nPhrases(page: string, query: { limit: number; cursor?: string }) {
    const result = toResult(
      await client.GET('/api/v1/system/i18n/phrases', {
        params: {
          query: {
            page,
            limit: query.limit,
            ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
          },
        },
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok({
      items: result.value.items.map(toAdminPhrase),
      nextCursor: result.value.next_cursor ?? null,
    })
  },

  async upsertI18nPhrase(
    pageKey: string,
    phraseKey: string,
    values: Readonly<Record<string, string>>,
  ) {
    const result = toResult(
      await client.PUT('/api/v1/system/i18n/phrases/{page_key}/{phrase_key}', {
        params: { path: { page_key: pageKey, phrase_key: phraseKey } },
        body: toPhraseUpsertRequest(values),
      }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminPhrase(result.value))
  },

  async deleteI18nPhrase(pageKey: string, phraseKey: string) {
    const result = toResult(
      await client.DELETE('/api/v1/system/i18n/phrases/{page_key}/{phrase_key}', {
        params: { path: { page_key: pageKey, phrase_key: phraseKey } },
      }),
    )
    if (!result.ok) return result
    return ok(undefined)
  },

  async getI18nMissing() {
    const result = toResult(await client.GET('/api/v1/system/i18n/missing'))
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(result.value.items.map(toAdminMissingLanguage))
  },

  async importI18n(body: AdminImportRequest) {
    const result = toResult(
      await client.POST('/api/v1/system/i18n/import', { body: toImportRequest(body) }),
    )
    if (!result.ok) return result
    if (result.value === undefined) return err({ kind: 'Unknown', status: null })
    return ok(toAdminImportReport(result.value))
  },
})
