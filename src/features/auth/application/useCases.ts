import type { Result, UserProfile } from '@/shared/domain'

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
} from '../domain/entities'
import type { AuthRepository } from '../domain/ports'

export interface AuthUseCaseDeps {
  readonly repository: AuthRepository
}

/**
 * The regular-context identity surface: password login, password+OTP
 * registration, E-IMZO login and key linking, refresh, logout, the masked
 * profile and tenant switching. Password/email change is not part of the
 * contract and is preserved in git history.
 */
export interface AuthUseCases {
  login(input: LoginInput): Promise<Result<AuthOutcome>>
  /** Starts (or restarts) a password+OTP registration and sends the OTP. */
  registerStart(input: RegisterStartInput): Promise<Result<RegisterPending>>
  /** Verifies the OTP, creates the account and adopts the session like login. */
  registerComplete(input: RegisterCompleteInput): Promise<Result<AuthOutcome>>
  /** The caller's masked profile; the source of the display name. */
  getProfile(): Promise<Result<UserProfile>>
  /** The person's switchable tenants; the source for the account label and picker. */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the session to one of the person's tenants. */
  switchTenant(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The signable keys the local E-IMZO client reports. */
  listEimzoKeys(): Promise<Result<readonly EimzoKey[]>>
  /** Signs a fresh challenge with the key and signs in. */
  loginWithEimzo(key: EimzoKey): Promise<Result<AuthOutcome>>
  /** Signs a fresh challenge with the key and links it to the account. */
  linkEimzo(key: EimzoKey): Promise<Result<EimzoLinkResult>>
  refresh(): Promise<Result<AuthOutcome>>
  logout(): Promise<Result<void>>
}

export const createAuthUseCases = ({ repository }: AuthUseCaseDeps): AuthUseCases => ({
  login: (input) => repository.login(input),
  registerStart: (input) => repository.registerStart(input),
  registerComplete: (input) => repository.registerComplete(input),
  getProfile: () => repository.getProfile(),
  listWorkspaces: () => repository.listWorkspaces(),
  switchTenant: (choice) => repository.switchTenant(choice),
  listEimzoKeys: () => repository.listEimzoKeys(),
  loginWithEimzo: (key) => repository.loginWithEimzo(key),
  linkEimzo: (key) => repository.linkEimzo(key),
  refresh: () => repository.refresh(),
  logout: () => repository.logout(),
})
