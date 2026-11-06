import type { I18n } from 'vue-i18n'

import type { I18nUseCases } from '../application/useCases'
import type { TranslationBundle, TranslationMap } from '../domain/entities'

const TIMEOUT_MS = 8000

interface CacheEntry {
  readonly messages: TranslationMap
  readonly etag: string | null
}

export interface I18nLoader {
  /** Loads `pages` for `lang` unless already cached; never rejects. */
  ensure(lang: string, pages: readonly string[]): Promise<void>
}

export interface I18nLoaderDeps {
  readonly useCases: I18nUseCases
  readonly i18n: I18n
  readonly onWarning?: (message: string) => void
}

const withTimeout = async <T>(work: Promise<T>, ms: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export const createI18nLoader = ({ useCases, i18n, onWarning }: I18nLoaderDeps): I18nLoader => {
  // In-memory cache keyed by (lang, page); `word` values are globally unique, so
  // merging the inner maps of several pages into one flat locale message is safe.
  const cache = new Map<string, CacheEntry>()
  const cacheKey = (lang: string, page: string): string => `${lang}::${page}`

  const warn = (message: string): void => onWarning?.(message)

  const mergeInto = (lang: string, bundle: TranslationBundle): void => {
    const merged: Record<string, string> = {
      ...(i18n.global.getLocaleMessage(lang) as Record<string, string>),
    }
    for (const pageMessages of Object.values(bundle)) Object.assign(merged, pageMessages)
    i18n.global.setLocaleMessage(lang, merged)
  }

  const remember = (lang: string, bundle: TranslationBundle, etag: string | null): void => {
    for (const [slug, messages] of Object.entries(bundle)) {
      cache.set(cacheKey(lang, slug), { messages, etag })
    }
  }

  const fetchPages = async (lang: string, pages: readonly string[], etag: string | null) => {
    const outcome = await withTimeout(useCases.loadTranslations({ pages, lang, etag }), TIMEOUT_MS)
    if (outcome === null) {
      warn(`Translations for ${lang} timed out; using embedded fallback.`)
      return null
    }
    if (!outcome.ok) {
      warn(`Translations for ${lang} failed (${outcome.error.kind}); using embedded fallback.`)
      return null
    }
    return outcome.value
  }

  const loadSinglePage = async (lang: string, page: string): Promise<void> => {
    const outcome = await fetchPages(lang, [page], null)
    if (outcome === null || outcome.status === 'not-found') {
      warn(`No translations for "${page}" (${lang}); using embedded fallback.`)
      return
    }
    if (outcome.status === 'not-modified') return
    remember(lang, outcome.bundles, outcome.etag)
    mergeInto(lang, outcome.bundles)
  }

  return {
    async ensure(lang, pages) {
      const requested = [...new Set(pages)]
      const missing = requested.filter((page) => !cache.has(cacheKey(lang, page)))
      if (missing.length === 0) return

      const outcome = await fetchPages(lang, missing, null)
      if (outcome === null) return

      if (outcome.status === 'not-found') {
        // The endpoint 404s the whole request when ANY slug is unknown, so retry
        // each slug alone and keep embedded strings for the ones still missing.
        await Promise.all(missing.map((page) => loadSinglePage(lang, page)))
        return
      }
      if (outcome.status === 'not-modified') return

      remember(lang, outcome.bundles, outcome.etag)
      mergeInto(lang, outcome.bundles)
    },
  }
}
