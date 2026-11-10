import { err, ok } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'
import { networkError } from '@/shared/infrastructure/http/errors'

import type { TranslationMap } from '../domain/entities'
import { fromApiLang, toApiLang } from '../domain/localeCodes'
import type {
  FetchTranslationsParams,
  LanguageRepository,
  TranslationRepository,
} from '../domain/ports'

export const createTranslationRepository = (client: ApiClient): TranslationRepository => ({
  async fetch({ pages, lang, etag }: FetchTranslationsParams) {
    const call = await client.GET('/api/v1/public/translations', {
      // `page` is the canonical repeatable parameter; openapi-fetch serializes
      // the array as `page=a&page=b`.
      params: { query: { page: [...pages], lang: toApiLang(lang) } },
      headers: etag === undefined || etag === null ? undefined : { 'If-None-Match': etag },
    })

    if (call.response === undefined) return err(networkError())
    // 304 and 404 are expected outcomes for this endpoint, not errors.
    if (call.response.status === 304) return ok({ status: 'not-modified' })
    if (call.response.status === 404) return ok({ status: 'not-found' })

    const result = toResult(call)
    if (!result.ok) return result

    // The body is already `{ page: { word: text } }`. Copy each page map so the
    // domain never aliases the parsed API body (and no cast is needed).
    const messages = result.value?.messages
    const bundles: Record<string, TranslationMap> = {}
    if (messages !== undefined) {
      for (const [page, words] of Object.entries(messages)) {
        bundles[page] = { ...words }
      }
    }

    // An unknown/inactive language answers 200 with the default content; adopt
    // the code actually served so the loader caches the real locale. An empty
    // 200 body keeps the requested language and empty bundles.
    const actualLang = fromApiLang(result.value?.lang ?? lang)
    return ok({
      status: 'ok',
      lang: actualLang,
      bundles,
      etag: call.response.headers.get('ETag'),
    })
  },
})

export const createLanguageRepository = (client: ApiClient): LanguageRepository => ({
  async listActive() {
    const result = toResult(await client.GET('/api/v1/public/languages/active'))
    if (!result.ok) return result

    const { languages } = result.value ?? { languages: [] }
    return ok(
      languages.map((item) => ({
        // The UI keys flags/labels/selection by internal code (`uzc`), not the
        // API's `uz-Cyrl`.
        code: fromApiLang(item.code),
        name: item.name,
        isDefault: item.is_default,
      })),
    )
  },
})
