import type { Result, UserProfile } from '@/shared/domain'
import type { ApiLanguageCode } from '@/features/i18n'

import type {
  SystemLoginChallenge,
  SystemLoginInput,
  SystemRecoveryCodes,
  SystemSession,
  SystemTotpEnrollment,
} from '../domain/entities'
import type { SystemAuthRepository } from '../domain/ports'

export interface SystemAuthUseCaseDeps {
  readonly repository: SystemAuthRepository
}

/** The SYSTEM sign-in steps, exposed to presentation exactly as the port defines them. */
export interface SystemAuthUseCases {
  beginLogin(input: SystemLoginInput): Promise<Result<SystemLoginChallenge>>
  verifyTotp(code: string): Promise<Result<SystemSession>>
  enrollTotp(): Promise<Result<SystemTotpEnrollment>>
  activateTotp(code: string): Promise<Result<SystemRecoveryCodes>>
  /** The SYSTEM caller's own account row (identity of the signed-in superadmin). */
  getProfile(): Promise<Result<UserProfile>>
  /** Persists the SYSTEM account's UI language; the fresh profile echoes the code. */
  updateLanguage(languageCode: ApiLanguageCode): Promise<Result<UserProfile>>
  refresh(): Promise<Result<SystemSession>>
  logout(): Promise<Result<void>>
}

export const createSystemAuthUseCases = ({
  repository,
}: SystemAuthUseCaseDeps): SystemAuthUseCases => ({
  beginLogin: (input) => repository.beginLogin(input),
  verifyTotp: (code) => repository.verifyTotp(code),
  enrollTotp: () => repository.enrollTotp(),
  activateTotp: (code) => repository.activateTotp(code),
  getProfile: () => repository.getProfile(),
  updateLanguage: (languageCode) => repository.updateLanguage(languageCode),
  refresh: () => repository.refresh(),
  logout: () => repository.logout(),
})
