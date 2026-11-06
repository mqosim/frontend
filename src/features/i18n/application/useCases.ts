import type { Result } from '@/shared/domain'

import type { Language, TranslationOutcome } from '../domain/entities'
import type {
  FetchTranslationsParams,
  LanguageRepository,
  TranslationRepository,
} from '../domain/ports'

export interface I18nUseCaseDeps {
  readonly translations: TranslationRepository
  readonly languages: LanguageRepository
}

export interface I18nUseCases {
  loadTranslations(input: FetchTranslationsParams): Promise<Result<TranslationOutcome>>
  loadLanguages(): Promise<Result<readonly Language[]>>
}

export const createI18nUseCases = ({ translations, languages }: I18nUseCaseDeps): I18nUseCases => ({
  loadTranslations: (input) => translations.fetch(input),
  loadLanguages: () => languages.listActive(),
})
