import type { Result, UserProfile } from '@/shared/domain'

import type {
  AuthOutcome,
  ChangeEmailInput,
  ChangePasswordInput,
  ConfirmEmailChangeInput,
  EimzoKey,
  EmailChangePending,
  LoginInput,
  RegisterInput,
  WorkspaceChoice,
  WorkspaceList,
} from './entities'

/** A signed challenge request bound for `/auth/register`. */
export interface EimzoSignature {
  readonly challenge: string
  readonly pkcs7: string
}

/**
 * E-IMZO (ЭЦП) signing port. The real adapter drives the local E-IMZO browser
 * client; a dev-only mock implements it for local work, so a production build
 * never ships the mock.
 *
 * Every failure is returned as an `AppError` of kind `Eimzo` (see
 * `EimzoFailureCode`): the desktop app being absent, no keys, a missing
 * domain API-KEY, a user cancel or a wrong PIN.
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

/** Outbound port for the regular (PERSON/ORG) auth API. */
export interface AuthRepository {
  getChallenge(): Promise<Result<string>>
  register(input: RegisterInput & EimzoSignature): Promise<Result<AuthOutcome>>
  login(input: LoginInput): Promise<Result<AuthOutcome>>
  /** Authenticates with an E-IMZO signature instead of a password. */
  loginWithSignature(signature: EimzoSignature): Promise<Result<AuthOutcome>>
  selectWorkspace(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The PERSON's switchable workspaces plus the current one (`GET /auth/workspaces`). */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the current PERSON's workspace, returning a fresh done session. */
  switchWorkspace(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The caller's own account row (`GET /auth/me`); source of the saved language. */
  getProfile(): Promise<Result<UserProfile>>
  /** Persists the account language and returns the refreshed profile. */
  updateLanguage(languageCode: string): Promise<Result<UserProfile>>
  /**
   * Rotates the caller's password (`POST /auth/me/password`). A 401 means the
   * current password was rejected; other sessions are revoked server-side while
   * the caller's own survives via the refresh cookie.
   */
  changePassword(input: ChangePasswordInput): Promise<Result<void>>
  /**
   * Starts (or resends) an email change (`POST /auth/me/email/change`): verifies
   * the current password, then delivers a code to the NEW address.
   */
  requestEmailChange(input: ChangeEmailInput): Promise<Result<EmailChangePending>>
  /**
   * Completes the pending email change with the code (`POST /auth/me/email/confirm`),
   * returning the refreshed profile with the verified address.
   */
  confirmEmailChange(input: ConfirmEmailChangeInput): Promise<Result<UserProfile>>
  /** Rotates the session from the refresh cookie. Single-flight per context. */
  refresh(): Promise<Result<AuthOutcome>>
  /** Revokes the session server-side and always clears the in-memory token. */
  logout(): Promise<Result<void>>
}
