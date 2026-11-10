import { err, ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import type { TokenStore } from '@/shared/infrastructure/session/tokenStore'

import type { AuthOutcome } from '../domain/entities'
import type { AuthRepository } from '../domain/ports'
import {
  toAuthOutcome,
  toAuthOutcomeFromMe,
  toRegisterPending,
  toUserProfile,
  toWorkspaceList,
} from './mappers'
import type {
  LoginRequestDto,
  MeResponseDto,
  RegisterCompleteRequestDto,
  RegisterStartRequestDto,
  SwitchTenantRequestDto,
  TokenResponseDto,
} from './mappers'

export interface AuthRepositoryDeps {
  readonly client: ApiClient
  readonly tokens: TokenStore
  /** Runs the single-flight, cross-tab refresh owned by the session runtime. */
  readonly refreshRunner: () => Promise<Result<AuthOutcome>>
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
  /**
   * Reports the current access token (or `null`) and its lifetime so the runtime
   * can schedule renewal from `expires_in` instead of decoding the JWT.
   */
  readonly onSession: (accessToken: string | null, expiresInSec: number | null) => void
  /**
   * Tells sibling tabs that this tab changed the session's scope in place (a
   * tenant switch), so they re-bootstrap into the new tenant.
   */
  readonly onSessionChanged: () => void
  /**
   * Runs `run` while holding the runtime's cross-tab lock (the one shared with
   * refresh). A tenant switch rotates the shared refresh cookie, so it must not
   * run concurrently with a sibling tab's renewal.
   */
  readonly runExclusive: <R>(run: () => Promise<R>) => Promise<R>
}

/** The hooks the session runtime needs from the repository itself. */
export interface AuthSessionPorts {
  /** Network refresh: stores the new token on success, clears it on failure. */
  performRefresh(): Promise<Result<AuthOutcome>>
  /**
   * Resolves a token adopted from a sibling tab into an outcome by reading
   * `GET /identity/me` with it — the tenant and the user id live on the server,
   * and the token response carries neither a user id nor an expiry the runtime
   * can schedule from. Stores the token for the request and clears it when the
   * request fails, so the runtime can fall back to one network refresh.
   */
  adoptSession(accessToken: string, expiresAtMs: number): Promise<Result<AuthOutcome>>
}

export type AuthRepositoryImpl = AuthRepository & AuthSessionPorts

export const createAuthRepository = ({
  client,
  tokens,
  refreshRunner,
  onLoggedOut,
  onLogoutStart,
  onLogoutFailed,
  onSession,
  onSessionChanged,
  runExclusive,
}: AuthRepositoryDeps): AuthRepositoryImpl => {
  /** Stores the access token and its lifetime, then wraps the mapped outcome. */
  const finish = (dto: TokenResponseDto | undefined): Result<AuthOutcome> => {
    const outcome = toAuthOutcome(dto)
    if (dto === undefined || outcome === null) return err({ kind: 'Unknown', status: null })
    tokens.set(dto.access_token)
    onSession(dto.access_token, dto.expires_in)
    return ok(outcome)
  }

  const performRefresh = async (): Promise<Result<AuthOutcome>> => {
    const result = toResult(await client.POST('/api/v1/identity/refresh'))
    if (!result.ok) {
      // A failed refresh means the session is unrecoverable: drop the token.
      tokens.clear()
      onSession(null, null)
      return result
    }
    return finish(result.value)
  }

  // `/identity/me` is read by the profile, the workspace list and the guard's
  // bootstrap. Concurrent readers share one request (no time-based cache): the
  // guard's bootstrap and a simultaneously mounted consumer must not double it.
  let meInFlight: Promise<Result<MeResponseDto | undefined>> | null = null
  const fetchMe = (): Promise<Result<MeResponseDto | undefined>> => {
    if (meInFlight === null) {
      const request = (async (): Promise<Result<MeResponseDto | undefined>> =>
        toResult(await client.GET('/api/v1/identity/me')))()
      meInFlight = request.finally(() => {
        meInFlight = null
      })
    }
    return meInFlight
  }

  return {
    async login(input) {
      if (input.identifier.length === 0) {
        // The form enforces a non-empty identifier; keep the port honest too.
        return err({ kind: 'Validation', status: 400, fields: {} })
      }
      const body: LoginRequestDto = {
        identifier: input.identifier,
        password: input.password,
      }
      const result = toResult(await client.POST('/api/v1/identity/login', { body }))
      if (!result.ok) return result
      return finish(result.value)
    },

    async registerStart(input) {
      if (input.identifier.length === 0) {
        // The form enforces a non-empty identifier; keep the port honest too.
        return err({ kind: 'Validation', status: 400, fields: {} })
      }
      const body: RegisterStartRequestDto = { identifier: input.identifier }
      // `Accept-Language` is the contract's optional OTP-locale header; the
      // generated path declares no header parameter, so it travels through the
      // openapi-fetch `headers` option instead of `params.header`.
      const result = toResult(
        await client.POST('/api/v1/identity/register/start', {
          body,
          headers: { 'Accept-Language': input.otpLocale },
        }),
      )
      if (!result.ok) return result
      const pending = toRegisterPending(result.value)
      if (pending === null) return err({ kind: 'Unknown', status: null })
      return ok(pending)
    },

    async registerComplete(input) {
      const body: RegisterCompleteRequestDto = {
        pending_id: input.pendingId,
        code: input.code,
        password: input.password,
        full_name: input.fullName,
      }
      const result = toResult(
        await client.POST('/api/v1/identity/register/complete', {
          body,
          headers: { 'Accept-Language': input.otpLocale },
        }),
      )
      if (!result.ok) return result
      // Same session adoption path as login: store the access token, schedule
      // renewal from `expires_in`, and return the complete-session outcome. The
      // server sets the refresh cookie on this response (see COOKIE_ENDPOINTS).
      return finish(result.value)
    },

    async switchTenant(choice) {
      const body: SwitchTenantRequestDto = { tenant_id: choice.tenantId }
      // The current access token is injected as a Bearer; the rotated refresh
      // cookie comes back on the same response (see COOKIE_ENDPOINTS). Run it under
      // the runtime's cross-tab lock (shared with refresh) so the rotating cookie is
      // never presented concurrently with a sibling tab's renewal. `finish()` stores
      // the new token and reschedules proactive renewal, still inside the lock.
      const outcome = await runExclusive(async (): Promise<Result<AuthOutcome>> => {
        const result = toResult(await client.POST('/api/v1/identity/switch-tenant', { body }))
        if (!result.ok) return result
        return finish(result.value)
      })
      // Broadcast only after the lock is released: a sibling tab re-bootstraps from
      // the already-rotated cookie, never racing this tab.
      if (outcome.ok) onSessionChanged()
      return outcome
    },

    // Delegates to the session runtime so the guard's bootstrap restore and the
    // reactive 401 retry share one single-flight, cross-tab refresh.
    refresh: () => refreshRunner(),

    performRefresh,

    async adoptSession(accessToken, expiresAtMs) {
      // The runtime holds its cross-tab lock and has already discarded the old
      // token; this GET is the only way to learn the tenant/user id for the adopted
      // token. The runtime suppresses its 401-retry hook for the duration, so a
      // stale token fails here instead of recursing into the same renewal.
      tokens.set(accessToken)
      const result = toResult(await client.GET('/api/v1/identity/me'))
      if (!result.ok) {
        tokens.clear()
        return result
      }
      const outcome = toAuthOutcomeFromMe(result.value, expiresAtMs)
      if (outcome === null) {
        tokens.clear()
        return err({ kind: 'Unknown', status: null })
      }
      return ok(outcome)
    },

    async getProfile() {
      const result = await fetchMe()
      if (!result.ok) return result
      const profile = toUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async listWorkspaces() {
      const result = await fetchMe()
      if (!result.ok) return result
      const list = toWorkspaceList(result.value)
      if (list === null) return err({ kind: 'Unknown', status: null })
      return ok(list)
    },

    async logout() {
      // Mark the logout before the request: a request already in flight may answer
      // 401 once the endpoint has revoked the cookie, and that must not be read as
      // an expired session.
      onLogoutStart()
      const result = toResult(await client.POST('/api/v1/identity/logout'))
      // A failed logout clears the mark so the app can renew again; the local
      // session is still cleared below and the other tabs are told to end too.
      if (!result.ok) onLogoutFailed()
      tokens.clear()
      onSession(null, null)
      onLoggedOut()
      return result.ok ? ok(undefined) : result
    },
  }
}
