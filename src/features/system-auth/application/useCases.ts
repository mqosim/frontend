import type { Result, UserProfile } from '@/shared/domain'

import type { SystemLoginInput, SystemSession } from '../domain/entities'
import type { SystemAuthRepository } from '../domain/ports'

export interface SystemAuthUseCaseDeps {
  readonly repository: SystemAuthRepository
}

export interface SystemAuthUseCases {
  login(input: SystemLoginInput): Promise<Result<SystemSession>>
  /** The SYSTEM caller's own account row; the source of the saved account language. */
  getProfile(): Promise<Result<UserProfile>>
  /** Persists the SYSTEM account's language before the settings page flips the locale. */
  updateLanguage(languageCode: string): Promise<Result<UserProfile>>
  refresh(): Promise<Result<SystemSession>>
  logout(): Promise<Result<void>>
}

export const createSystemAuthUseCases = ({
  repository,
}: SystemAuthUseCaseDeps): SystemAuthUseCases => ({
  login: (input) => repository.login(input),
  getProfile: () => repository.getProfile(),
  updateLanguage: (languageCode) => repository.updateLanguage(languageCode),
  refresh: () => repository.refresh(),
  logout: () => repository.logout(),
})
