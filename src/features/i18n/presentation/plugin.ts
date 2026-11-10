import { createI18n } from 'vue-i18n'
import type { App } from 'vue'

import type { I18nUseCases } from '../application/useCases'
import { fromApiLang } from '../domain/localeCodes'
import { I18nFeatureKey } from './di'
import { fallbackMessages } from './fallbackMessages'
import { createI18nLoader } from './loader'
import {
  applyDocumentLang,
  DEFAULT_LOCALE,
  readStoredLocale,
  useLocaleStore,
} from './stores/localeStore'

export interface I18nFeature {
  install(app: App): void
  /** Loads the route's pages for `lang` (cache-first) and switches to the language actually served. */
  ensure(lang: string, pages: readonly string[]): Promise<void>
  /**
   * Loads `pages` for `lang` and only then makes the language active (store +
   * vue-i18n), so the UI never renders a locale whose phrases are not in place
   * yet. When the backend serves a different language (unknown/inactive code),
   * that actual language becomes active.
   */
  switchTo(lang: string, pages: readonly string[]): Promise<void>
  loadLanguages(): Promise<void>
  currentLocale(): string
}

export const createI18nFeature = (deps: { useCases: I18nUseCases }): I18nFeature => {
  // Annotated rather than inferred: vue-i18n otherwise narrows the locale type to
  // the literal keys of `messages` ("en"), which rejects the runtime `string`.
  const messages: Record<string, Record<string, string>> = { en: fallbackMessages }

  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: readStoredLocale() ?? DEFAULT_LOCALE,
    fallbackLocale: 'en',
    // The embedded English base makes every key resolvable before seeding.
    messages,
    // Backend `word` values contain dots and must be treated as literal keys.
    flatJson: true,
    missingWarn: false,
    fallbackWarn: false,
  })

  const loader = createI18nLoader({
    useCases: deps.useCases,
    i18n,
    onWarning: import.meta.env.DEV ? (message) => console.warn(`[i18n] ${message}`) : undefined,
  })

  const loadLanguages = async (): Promise<void> => {
    const store = useLocaleStore()
    if (store.languagesLoaded) return
    const result = await deps.useCases.loadLanguages()
    if (!result.ok || result.value.length === 0) return
    store.setLanguages(result.value)
  }

  const feature: I18nFeature = {
    install(app) {
      app.use(i18n)
      app.provide(I18nFeatureKey, feature)
    },
    async ensure(lang, pages) {
      // Accept API-shaped codes from callers (e.g. the SYSTEM profile's
      // `uz-Cyrl`) and keep the feature on internal codes.
      const actual = await loader.ensure(fromApiLang(lang), pages)
      i18n.global.locale.value = actual
      // Keep <html lang> in step with the active locale on this path too.
      applyDocumentLang(actual)
      // The backend may have served a different language (unknown/inactive
      // code); reflect the real one in the store, but only when it changed.
      const store = useLocaleStore()
      if (store.locale !== actual) store.setLocale(actual)
    },
    async switchTo(lang, pages) {
      // Load first, switch after: a half-applied locale (changed but not loaded)
      // is never observable. The store write also persists the choice.
      const actual = await loader.ensure(fromApiLang(lang), pages)
      useLocaleStore().setLocale(actual)
      i18n.global.locale.value = actual
    },
    loadLanguages,
    currentLocale: () => useLocaleStore().locale,
  }

  return feature
}
