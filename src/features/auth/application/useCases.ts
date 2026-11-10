import type { Result, UserProfile } from '@/shared/domain'

import type { AuthOutcome, LoginInput, WorkspaceChoice, WorkspaceList } from '../domain/entities'
import type { AuthRepository } from '../domain/ports'

export interface AuthUseCaseDeps {
  readonly repository: AuthRepository
}

/**
 * The regular-context identity surface for the current migration step: password
 * login, refresh, logout, the masked profile and tenant switching. E-IMZO,
 * registration, password/email change and language persistence are not part of
 * this step and are preserved in git history.
 */
export interface AuthUseCases {
  login(input: LoginInput): Promise<Result<AuthOutcome>>
  /** The caller's masked profile; the source of the display name. */
  getProfile(): Promise<Result<UserProfile>>
  /** The person's switchable tenants; the source for the account label and picker. */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the session to one of the person's tenants. */
  switchTenant(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  refresh(): Promise<Result<AuthOutcome>>
  logout(): Promise<Result<void>>
}

export const createAuthUseCases = ({ repository }: AuthUseCaseDeps): AuthUseCases => ({
  login: (input) => repository.login(input),
  getProfile: () => repository.getProfile(),
  listWorkspaces: () => repository.listWorkspaces(),
  switchTenant: (choice) => repository.switchTenant(choice),
  refresh: () => repository.refresh(),
  logout: () => repository.logout(),
})
