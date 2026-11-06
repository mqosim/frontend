import type { Result } from '@/shared/domain'

import type { AdminIdentity } from '../domain/adminAccount'
import type { AdminOrg } from '../domain/adminOrg'
import type { AdminListQuery, AdminPage } from '../domain/adminQuery'
import type { AdminRole } from '../domain/adminRole'
import type { AdminSystemUser, AdminUser } from '../domain/adminUser'
import type { AdminRepository } from '../domain/ports'

export interface AdminUseCaseDeps {
  readonly repository: AdminRepository
}

export interface AdminUseCases {
  /** The SYSTEM caller's own roles and permissions. */
  getMe(): Promise<Result<AdminIdentity>>

  listOrgs(query: AdminListQuery): Promise<Result<AdminPage<AdminOrg>>>
  getOrg(uuid: string): Promise<Result<AdminOrg>>
  blockOrg(uuid: string): Promise<Result<AdminOrg>>
  unblockOrg(uuid: string): Promise<Result<AdminOrg>>

  listUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminUser>>>
  getUser(uuid: string): Promise<Result<AdminUser>>
  blockUser(uuid: string): Promise<Result<AdminUser>>
  unblockUser(uuid: string): Promise<Result<AdminUser>>
  revokeUserSessions(uuid: string): Promise<Result<void>>

  listSystemUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminSystemUser>>>
  getSystemUser(uuid: string): Promise<Result<AdminSystemUser>>
  setSystemUserRoles(uuid: string, roles: readonly string[]): Promise<Result<AdminSystemUser>>
  blockSystemUser(uuid: string): Promise<Result<AdminUser>>
  unblockSystemUser(uuid: string): Promise<Result<AdminUser>>
  revokeSystemUserSessions(uuid: string): Promise<Result<void>>

  listRoles(): Promise<Result<readonly AdminRole[]>>
}

export const createAdminUseCases = ({ repository }: AdminUseCaseDeps): AdminUseCases => ({
  getMe: () => repository.getMe(),
  listOrgs: (query) => repository.listOrgs(query),
  getOrg: (uuid) => repository.getOrg(uuid),
  blockOrg: (uuid) => repository.blockOrg(uuid),
  unblockOrg: (uuid) => repository.unblockOrg(uuid),
  listUsers: (query) => repository.listUsers(query),
  getUser: (uuid) => repository.getUser(uuid),
  blockUser: (uuid) => repository.blockUser(uuid),
  unblockUser: (uuid) => repository.unblockUser(uuid),
  revokeUserSessions: (uuid) => repository.revokeUserSessions(uuid),
  listSystemUsers: (query) => repository.listSystemUsers(query),
  getSystemUser: (uuid) => repository.getSystemUser(uuid),
  setSystemUserRoles: (uuid, roles) => repository.setSystemUserRoles(uuid, roles),
  blockSystemUser: (uuid) => repository.blockSystemUser(uuid),
  unblockSystemUser: (uuid) => repository.unblockSystemUser(uuid),
  revokeSystemUserSessions: (uuid) => repository.revokeSystemUserSessions(uuid),
  listRoles: () => repository.listRoles(),
})
