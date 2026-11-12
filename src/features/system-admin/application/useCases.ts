import type { Result } from '@/shared/domain'

import type { AdminIdentity } from '../domain/adminAccount'
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
} from '../domain/adminI18n'
import type { AdminOrg, AdminOrgDetail } from '../domain/adminOrg'
import type { AdminListQuery, AdminPage } from '../domain/adminQuery'
import type { AdminRoleOption } from '../domain/adminRole'
import type { AdminMember, AdminSystemUser, AdminSystemUserPatch } from '../domain/adminUser'
import type { AdminRepository } from '../domain/ports'

export interface AdminUseCaseDeps {
  readonly repository: AdminRepository
}

export interface AdminUseCases {
  /** The SYSTEM caller's own role and permissions. */
  getMe(): Promise<Result<AdminIdentity>>

  listOrgs(query: AdminListQuery): Promise<Result<AdminPage<AdminOrg>>>
  getOrg(id: string): Promise<Result<AdminOrgDetail>>
  suspendOrg(id: string, reason: string): Promise<Result<AdminOrg>>
  reactivateOrg(id: string, reason: string): Promise<Result<AdminOrg>>
  listOrgMembers(id: string, query: AdminListQuery): Promise<Result<AdminPage<AdminMember>>>

  listSystemUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminSystemUser>>>
  getSystemUser(id: string): Promise<Result<AdminSystemUser>>
  updateSystemUser(id: string, patch: AdminSystemUserPatch): Promise<Result<AdminSystemUser>>

  listRoles(): Promise<Result<readonly AdminRoleOption[]>>

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

export const createAdminUseCases = ({ repository }: AdminUseCaseDeps): AdminUseCases => ({
  getMe: () => repository.getMe(),
  listOrgs: (query) => repository.listOrgs(query),
  getOrg: (id) => repository.getOrg(id),
  suspendOrg: (id, reason) => repository.suspendOrg(id, reason),
  reactivateOrg: (id, reason) => repository.reactivateOrg(id, reason),
  listOrgMembers: (id, query) => repository.listOrgMembers(id, query),
  listSystemUsers: (query) => repository.listSystemUsers(query),
  getSystemUser: (id) => repository.getSystemUser(id),
  updateSystemUser: (id, patch) => repository.updateSystemUser(id, patch),
  listRoles: () => repository.listRoles(),

  listI18nLanguages: () => repository.listI18nLanguages(),
  updateI18nLanguage: (code, patch) => repository.updateI18nLanguage(code, patch),
  listI18nPages: () => repository.listI18nPages(),
  createI18nPage: (input) => repository.createI18nPage(input),
  updateI18nPage: (key, patch) => repository.updateI18nPage(key, patch),
  deleteI18nPage: (key) => repository.deleteI18nPage(key),
  listI18nPhrases: (page, query) => repository.listI18nPhrases(page, query),
  upsertI18nPhrase: (pageKey, phraseKey, values) =>
    repository.upsertI18nPhrase(pageKey, phraseKey, values),
  deleteI18nPhrase: (pageKey, phraseKey) => repository.deleteI18nPhrase(pageKey, phraseKey),
  getI18nMissing: () => repository.getI18nMissing(),
  importI18n: (body) => repository.importI18n(body),
})
