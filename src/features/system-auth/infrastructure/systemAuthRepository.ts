import { err, ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import type { TokenStore } from '@/shared/infrastructure/session/tokenStore'

import type { SystemSession } from '../domain/entities'
import type { SystemAuthRepository } from '../domain/ports'
import { toSystemPrincipal, toSystemUserProfile } from './mappers'
import type {
  SystemLoginRequestDto,
  SystemLogoutRequestDto,
  SystemUpdateUserLanguageRequestDto,
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

export const createSystemAuthRepository = ({
  client,
  tokens,
  refreshRunner,
  onLoggedOut,
  onLogoutStart,
  onLogoutFailed,
  onSession,
}: SystemAuthRepositoryDeps): SystemAuthRepositoryImpl => {
  const finish = (accessToken: string | undefined): Result<SystemSession> => {
    if (accessToken === undefined) return err({ kind: 'Unknown', status: null })
    const principal = toSystemPrincipal(accessToken)
    if (principal === null) return err({ kind: 'Forbidden', status: 403 })
    tokens.set(accessToken)
    onSession(accessToken)
    return ok({ principal })
  }

  const performRefresh = async (): Promise<Result<SystemSession>> => {
    const result = toResult(await client.POST('/api/v1/system/auth/refresh'))
    if (!result.ok) {
      tokens.clear()
      onSession(null)
      return result
    }
    return finish(result.value?.access_token)
  }

  const toOutcome = (accessToken: string): Result<SystemSession> => {
    const principal = toSystemPrincipal(accessToken)
    if (principal === null) return err({ kind: 'Forbidden', status: 403 })
    return ok({ principal })
  }

  return {
    async login(input) {
      const body: SystemLoginRequestDto = { email: input.email, password: input.password }
      const result = toResult(await client.POST('/api/v1/system/auth/login', { body }))
      if (!result.ok) return result
      return finish(result.value?.tokens?.access_token)
    },

    // Delegates to the session runtime so the guard's bootstrap restore and the
    // reactive 401 retry share one single-flight, cross-tab refresh.
    refresh: () => refreshRunner(),

    performRefresh,
    toOutcome,

    async getProfile() {
      // The SYSTEM-gated alias of `/auth/me`: it has an identical contract but is
      // reachable only with a SYSTEM access token, so a regular token can never
      // be used to read a SYSTEM profile.
      const result = toResult(await client.GET('/api/v1/system/auth/me'))
      if (!result.ok) return result
      const profile = toSystemUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async updateLanguage(languageCode) {
      // The SYSTEM-gated alias of `PUT /master/users/me`: identical contract,
      // reachable only with a SYSTEM access token. The settings page persists
      // through this BEFORE switching the locale, so the router guard re-adopts
      // the saved account language at the next sign-in.
      const body: SystemUpdateUserLanguageRequestDto = { language_code: languageCode }
      const result = toResult(await client.PUT('/api/v1/system/users/me', { body }))
      if (!result.ok) return result
      const profile = toSystemUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async logout() {
      // `all_devices` is false: only this device is logged out. The generated
      // type marks it required even though the spec makes the body optional.
      const body: SystemLogoutRequestDto = { all_devices: false }
      // Mark the logout before the request so an in-flight 401 is not mistaken for
      // an expired session (see the regular repository for the full rationale).
      onLogoutStart()
      const result = toResult(await client.POST('/api/v1/system/auth/logout', { body }))
      if (!result.ok) onLogoutFailed()
      // Local state is cleared even when the request fails (e.g. the fail-closed 500).
      tokens.clear()
      onSession(null)
      onLoggedOut()
      return result.ok ? ok(undefined) : result
    },
  }
}
