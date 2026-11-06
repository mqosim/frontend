import type { Result } from '@/shared/domain'

import type { AdminIdentity } from './adminAccount'
import type { AdminOrg } from './adminOrg'
import type { AdminListQuery, AdminPage } from './adminQuery'
import type { AdminRole } from './adminRole'
import type { AdminSystemUser, AdminUser } from './adminUser'

/**
 * Outbound port for the `/api/v1/admin` control-plane surface. Implemented over
 * the SYSTEM API client in infrastructure, so presentation never sees paths or
 * transport details.
 */
export interface AdminRepository {
  /** The caller's own roles and permissions (`GET /admin/me`). */
  getMe(): Promise<Result<AdminIdentity>>

  // Organizations
  listOrgs(query: AdminListQuery): Promise<Result<AdminPage<AdminOrg>>>
  getOrg(uuid: string): Promise<Result<AdminOrg>>
  blockOrg(uuid: string): Promise<Result<AdminOrg>>
  unblockOrg(uuid: string): Promise<Result<AdminOrg>>

  // PERSON/ORG users
  listUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminUser>>>
  getUser(uuid: string): Promise<Result<AdminUser>>
  blockUser(uuid: string): Promise<Result<AdminUser>>
  unblockUser(uuid: string): Promise<Result<AdminUser>>
  revokeUserSessions(uuid: string): Promise<Result<void>>

  // SYSTEM users
  listSystemUsers(query: AdminListQuery): Promise<Result<AdminPage<AdminSystemUser>>>
  getSystemUser(uuid: string): Promise<Result<AdminSystemUser>>
  setSystemUserRoles(uuid: string, roles: readonly string[]): Promise<Result<AdminSystemUser>>
  blockSystemUser(uuid: string): Promise<Result<AdminUser>>
  unblockSystemUser(uuid: string): Promise<Result<AdminUser>>
  revokeSystemUserSessions(uuid: string): Promise<Result<void>>

  // Role catalogue (for the roles editor)
  listRoles(): Promise<Result<readonly AdminRole[]>>
}
