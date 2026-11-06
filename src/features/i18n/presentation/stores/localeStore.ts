import { defineStore } from 'pinia'

import type { Language } from '../../domain/entities'

const STORAGE_KEY = 'app.lang'

/** Seeded backend default. */
export const DEFAULT_LOCALE = 'uz'

/** localStorage is only used for the language code — never for tokens. */
export const readStoredLocale = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Locale code -> BCP 47 value for `<html lang>`. Uzbek Cyrillic maps to `uz-Cyrl`
 * so the document language follows the script actually rendered, while the
 * internal code stays `uzc`; any unlisted code is used verbatim.
 */
const HTML_LANG: Readonly<Record<string, string>> = {
  uz: 'uz',
  uzc: 'uz-Cyrl',
  ru: 'ru',
  en: 'en',
}

export const applyDocumentLang = (code: string): void => {
  document.documentElement.lang = HTML_LANG[code.trim().toLowerCase()] ?? code
}

// Startup: reflect the stored (or default) locale before the first render.
applyDocumentLang(readStoredLocale() ?? DEFAULT_LOCALE)

interface LocaleState {
  locale: string
  languages: Language[]
  languagesLoaded: boolean
}

export const useLocaleStore = defineStore('locale', {
  state: (): LocaleState => ({
    locale: readStoredLocale() ?? DEFAULT_LOCALE,
    languages: [],
    languagesLoaded: false,
  }),
  actions: {
    setLocale(locale: string) {
      this.locale = locale
      applyDocumentLang(locale)
      try {
        window.localStorage.setItem(STORAGE_KEY, locale)
      } catch {
        // Storage can be unavailable (private mode); the in-memory value stands.
      }
    },
    setLanguages(languages: readonly Language[]) {
      this.languages = [...languages]
      this.languagesLoaded = true
    },
  },
})

export const getCurrentLocale = (): string => useLocaleStore().locale
