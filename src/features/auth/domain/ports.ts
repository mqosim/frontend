import type { Result, UserProfile } from '@/shared/domain'
import type { ApiLanguageCode } from '@/features/i18n'

import type {
  AuthOutcome,
  EimzoKey,
  EimzoLinkResult,
  LoginInput,
  RegisterCompleteInput,
  RegisterPending,
  RegisterStartInput,
  WorkspaceChoice,
  WorkspaceList,
} from './entities'

/** A signed challenge request bound for the E-IMZO entry points. */
export interface EimzoSignature {
  readonly challenge: string
  readonly pkcs7: string
}

/**
 * E-IMZO (ЭЦП) signing port. The real adapter drives the local E-IMZO browser
 * client; a dev-only mock implements it for local work, so a production build
 * never ships the mock.
 */
export interface EimzoAuthAdapter {
  readonly kind: 'real' | 'mock'
  /** The signable keys available on this machine. May be empty. */
  listKeys(): Promise<Result<readonly EimzoKey[]>>
  /**
   * Signs `challenge` with `key`. When `key` is omitted the adapter falls back
   * to the first available key.
   */
  sign(challenge: string, key?: EimzoKey): Promise<Result<EimzoSignature>>
}

/**
 * Outbound port for the regular (PERSON/ORG) identity API — the in-scope
 * surface of the current migration step: password login, refresh, logout, the
 * masked profile (`/identity/me`) and tenant switching.
 */
export interface AuthRepository {
  login(input: LoginInput): Promise<Result<AuthOutcome>>
  /** Starts (or restarts) a password+OTP registration and sends the OTP. */
  registerStart(input: RegisterStartInput): Promise<Result<RegisterPending>>
  /** Verifies the OTP, creates the account and adopts the session like login. */
  registerComplete(input: RegisterCompleteInput): Promise<Result<AuthOutcome>>
  /** Rotates the session from the refresh cookie. Single-flight per context. */
  refresh(): Promise<Result<AuthOutcome>>
  /** Revokes the session server-side and always clears the in-memory token. */
  logout(): Promise<Result<void>>
  /** The caller's masked profile and active tenants (`GET /identity/me`). */
  getProfile(): Promise<Result<UserProfile>>
  /**
   * Persists the caller's UI language (`PATCH /identity/me`) and returns the
   * fresh profile. `languageCode` is the canonical backend code (`uz-Cyrl` for
   * Uzbek Cyrillic); the response echoes the saved value.
   */
  updateLanguage(languageCode: ApiLanguageCode): Promise<Result<UserProfile>>
  /** The person's switchable tenants plus the current one (`GET /identity/me`). */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the session to one of the person's tenants. */
  switchTenant(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The signable keys the local E-IMZO client reports. */
  listEimzoKeys(): Promise<Result<readonly EimzoKey[]>>
  /** Signs a fresh challenge with the key and signs in (both cookies are set). */
  loginWithEimzo(key: EimzoKey): Promise<Result<AuthOutcome>>
  /** Signs a fresh challenge with the key and links it to the signed-in account. */
  linkEimzo(key: EimzoKey): Promise<Result<EimzoLinkResult>>
}
