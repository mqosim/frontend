import type { components } from '@/shared/infrastructure/api/schema'

import type { AdminIdentity } from '../domain/adminAccount'
import type { AdminOrg, AdminOrgDetail } from '../domain/adminOrg'
import type { AdminRoleOption } from '../domain/adminRole'
import type { AdminMember, AdminSystemUser, AdminSystemUserPatch } from '../domain/adminUser'
import type { AuditLogEntry } from '../domain/auditLog'

type Schemas = components['schemas']
export type SystemMeDto = Schemas['SystemMeResponse']
export type SystemTenantDto = Schemas['SystemTenantResponse']
export type SystemTenantDetailDto = Schemas['SystemTenantDetailResponse']
export type SystemTenantMemberDto = Schemas['SystemTenantMemberResponse']
export type SystemUserDto = Schemas['SystemUserResponse']
export type SystemUserUpdateRequestDto = Schemas['SystemUserUpdateRequest']
export type SystemPermissionsDto = Schemas['SystemPermissionsResponse']
export type SystemAuditEntryDto = Schemas['SystemAuditEntryResponse']

/** The staff roles/statuses the current contract allows (mirror of the DTO). */
const SYSTEM_USER_ROLES = ['superadmin', 'operator', 'i18n_editor'] as const
const SYSTEM_USER_STATUSES = ['active', 'disabled'] as const
export type SystemUserRole = (typeof SYSTEM_USER_ROLES)[number]
export type SystemUserStatus = (typeof SYSTEM_USER_STATUSES)[number]

export const isSystemUserRole = (role: string): role is SystemUserRole =>
  SYSTEM_USER_ROLES.some((value) => value === role)

export const isSystemUserStatus = (status: string): status is SystemUserStatus =>
  SYSTEM_USER_STATUSES.some((value) => value === status)

/**
 * Maps the `/system/auth/me` body to the UI identity. The backend grants
 * exactly one role, so it is wrapped as a one-element list; `null` when the
 * body is absent; a missing permissions field defaults to empty so `can(...)`
 * is always safe.
 */
export const toAdminIdentity = (dto: SystemMeDto | undefined): AdminIdentity | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.id,
    email: dto.email ?? null,
    roles: dto.role ? [dto.role] : [],
    permissions: dto.permissions ?? [],
  }
}

/**
 * Maps a tenant row to the UI organization. `stir` is the backend's name for
 * the tax number; `status` is `"active"` or `"suspended"`.
 */
export const toAdminOrg = (dto: SystemTenantDto): AdminOrg => ({
  id: dto.id,
  type: dto.type,
  name: dto.name,
  stir: dto.stir ?? '',
  status: dto.status,
  createdAt: dto.created_at ?? null,
})

/** Maps the tenant detail (the tenant row plus its aggregates). */
export const toAdminOrgDetail = (dto: SystemTenantDetailDto): AdminOrgDetail => ({
  org: toAdminOrg(dto.tenant),
  memberCount: dto.member_count,
  documentCounts: dto.document_counts,
})

/** Maps one tenant member (a platform user scoped to the tenant). */
export const toAdminMember = (dto: SystemTenantMemberDto): AdminMember => ({
  userId: dto.user_id,
  role: dto.role,
  status: dto.status,
  fullName: dto.full_name,
  emailMasked: dto.email_masked ?? null,
  phoneMasked: dto.phone_masked ?? null,
  identityStatus: dto.identity_status,
})

/** Maps a staff account. The backend role is singular. */
export const toAdminSystemUser = (dto: SystemUserDto): AdminSystemUser => ({
  id: dto.id,
  email: dto.email,
  displayName: dto.display_name,
  role: dto.role,
  status: dto.status,
  totpEnrolled: dto.totp_enrolled,
  createdAt: dto.created_at ?? null,
  updatedAt: dto.updated_at ?? null,
})

/**
 * Maps the PATCH body from the editable staff fields; omitted patch fields are
 * left out of the body so the backend only changes what was sent.
 *
 * The backend constrains `role` and `status` to fixed literal sets. The values
 * arrive from the live catalogue as plain strings, so this mapper validates
 * them against those sets (derived below) and returns `null` for a value the
 * contract does not allow — the repository turns that into a validation error
 * instead of sending a request the backend would reject.
 */
export const toSystemUserUpdateRequest = (
  patch: AdminSystemUserPatch,
): SystemUserUpdateRequestDto | null => {
  const { displayName, role, status } = patch
  if (role !== undefined && !isSystemUserRole(role)) return null
  if (status !== undefined && !isSystemUserStatus(status)) return null
  return {
    ...(displayName === undefined ? {} : { display_name: displayName }),
    ...(role === undefined ? {} : { role }),
    ...(status === undefined ? {} : { status }),
  }
}

/**
 * Maps the fixed permission catalogue into the role options the staff editor
 * offers, alphabetically for a stable order in the UI.
 */
export const toAdminRoleOptions = (dto: SystemPermissionsDto): readonly AdminRoleOption[] =>
  Object.entries(dto.roles)
    .map(([role, permissions]) => ({ role, permissions }))
    .sort((a, b) => a.role.localeCompare(b.role))

/** Maps one audit entry; the list item carries every displayable field. */
export const toAuditEntry = (dto: SystemAuditEntryDto): AuditLogEntry => ({
  id: dto.id,
  seq: dto.seq,
  occurredAt: dto.occurred_at,
  action: dto.action,
  outcome: dto.outcome,
  actorUserId: dto.actor_user_id ?? null,
  actorType: dto.actor_type,
  authMethod: dto.auth_method ?? null,
  certSerial: dto.cert_serial ?? null,
  resourceType: dto.resource_type ?? null,
  resourceId: dto.resource_id ?? null,
  details: dto.details,
  ip: dto.ip ?? null,
  requestId: dto.request_id ?? null,
})
