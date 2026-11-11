import type { Result } from '@/shared/domain'

import type { AdminIdentity } from '../domain/adminAccount'
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
})
