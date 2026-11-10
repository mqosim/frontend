import type { Principal, UserProfile } from '@/shared/domain'
import type { components } from '@/shared/infrastructure/api/schema'

import type { AuthOutcome, WorkspaceList, WorkspaceOption } from '../domain/entities'

type Schemas = components['schemas']
export type LoginRequestDto = Schemas['LoginRequest']
export type SwitchTenantRequestDto = Schemas['SwitchTenantRequest']
export type TokenResponseDto = Schemas['TokenResponse']
export type MeResponseDto = Schemas['MeResponse']
export type TenantSummaryDto = Schemas['TenantSummarySchema']
export type TenantMembershipDto = Schemas['TenantMembershipSchema']

/** The tenant type that identifies the person's own workspace. */
const PERSONAL_TENANT = 'personal'

/**
 * Builds the UI-only principal from the tenant summary of a freshly issued
 * access token. The token itself is never decoded: the contract's supported
 * client path is `expires_in` plus `GET /identity/me`.
 *
 * `userId` stays `null` until `/identity/me` supplies it (the token response
 * carries no user id); no UI reads it for authorization.
 */
export const toPrincipal = (tenant: TenantSummaryDto, expiresAtMs: number): Principal => {
  const personal = tenant.type === PERSONAL_TENANT
  return {
    type: personal ? 'PERSON' : 'ORG',
    userId: null,
    orgId: personal ? null : tenant.id,
    expiresAt: expiresAtMs,
  }
}

/** Maps a login/refresh/switch-tenant body to a complete session outcome. */
export const toAuthOutcome = (dto: TokenResponseDto | undefined): AuthOutcome | null => {
  if (dto === undefined) return null
  return {
    kind: 'authenticated',
    principal: toPrincipal(dto.tenant, Date.now() + dto.expires_in * 1000),
  }
}

/**
 * Maps `/identity/me` plus the expiry of an adopted token to a session outcome.
 * Used when this tab adopts a sibling tab's fresh token instead of refreshing:
 * the tenant and the user id come from `/me`, the expiry from the broadcast.
 */
export const toAuthOutcomeFromMe = (
  dto: MeResponseDto | undefined,
  expiresAtMs: number,
): AuthOutcome | null => {
  if (dto === undefined) return null
  return {
    kind: 'authenticated',
    principal: { ...toPrincipal(dto.tenant, expiresAtMs), userId: dto.id },
  }
}

const toWorkspaceOption = (tenant: TenantMembershipDto): WorkspaceOption => ({
  id: tenant.id,
  name: tenant.name,
  type: tenant.type === PERSONAL_TENANT ? 'personal' : 'org',
  // The contract exposes no TIN on a tenant membership; the UI hides empty TINs.
  tin: '',
})

/**
 * Maps `/identity/me` to the workspace model the UI already uses. The current
 * tenant comes from `tenant`; the switchable list from `tenants`.
 *
 * UNKNOWN: the contract does not state whether the personal tenant is always
 * present in `tenants`. The list is rendered exactly as returned, so an account
 * without a personal membership simply has no personal row.
 */
export const toWorkspaceList = (dto: MeResponseDto | undefined): WorkspaceList | null => {
  if (dto === undefined) return null
  const current = dto.tenant
  return {
    options: dto.tenants.map(toWorkspaceOption),
    current: {
      workspace: current.type === PERSONAL_TENANT ? 'personal' : 'org',
      tenantId: current.id,
      orgId: current.type === PERSONAL_TENANT ? null : current.id,
    },
  }
}

/**
 * Maps `/identity/me` to the UI profile. Contact details are the masked values
 * the contract returns; `languageCode` and `emailVerifiedAt` have no source in
 * this contract and stay `null` (see `UserProfile`).
 */
export const toUserProfile = (dto: MeResponseDto | undefined): UserProfile | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.id,
    fullName: dto.full_name,
    email: dto.email_masked ?? null,
    phoneNumber: dto.phone_masked ?? null,
    languageCode: null,
    emailVerifiedAt: null,
  }
}
