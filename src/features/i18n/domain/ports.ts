import type { Result } from '@/shared/domain'

import type { Language, TranslationOutcome } from './entities'

export interface FetchTranslationsParams {
  readonly pages: readonly string[]
  readonly lang: string
  /** Sent as `If-None-Match`; a match yields `{ status: 'not-modified' }`. */
  readonly etag?: string | null
}

export interface TranslationRepository {
  fetch(params: FetchTranslationsParams): Promise<Result<TranslationOutcome>>
}

export interface LanguageRepository {
  listActive(): Promise<Result<readonly Language[]>>
}
