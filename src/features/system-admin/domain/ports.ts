import type { Result } from '@/shared/domain'

import type { AdminIdentity } from './adminAccount'
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
}
