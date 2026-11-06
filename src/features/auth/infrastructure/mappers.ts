import type { Principal, PrincipalType, UserProfile } from '@/shared/domain'
import type { components } from '@/shared/infrastructure/api/schema'
import { decodeAccessToken } from '@/shared/infrastructure/jwt/decode'

import type { AuthOutcome, WorkspaceList, WorkspaceOption } from '../domain/entities'

type Schemas = components['schemas']
export type AuthResultDto = Schemas['AuthResult']
export type TokenPairDto = Schemas['TokenPair']
export type LoginRequestDto = Schemas['LoginRequest']
export type LoginWithSignatureRequestDto = Schemas['LoginWithSignatureRequest']
export type RegisterRequestDto = Schemas['RegisterRequest']
export type SelectWorkspaceRequestDto = Schemas['SelectWorkspaceRequest']
export type SwitchWorkspaceRequestDto = Schemas['SwitchWorkspaceRequest']
export type WorkspaceListDto = Schemas['WorkspaceList']
export type UserMeDto = Schemas['UserMe']
export type UpdateUserLanguageRequestDto = Schemas['UpdateUserLanguageRequest']
export type ChangePasswordRequestDto = Schemas['ChangePasswordRequest']
export type ChangeEmailRequestDto = Schemas['ChangeEmailRequest']
export type ConfirmEmailChangeRequestDto = Schemas['ConfirmEmailChangeRequest']
export type EmailChangeResponseDto = Schemas['EmailChangeResponse']

const PRINCIPAL_TYPES = ['PERSON', 'ORG', 'SYSTEM'] as const

export const toPrincipalType = (value: string | undefined): PrincipalType | null =>
  value !== undefined && (PRINCIPAL_TYPES as readonly string[]).includes(value)
    ? (value as PrincipalType)
    : null

/** Builds UI-only principal hints from the (unverified) access token. */
export const toPrincipal = (accessToken: string): Principal | null => {
  const claims = decodeAccessToken(accessToken)
  if (claims === null) return null

  const type = toPrincipalType(claims.ptype)
  if (type === null) return null

  return {
    type,
    userId: claims.uid ?? claims.sub ?? null,
    orgId: claims.oid ?? null,
    needsWorkspace: claims.needs_ws === true,
    expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : null,
  }
}

export const toWorkspaceOption = (org: Schemas['Org']): WorkspaceOption => ({
  id: org.id ?? '',
  name: org.name ?? '',
  tin: org.tin ?? '',
})

/**
 * Maps the `/auth/workspaces` body. `current.org_id` is preserved as `null` for a
 * personal workspace AND for an org that was deactivated after selection, so the
 * UI can tell "personal" from "active org no longer listed".
 */
export const toWorkspaceList = (dto: WorkspaceListDto | undefined): WorkspaceList => ({
  options: (dto?.workspace_options ?? []).map(toWorkspaceOption),
  current: {
    workspace: dto?.current?.workspace === 'org' ? 'org' : 'personal',
    orgId: dto?.current?.org_id ?? null,
  },
})

/** Maps the `/auth/me` body to the UI profile. `null` when the body is absent. */
export const toUserProfile = (dto: UserMeDto | undefined): UserProfile | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.uuid ?? '',
    email: dto.email ?? null,
    phoneNumber: dto.phone_number ?? null,
    languageCode: dto.language_code ?? null,
    emailVerifiedAt: dto.email_verified_at ?? null,
  }
}

/**
 * Maps the 202 body of an email-change request. A missing field means the
 * backend's cooldown/cap config changed shape; `0` keeps the UI honest (it
 * renders no countdown) instead of inventing a TTL.
 */
export const toEmailChangePending = (dto: EmailChangeResponseDto | undefined) => ({
  expiresInSec: dto?.expires_in ?? 0,
  resendAfterSec: dto?.resend_after ?? 0,
})

/**
 * Maps an `AuthResult` body to an outcome. A pending-workspace token is
 * signalled by the `needs_ws` claim (and/or the presence of workspace options).
 */
export const toAuthOutcome = (result: AuthResultDto | undefined): AuthOutcome | null => {
  const accessToken = result?.tokens?.access_token
  if (accessToken === undefined) return null

  const principal = toPrincipal(accessToken)
  if (principal === null) return null

  const workspaces = (result?.workspace_options ?? []).map(toWorkspaceOption)
  if (principal.needsWorkspace || workspaces.length > 0) {
    return { kind: 'workspace_required', principal, workspaces }
  }
  return { kind: 'authenticated', principal }
}

/**
 * `/auth/refresh` returns a bare `TokenPair` (no workspace options): a refreshed
 * session is always complete, never pending.
 */
export const toTokenPairOutcome = (pair: TokenPairDto | undefined): AuthOutcome | null => {
  const accessToken = pair?.access_token
  if (accessToken === undefined) return null

  const principal = toPrincipal(accessToken)
  if (principal === null) return null

  return { kind: 'authenticated', principal }
}
