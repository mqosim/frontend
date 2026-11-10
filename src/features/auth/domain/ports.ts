import type { Result, UserProfile } from '@/shared/domain'

import type {
  AuthOutcome,
  EimzoKey,
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
 *
 * E-IMZO login/link are not part of the current migration step; the port is
 * kept for the preserved adapter implementations and will be wired back into
 * the application layer when that flow is migrated.
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
  /** The person's switchable tenants plus the current one (`GET /identity/me`). */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the session to one of the person's tenants. */
  switchTenant(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
}
