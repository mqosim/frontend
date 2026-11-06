import type { Principal, UserProfile } from '@/shared/domain'
import type { components } from '@/shared/infrastructure/api/schema'
import { decodeAccessToken } from '@/shared/infrastructure/jwt/decode'

type Schemas = components['schemas']
export type SystemAuthResultDto = Schemas['AuthResult']
export type SystemTokenPairDto = Schemas['TokenPair']
export type SystemLoginRequestDto = Schemas['SystemLoginRequest']
export type SystemLogoutRequestDto = Schemas['SystemLogoutRequest']
export type SystemUserMeDto = Schemas['UserMe']
export type SystemUpdateUserLanguageRequestDto = Schemas['UpdateUserLanguageRequest']

/**
 * Builds the SYSTEM principal from the (unverified) access token. A token whose
 * `ptype` is not SYSTEM is rejected, so a regular token can never satisfy a
 * SYSTEM session.
 */
export const toSystemPrincipal = (accessToken: string): Principal | null => {
  const claims = decodeAccessToken(accessToken)
  if (claims === null || claims.ptype !== 'SYSTEM') return null

  return {
    type: 'SYSTEM',
    userId: claims.uid ?? claims.sub ?? null,
    orgId: null,
    needsWorkspace: false,
    expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : null,
  }
}

/** Maps the `/auth/me` body to the UI profile. `null` when the body is absent. */
export const toSystemUserProfile = (dto: SystemUserMeDto | undefined): UserProfile | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.uuid ?? '',
    email: dto.email ?? null,
    phoneNumber: dto.phone_number ?? null,
    languageCode: dto.language_code ?? null,
    // SYSTEM accounts cannot run the email-change flow (PERSON/ORG only), so a
    // SYSTEM profile never reports a verified address.
    emailVerifiedAt: null,
  }
}
