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
} from '../domain/entities'
import type { AuthRepository, EimzoAuthAdapter, EimzoSignature } from '../domain/ports'

export interface AuthUseCaseDeps {
  readonly repository: AuthRepository
  readonly eimzo: EimzoAuthAdapter
}

export interface AuthUseCases {
  login(input: LoginInput): Promise<Result<AuthOutcome>>
  /** Signs a fresh challenge with the selected E-IMZO key and logs in. */
  loginWithSignature(key: EimzoKey): Promise<Result<AuthOutcome>>
  register(input: RegisterInput, key: EimzoKey): Promise<Result<AuthOutcome>>
  /** The E-IMZO keys available on this machine. */
  listEimzoKeys(): Promise<Result<readonly EimzoKey[]>>
  selectWorkspace(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The PERSON's switchable workspaces; the source for the account label and the picker. */
  listWorkspaces(): Promise<Result<WorkspaceList>>
  /** Switches the current PERSON's workspace (personal or an owned org). */
  switchWorkspace(choice: WorkspaceChoice): Promise<Result<AuthOutcome>>
  /** The caller's own account row; the source of the saved account language. */
  getProfile(): Promise<Result<UserProfile>>
  /** Persists the account language and returns the refreshed profile. */
  updateLanguage(languageCode: string): Promise<Result<UserProfile>>
  /** Rotates the caller's password; other sessions are revoked server-side. */
  changePassword(input: ChangePasswordInput): Promise<Result<void>>
  /** Starts (or resends) an email change: code goes to the new address. */
  requestEmailChange(input: ChangeEmailInput): Promise<Result<EmailChangePending>>
  /** Completes the email change with the code, returning the refreshed profile. */
  confirmEmailChange(input: ConfirmEmailChangeInput): Promise<Result<UserProfile>>
  refresh(): Promise<Result<AuthOutcome>>
  logout(): Promise<Result<void>>
}

/**
 * Fetch a challenge and sign it with the given E-IMZO key. Shared by the
 * E-IMZO login and the signature-only register flow.
 */
const signChallenge = async (
  deps: AuthUseCaseDeps,
  key: EimzoKey,
): Promise<Result<EimzoSignature>> => {
  const challenge = await deps.repository.getChallenge()
  if (!challenge.ok) return challenge
  return deps.eimzo.sign(challenge.value, key)
}

export const createAuthUseCases = ({ repository, eimzo }: AuthUseCaseDeps): AuthUseCases => {
  const deps: AuthUseCaseDeps = { repository, eimzo }

  return {
    login: (input) => repository.login(input),

    loginWithSignature: async (key) => {
      const signature = await signChallenge(deps, key)
      if (!signature.ok) return signature
      return repository.loginWithSignature(signature.value)
    },

    register: async (input, key) => {
      // Registration is signature-only: sign the challenge with the key the user
      // picked, then register.
      const signature = await signChallenge(deps, key)
      if (!signature.ok) return signature
      return repository.register({ ...input, ...signature.value })
    },

    listEimzoKeys: () => eimzo.listKeys(),

    selectWorkspace: (choice) => repository.selectWorkspace(choice),
    listWorkspaces: () => repository.listWorkspaces(),
    switchWorkspace: (choice) => repository.switchWorkspace(choice),
    getProfile: () => repository.getProfile(),
    updateLanguage: (languageCode) => repository.updateLanguage(languageCode),
    changePassword: (input) => repository.changePassword(input),
    requestEmailChange: (input) => repository.requestEmailChange(input),
    confirmEmailChange: (input) => repository.confirmEmailChange(input),
    refresh: () => repository.refresh(),
    logout: () => repository.logout(),
  }
}
