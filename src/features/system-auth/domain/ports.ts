import type { Result, UserProfile } from '@/shared/domain'

import type { SystemLoginInput, SystemSession } from './entities'

/**
 * Outbound port for the SYSTEM auth API. Kept entirely separate from the
 * regular repository: a SYSTEM session never calls `/auth/refresh`, and a
 * regular session never calls `/system/auth/refresh`.
 */
export interface SystemAuthRepository {
  login(input: SystemLoginInput): Promise<Result<SystemSession>>
  /** The SYSTEM caller's own account row (`GET /auth/me`); source of the saved language. */
  getProfile(): Promise<Result<UserProfile>>
  /**
   * Persists the SYSTEM account's UI language (`PUT /system/users/me`) and
   * returns the refreshed profile. The settings page saves through this before
   * switching the locale, so the choice survives sign-out and the router guard
   * re-adopts it at the next sign-in.
   */
  updateLanguage(languageCode: string): Promise<Result<UserProfile>>
  /** Rotates the session from the `system_refresh_token` cookie. Single-flight. */
  refresh(): Promise<Result<SystemSession>>
  /** Revokes the session server-side and always clears the in-memory token. */
  logout(): Promise<Result<void>>
}
