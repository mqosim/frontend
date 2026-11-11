import type { Result, UserProfile } from '@/shared/domain'
import type { ApiLanguageCode } from '@/features/i18n'

import type {
  SystemLoginChallenge,
  SystemLoginInput,
  SystemRecoveryCodes,
  SystemSession,
  SystemTotpEnrollment,
} from './entities'

/**
 * Outbound port for the SYSTEM auth API. Kept entirely separate from the
 * regular repository: a SYSTEM session never calls `/identity/refresh`, and a
 * regular session never calls `/system/auth/refresh`.
 *
 * The contract is a two-step sign-in: `beginLogin` verifies the password and
 * only *arms* the second factor, so it returns no session. The pre-authenticated
 * state stays inside the implementation; the caller never handles its token.
 */
export interface SystemAuthRepository {
  /** Step 1: verify the password. Never opens a session and never stores a token. */
  beginLogin(input: SystemLoginInput): Promise<Result<SystemLoginChallenge>>
  /** Step 2: verify a TOTP (or recovery) code and open the session. */
  verifyTotp(code: string): Promise<Result<SystemSession>>
  /** Start TOTP enrollment for the account the password step authenticated. */
  enrollTotp(): Promise<Result<SystemTotpEnrollment>>
  /** Confirm the enrollment; the recovery codes are returned exactly once. */
  activateTotp(code: string): Promise<Result<SystemRecoveryCodes>>
  /** The SYSTEM caller's own account row (`GET /system/auth/me`). */
  getProfile(): Promise<Result<UserProfile>>
  /**
   * Persists the SYSTEM account's interface language (`PATCH /system/auth/me`)
   * and returns the fresh profile. `languageCode` is the canonical backend
   * code; the response echoes the saved value. SYSTEM has no notification
   * preferences, so this write is the whole persistence step.
   */
  updateLanguage(languageCode: ApiLanguageCode): Promise<Result<UserProfile>>
  /** Rotates the session from the `system_refresh_token` cookie. Single-flight. */
  refresh(): Promise<Result<SystemSession>>
  /** Revokes the session server-side and always clears the in-memory token. */
  logout(): Promise<Result<void>>
}
