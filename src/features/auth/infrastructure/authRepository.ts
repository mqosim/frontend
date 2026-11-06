import { err, ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import type { TokenStore } from '@/shared/infrastructure/session/tokenStore'

import type {
  AuthOutcome,
  ChangeEmailInput,
  ChangePasswordInput,
  ConfirmEmailChangeInput,
  LoginInput,
  RegisterInput,
  WorkspaceChoice,
} from '../domain/entities'
import type { AuthRepository, EimzoSignature } from '../domain/ports'
import {
  toAuthOutcome,
  toEmailChangePending,
  toPrincipal,
  toTokenPairOutcome,
  toUserProfile,
  toWorkspaceList,
} from './mappers'
import type {
  AuthResultDto,
  ChangeEmailRequestDto,
  ChangePasswordRequestDto,
  ConfirmEmailChangeRequestDto,
  LoginRequestDto,
  LoginWithSignatureRequestDto,
  RegisterRequestDto,
  SelectWorkspaceRequestDto,
  SwitchWorkspaceRequestDto,
  UpdateUserLanguageRequestDto,
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
  /** Reports the current access token (or `null`) so the runtime can schedule renewal. */
  readonly onSession: (accessToken: string | null) => void
  /**
   * Tells sibling tabs that this tab changed the session's scope in place (a
   * workspace switch), so they re-bootstrap into the new workspace.
   */
  readonly onSessionChanged: () => void
  /**
   * Runs `run` while holding the runtime's cross-tab lock (the one shared with
   * refresh). A workspace switch rotates the shared refresh cookie, so it must not
   * run concurrently with a sibling tab's renewal.
   */
  readonly runExclusive: <R>(run: () => Promise<R>) => Promise<R>
}

/** The two hooks the session runtime needs from the repository itself. */
export interface AuthSessionPorts {
  /** Network refresh: stores the new token on success, clears it on failure. */
  performRefresh(): Promise<Result<AuthOutcome>>
  /** Maps an access token adopted from another tab to an outcome. */
  toOutcome(accessToken: string): Result<AuthOutcome>
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
  /** Stores the access token, notifies the runtime, and wraps the mapped outcome. */
  const finish = (
    accessToken: string | undefined,
    outcome: AuthOutcome | null,
  ): Result<AuthOutcome> => {
    if (accessToken === undefined || outcome === null) return err({ kind: 'Unknown', status: null })
    tokens.set(accessToken)
    onSession(accessToken)
    return ok(outcome)
  }

  const outcomeFromAuthResult = (data: AuthResultDto | undefined): Result<AuthOutcome> =>
    finish(data?.tokens?.access_token, toAuthOutcome(data))

  const performRefresh = async (): Promise<Result<AuthOutcome>> => {
    const result = toResult(await client.POST('/api/v1/auth/refresh'))
    if (!result.ok) {
      // A failed refresh means the session is unrecoverable: drop the token.
      tokens.clear()
      onSession(null)
      return result
    }
    return finish(result.value?.access_token, toTokenPairOutcome(result.value))
  }

  const toOutcome = (accessToken: string): Result<AuthOutcome> => {
    const principal = toPrincipal(accessToken)
    if (principal === null) return err({ kind: 'Unknown', status: null })
    return ok({ kind: 'authenticated', principal })
  }

  return {
    async getChallenge() {
      const result = toResult(await client.GET('/api/v1/auth/challenge'))
      if (!result.ok) return result
      const challenge = result.value?.challenge
      if (challenge === undefined) return err({ kind: 'Unknown', status: null })
      return ok(challenge)
    },

    async register(input: RegisterInput & EimzoSignature) {
      const body: RegisterRequestDto = {
        challenge: input.challenge,
        pkcs7: input.pkcs7,
        email: input.email,
        password: input.password,
        phone_number: input.phoneNumber,
      }
      if (input.languageCode !== undefined && input.languageCode.length > 0) {
        body.language_code = input.languageCode
      }
      const result = toResult(await client.POST('/api/v1/auth/register', { body }))
      if (!result.ok) return result
      return outcomeFromAuthResult(result.value)
    },

    async login(input: LoginInput) {
      const hasEmail = input.email !== undefined && input.email.length > 0
      const hasPhone = input.phoneNumber !== undefined && input.phoneNumber.length > 0
      if (hasEmail === hasPhone) {
        // Exactly one identifier is required; the form enforces this too.
        return err({ kind: 'Validation', status: 400, fields: {} })
      }

      const body: LoginRequestDto = { password: input.password }
      if (hasEmail) body.email = input.email
      else body.phone_number = input.phoneNumber

      const result = toResult(await client.POST('/api/v1/auth/login', { body }))
      if (!result.ok) return result
      return outcomeFromAuthResult(result.value)
    },

    async loginWithSignature(signature: EimzoSignature) {
      const body: LoginWithSignatureRequestDto = {
        challenge: signature.challenge,
        pkcs7: signature.pkcs7,
      }
      // Like password login, this sets the httpOnly refresh cookie.
      const result = toResult(await client.POST('/api/v1/auth/login_with_signature', { body }))
      if (!result.ok) return result
      return outcomeFromAuthResult(result.value)
    },

    async selectWorkspace(choice: WorkspaceChoice) {
      const body: SelectWorkspaceRequestDto =
        choice.kind === 'org'
          ? { workspace: 'org', org_id: choice.orgId }
          : { workspace: 'personal' }
      // The pending-workspace access token is injected as a Bearer by the client.
      const result = toResult(await client.POST('/api/v1/auth/select_workspace', { body }))
      if (!result.ok) return result
      return outcomeFromAuthResult(result.value)
    },

    async listWorkspaces() {
      const result = toResult(await client.GET('/api/v1/auth/workspaces'))
      if (!result.ok) return result
      return ok(toWorkspaceList(result.value))
    },

    async switchWorkspace(choice: WorkspaceChoice) {
      const body: SwitchWorkspaceRequestDto =
        choice.kind === 'org'
          ? { workspace: 'org', org_id: choice.orgId }
          : { workspace: 'personal' }
      // The current access token is injected as a Bearer; the rotated refresh
      // cookie comes back on the same response (see COOKIE_ENDPOINTS). Run it under
      // the runtime's cross-tab lock (shared with refresh) so the rotating cookie is
      // never presented concurrently with a sibling tab's renewal. `finish()` stores
      // the new token and reschedules proactive renewal, still inside the lock.
      const outcome = await runExclusive(async (): Promise<Result<AuthOutcome>> => {
        const result = toResult(await client.POST('/api/v1/auth/switch_workspace', { body }))
        if (!result.ok) return result
        return outcomeFromAuthResult(result.value)
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
    toOutcome,

    async getProfile() {
      const result = toResult(await client.GET('/api/v1/auth/me'))
      if (!result.ok) return result
      const profile = toUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async updateLanguage(languageCode) {
      const body: UpdateUserLanguageRequestDto = { language_code: languageCode }
      const result = toResult(await client.PUT('/api/v1/master/users/me', { body }))
      if (!result.ok) return result
      const profile = toUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    // Bearer-only endpoints (no cookie in COOKIE_ENDPOINTS): the identity comes
    // from the access token, and the httpOnly refresh cookie still rides along
    // same-origin, which is what lets the password change keep this session.
    // A wrong current password answers 401 like login; the client's single
    // refresh-and-retry recovers an expired access token and lets the retry
    // surface the credential failure instead.
    async changePassword(input: ChangePasswordInput) {
      const body: ChangePasswordRequestDto = {
        current_password: input.currentPassword,
        new_password: input.newPassword,
      }
      // 204 with no body; `toResult` yields `ok(undefined)`.
      const result = toResult<void>(await client.POST('/api/v1/auth/me/password', { body }))
      return result
    },

    async requestEmailChange(input: ChangeEmailInput) {
      const body: ChangeEmailRequestDto = {
        new_email: input.newEmail,
        current_password: input.currentPassword,
      }
      const result = toResult(await client.POST('/api/v1/auth/me/email/change', { body }))
      if (!result.ok) return result
      return ok(toEmailChangePending(result.value))
    },

    async confirmEmailChange(input: ConfirmEmailChangeInput) {
      const body: ConfirmEmailChangeRequestDto = { code: input.code }
      const result = toResult(await client.POST('/api/v1/auth/me/email/confirm', { body }))
      if (!result.ok) return result
      const profile = toUserProfile(result.value)
      if (profile === null) return err({ kind: 'Unknown', status: null })
      return ok(profile)
    },

    async logout() {
      // Mark the logout before the request: a request already in flight (e.g. the
      // Settings page's `/auth/me`) may answer 401 once the endpoint has revoked
      // the cookie, and that must not be read as an expired session.
      onLogoutStart()
      const result = toResult(await client.POST('/api/v1/auth/logout'))
      // A failed logout clears the mark so the app can renew again; the local
      // session is still cleared below and the other tabs are told to end too.
      if (!result.ok) onLogoutFailed()
      tokens.clear()
      onSession(null)
      onLoggedOut()
      return result.ok ? ok(undefined) : result
    },
  }
}
