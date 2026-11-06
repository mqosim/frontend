import { err, ok } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import { networkError } from '@/shared/infrastructure/http/errors'

import type { Language, TranslationBundle } from '../domain/entities'
import type {
  FetchTranslationsParams,
  LanguageRepository,
  TranslationRepository,
} from '../domain/ports'

export const createTranslationRepository = (client: ApiClient): TranslationRepository => ({
  async fetch({ pages, lang, etag }: FetchTranslationsParams) {
    const call = await client.GET('/api/v1/public/translations', {
      params: { query: { pages: pages.join(','), lang } },
      headers: etag === undefined || etag === null ? undefined : { 'If-None-Match': etag },
    })

    if (call.response === undefined) return err(networkError())
    // 304 and 404 are expected outcomes for this endpoint, not errors.
    if (call.response.status === 304) return ok({ status: 'not-modified' })
    if (call.response.status === 404) return ok({ status: 'not-found' })

    const result = toResult(call)
    if (!result.ok) return result

    const bundles = (result.value ?? {}) as TranslationBundle
    return ok({ status: 'ok', bundles, etag: call.response.headers.get('ETag') })
  },
})

export const createLanguageRepository = (client: ApiClient): LanguageRepository => ({
  async listActive() {
    const result = toResult(await client.GET('/api/v1/public/languages/active'))
    if (!result.ok) return result

    const languages: Language[] = (result.value ?? []).map((item) => ({
      code: item.code ?? '',
      name: item.name ?? '',
      isDefault: item.is_default ?? false,
    }))
    return ok(languages)
  },
})
