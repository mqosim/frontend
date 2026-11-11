import { err, ok } from '@/shared/domain'
import type { AppError, Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import type { TokenStore } from '@/shared/infrastructure/session/tokenStore'

import type {
  SystemLoginChallenge,
  SystemRecoveryCodes,
  SystemSession,
  SystemTotpEnrollment,
} from '../domain/entities'
import type { SystemAuthRepository } from '../domain/ports'
import { toSystemPrincipal, toSystemUserProfile } from './mappers'
import type {
  SystemActivateRequestDto,
  SystemActivateResponseDto,
  SystemEnrollResponseDto,
  SystemLoginRequestDto,
  SystemPreAuthResponseDto,
  SystemTokenResponseDto,
  SystemTotpRequestDto,
} from './mappers'

export interface SystemAuthRepositoryDeps {
  readonly client: ApiClient
  readonly tokens: TokenStore
  /** Runs the single-flight, cross-tab refresh owned by the session runtime. */
  readonly refreshRunner: () => Promise<Result<SystemSession>>
  /** Tells the session runtime that this tab logged out, so siblings can follow. */
  readonly onLoggedOut: () => void
  /**
   * Marks an intentional logout on the session runtime before the request is sent,
   * so a 401 from a request already in flight is not mistaken for an expired
   * session.
   */
  readonly onLogoutStart: () => void
  /** Clears the runtime's intentional-logout mark when the logout request fails. */
  readonly onLogoutFailed: () => void
  /** Reports the current access token (or `null`) so the runtime can schedule renewal. */
  readonly onSession: (accessToken: string | null) => void
}

/** The two hooks the session runtime needs from the repository itself. */
export interface SystemAuthSessionPorts {
  /** Network refresh: stores the new token on success, clears it on failure. */
  performRefresh(): Promise<Result<SystemSession>>
  /** Maps an access token adopted from another tab to a SYSTEM session. */
  toOutcome(accessToken: string): Result<SystemSession>
}

export type SystemAuthRepositoryImpl = SystemAuthRepository & SystemAuthSessionPorts

/** The header the contract uses to carry the single-use pre-authentication token. */
const PRE_AUTH_HEADER = 'X-System-Pre-Auth'

/** The code the backend uses for "this pre-authentication token is unusable". */
const PRE_AUTH_INVALID = 'system_pre_auth_invalid'

/** The pre-authenticated state between the password step and the TOTP step. */
interface PendingPreAuth {
  readonly token: string
  /** Epoch milliseconds; from this instant the token is treated as spent. */
  readonly expiresAt: number
}

/** True when the failure carries the given backend machine code. */
const hasCode = (error: AppError, code: string): boolean => 'code' in error && error.code === code

/** The local failure for "no live pre-authentication token" (expired or never issued). */
const preAuthRequired = (): AppError => ({
  kind: 'Unauthorized',
  status: 401,
  code: PRE_AUTH_INVALID,
})

export const createSystemAuthRepository = ({
  client,
  tokens,
  refreshRunner,
  onLoggedOut,
  onLogoutStart,
  onLogoutFailed,
  onSession,
}: SystemAuthRepositoryDeps): SystemAuthRepositoryImpl => {
  /**
   * The single-use pre-authentication token from the password step.
   *
   * It lives ONLY here: it is never returned to the application layer, never
   * enters the bearer `tokens` store, and is never persisted or logged. It is
   * cleared on success, on `system_pre_auth_invalid`, on local expiry, on
   * logout and when a new login starts; a wrong TOTP/recovery code keeps it so
   * the user can retry the same step.
   */
  let pending: PendingPreAuth | null = null

  const clearPending = (): void => {
    pending = null
  }

  /** The live pending token, or null (clearing an expired one on the way out). */
  const livePreAuth = (): string | null => {
    if (pending === null) return null
    if (Date.now() >= pending.expiresAt) {
      pending = null
      return null
    }
    return pending.token
  }

  /**
   * Drops the pending token only when the backend reports it unusable. A wrong
   * code (`totp_invalid`, `recovery_code_invalid`), a rate limit or a transport
   * failure leave it in place so the user can retry.
   */
  const settleFailure = <T>(error: AppError): Result<T> => {
    if (hasCode(error, PRE_AUTH_INVALID)) clearPending()
    return err(error)
  }

  /** Files a freshly issued access token and derives the SYSTEM principal. */
  const adoptAccessToken = (accessToken: string | undefined): Result<SystemSession> => {
    if (accessToken === undefined) return err({ kind: 'Unknown', status: null })
    const principal = toSystemPrincipal(accessToken)
    if (principal === null) return err({ kind: 'Forbidden', status: 403 })
    tokens.set(accessToken)
    onSession(accessToken)
    return ok({ principal })
  }

  const performRefresh = async (): Promise<Result<SystemSession>> => {
    const result: Result<SystemTokenResponseDto | undefined> = toResult(
      await client.POST('/api/v1/system/auth/refresh'),
    )
    if (!result.ok) {
      tokens.clear()
      onSession(null)
      return result
    }
    return adoptAccessToken(result.value?.access_token)
  }

  const toOutcome = (accessToken: string): Result<SystemSession> => {
    const principal = toSystemPrincipal(accessToken)
    if (principal === null) return err({ kind: 'Forbidden', status: 403 })
    return ok({ principal })
  }

  return {
    async beginLogin(input) {
      // A new attempt always invalidates whatever the previous one armed.
      clearPending()
      const body: SystemLoginRequestDto = { email: input.email, password: input.password }
      // `| undefined`: a 2xx without a body must fail closed, not throw.
      const result: Result<SystemPreAuthResponseDto | undefined> = toResult(
        await client.POST('/api/v1/system/auth/login', { body }),
      )
      if (!result.ok) return result
      const dto = result.value
      if (dto === undefined) return err({ kind: 'Unknown', status: null })
      pending = { token: dto.pre_auth_token, expiresAt: Date.now() + dto.expires_in * 1000 }
      const challenge: SystemLoginChallenge = { totpEnrolled: dto.totp_enrolled }
      return ok(challenge)
    },

    async verifyTotp(code) {
      const token = livePreAuth()
      if (token === null) return err(preAuthRequired())
      const body: SystemTotpRequestDto = { code }
      const result: Result<SystemTokenResponseDto | undefined> = toResult(
        await client.POST('/api/v1/system/auth/totp', {
          body,
          headers: { [PRE_AUTH_HEADER]: token },
        }),
      )
      if (!result.ok) return settleFailure<SystemSession>(result.error)
      const session = adoptAccessToken(result.value?.access_token)
      // The token is single-use and the session is open: drop it in every case.
      clearPending()
      return session
    },

    async enrollTotp() {
      const token = livePreAuth()
      if (token === null) return err(preAuthRequired())
      const result: Result<SystemEnrollResponseDto | undefined> = toResult(
        await client.POST('/api/v1/system/auth/totp/enroll', {
          headers: { [PRE_AUTH_HEADER]: token },
        }),
      )
      if (!result.ok) return settleFailure<SystemTotpEnrollment>(result.error)
      const dto = result.value
      if (dto === undefined) return err({ kind: 'Unknown', status: null })
      const enrollment: SystemTotpEnrollment = { secret: dto.secret, otpauthUri: dto.otpauth_uri }
      return ok(enrollment)
    },

    async activateTotp(code) {
      const token = livePreAuth()
      if (token === null) return err(preAuthRequired())
      const body: SystemActivateRequestDto = { code }
      const result: Result<SystemActivateResponseDto | undefined> = toResult(
        await client.POST('/api/v1/system/auth/totp/activate', {
          body,
          headers: { [PRE_AUTH_HEADER]: token },
        }),
      )
      if (!result.ok) return settleFailure<SystemRecoveryCodes>(result.error)
      const dto = result.value
      if (dto === undefined) return err({ kind: 'Unknown', status: null })
      const codes: SystemRecoveryCodes = { codes: [...dto.recovery_codes] }
      return ok(codes)
    },

    // Delegates to the session runtime so the guard's bootstrap restore and the
    // reactive 401 retry share one single-flight, cross-tab refresh.
    refresh: () => refreshRunner(),

    performRefresh,
    toOutcome,

    async getProfile() {
      // The SYSTEM-gated alias of `/identity/me`: it carries the staff identity
      // and the effective permission set, and is reachable only with a SYSTEM
      // access token, so a regular token can never read a SYSTEM profile.
      const result = toResult(await client.GET('/api/v1/system/auth/me'))
      if (!result.ok) return result
      const profile = toSystemUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async logout() {
      // A logout ends the pending login too: the pre-authentication token can no
      // longer be used from this tab.
      clearPending()
      // Mark the logout before the request so an in-flight 401 is not mistaken for
      // an expired session (see the regular repository for the full rationale).
      onLogoutStart()
      const result = toResult(await client.POST('/api/v1/system/auth/logout'))
      if (!result.ok) onLogoutFailed()
      // Local state is cleared even when the request fails (e.g. the fail-closed 500).
      tokens.clear()
      onSession(null)
      onLoggedOut()
      return result.ok ? ok(undefined) : result
    },
  }
}
