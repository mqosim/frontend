import type { Principal, UserProfile } from '@/shared/domain'
import type { components } from '@/shared/infrastructure/api/schema'
import { decodeAccessToken, isSystemAccessToken } from '@/shared/infrastructure/jwt/decode'

type Schemas = components['schemas']
export type SystemLoginRequestDto = Schemas['SystemLoginRequest']
export type SystemTotpRequestDto = Schemas['SystemTotpRequest']
export type SystemActivateRequestDto = Schemas['SystemActivateRequest']
export type SystemMeDto = Schemas['SystemMeResponse']
/** Response bodies the repository reads; call sites add `| undefined` for a bodyless 2xx. */
export type SystemPreAuthResponseDto = Schemas['SystemPreAuthResponse']
export type SystemTokenResponseDto = Schemas['SystemTokenResponse']
export type SystemEnrollResponseDto = Schemas['SystemEnrollResponse']
export type SystemActivateResponseDto = Schemas['SystemActivateResponse']

/**
 * Builds the SYSTEM principal from the (unverified) access token. The SYSTEM
 * realm identifies its tokens by audience (`aud: "system"`) and carries no
 * `ptype`/`uid`; a token minted for the regular realm therefore never satisfies
 * the SYSTEM session. `sub` is the system user id and `exp` the expiry.
 */
export const toSystemPrincipal = (accessToken: string): Principal | null => {
  const claims = decodeAccessToken(accessToken)
  if (claims === null || !isSystemAccessToken(claims)) return null

  return {
    type: 'SYSTEM',
    userId: claims.sub ?? null,
    orgId: null,
    expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : null,
  }
}

/**
 * Maps `/system/auth/me` to the shared profile the chrome already understands.
 * The SYSTEM realm exposes no phone number and no saved language (it has no
 * language endpoint), so those stay `null`; the display name fills `fullName`.
 */
export const toSystemUserProfile = (dto: SystemMeDto | undefined): UserProfile | null => {
  if (dto === undefined) return null
  return {
    uuid: dto.id,
    fullName: dto.display_name,
    email: dto.email,
    phoneNumber: null,
    languageCode: null,
    emailVerifiedAt: null,
  }
}
