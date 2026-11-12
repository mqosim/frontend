import type { Result } from '@/shared/domain'

import type { AdminIdentity } from './adminAccount'
import type {
  AdminImportReport,
  AdminImportRequest,
  AdminLanguage,
  AdminLanguagePatch,
  AdminMissingLanguage,
  AdminPageCreateInput,
  AdminPagePatch,
  AdminPhrase,
  AdminPhrasePage,
  AdminTranslationPage,
} from './adminI18n'
import type { AdminOrg, AdminOrgDetail } from './adminOrg'
import type { AdminListQuery, AdminPage } from './adminQuery'
import type { AdminRoleOption } from './adminRole'
import type { AdminMember, AdminSystemUser, AdminSystemUserPatch } from './adminUser'

/**
 * Outbound port for the SYSTEM control-plane surface, fully on the FastAPI
 * contract (`/api/v1/system/*`). Implemented over the SYSTEM API client in
 * infrastructure, so presentation never sees paths or transport details.
 *
 * List endpoints are offset-paged with `total` in the response body. Platform
 * users are tenant-scoped members (the contract has no global user directory),
 * and staff accounts are updated through a single PATCH — the contract has no
 * block/unblock or session-revoke endpoints.
 */
export interface AdminRepository {
  /** The caller's own role and permissions (`GET /system/auth/me`). */
  getMe(): Promise<Result<AdminIdentity>>

  // Tenants (organizations). suspend/reactivate require a reason that the
  // backend stores in the audit record (1..200 chars).
  listOrgs(query: AdminListQuery): Promise<Result<AdminPage<AdminOrg>>>
  getOrg(id: string): Promise<Result<AdminOrgDetail>>
  suspendOrg(id: string, reason: string): Promise<Result<AdminOrg>>
  reactivateOrg(id: string, reason: string): Promise<Result<AdminOrg>>
  listOrgMembers(id: string, query: AdminListQuery): Promise<Result<AdminPage<AdminMember>>>

  // Staff (system users)
  listSystemUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminSystemUser>>>
  getSystemUser(id: string): Promise<Result<AdminSystemUser>>
  updateSystemUser(id: string, patch: AdminSystemUserPatch): Promise<Result<AdminSystemUser>>

  // Fixed permission catalogue (role → permission grants)
  listRoles(): Promise<Result<readonly AdminRoleOption[]>>

  // ── i18n catalog management (i18n.read / i18n.manage) ────────────────────
  listI18nLanguages(): Promise<Result<readonly AdminLanguage[]>>
  updateI18nLanguage(code: string, patch: AdminLanguagePatch): Promise<Result<AdminLanguage>>

  listI18nPages(): Promise<Result<readonly AdminTranslationPage[]>>
  createI18nPage(input: AdminPageCreateInput): Promise<Result<AdminTranslationPage>>
  updateI18nPage(key: string, patch: AdminPagePatch): Promise<Result<AdminTranslationPage>>
  deleteI18nPage(key: string): Promise<Result<void>>

  listI18nPhrases(
    page: string,
    query: { limit: number; cursor?: string },
  ): Promise<Result<AdminPhrasePage>>
  upsertI18nPhrase(
    pageKey: string,
    phraseKey: string,
    values: Readonly<Record<string, string>>,
  ): Promise<Result<AdminPhrase>>
  deleteI18nPhrase(pageKey: string, phraseKey: string): Promise<Result<void>>

  getI18nMissing(): Promise<Result<readonly AdminMissingLanguage[]>>
  importI18n(body: AdminImportRequest): Promise<Result<AdminImportReport>>
}
