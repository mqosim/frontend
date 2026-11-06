import type { components } from '@/shared/infrastructure/api/schema'

import type { AdminIdentity } from '../domain/adminAccount'
import type { AdminOrg } from '../domain/adminOrg'
import type { AdminRole } from '../domain/adminRole'
import type { AdminSystemUser, AdminUser, AdminUserType } from '../domain/adminUser'

type Schemas = components['schemas']
export type AdminMeDto = Schemas['AdminMe']
export type AdminOrgDto = Schemas['AdminOrg']
export type AdminUserDto = Schemas['AdminUser']
export type AdminSystemUserDto = Schemas['AdminSystemUser']
export type AdminRoleDto = Schemas['AdminRole']
export type SetRolesRequestDto = Schemas['SetRolesRequest']

/**
 * Maps the `/admin/me` body to the UI identity. `null` when the body is absent;
 * missing roles/permissions default to empty so `can(...)` is always safe.
 */
export const toAdminIdentity = (dto: AdminMeDto | undefined): AdminIdentity | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.uuid ?? '',
    email: dto.email ?? null,
    roles: dto.roles ?? [],
    permissions: dto.permissions ?? [],
  }
}

export const toAdminOrg = (dto: AdminOrgDto): AdminOrg => ({
  uuid: dto.uuid ?? '',
  tin: dto.tin ?? '',
  name: dto.name ?? '',
  isActive: dto.is_active ?? false,
  createdAt: dto.created_at ?? null,
  updatedAt: dto.updated_at ?? null,
})

const toUserType = (value: AdminUserDto['user_type']): AdminUserType =>
  value === 'ORG' ? 'ORG' : 'PERSON'

export const toAdminUser = (dto: AdminUserDto): AdminUser => ({
  uuid: dto.uuid ?? '',
  userType: toUserType(dto.user_type),
  email: dto.email ?? null,
  phoneNumber: dto.phone_number ?? null,
  isActive: dto.is_active ?? false,
  languageCode: dto.language_code ?? '',
  emailVerifiedAt: dto.email_verified_at ?? null,
  createdAt: dto.created_at ?? null,
  updatedAt: dto.updated_at ?? null,
})

export const toAdminSystemUser = (dto: AdminSystemUserDto): AdminSystemUser => ({
  ...toAdminUser(dto),
  roles: dto.roles ?? [],
})

export const toAdminRole = (dto: AdminRoleDto): AdminRole => ({
  code: dto.code ?? '',
  description: dto.description ?? '',
  permissions: dto.permissions ?? [],
})
