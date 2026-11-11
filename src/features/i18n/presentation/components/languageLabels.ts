/**
 * Display metadata for the language switcher: the native language names and
 * the flag lookup, shared by every selector surface (anonymous header, landing,
 * authenticated Settings — all render the one `LanguageSwitcher`).
 *
 * Language names are shown in their own language regardless of the active UI
 * language: they are never translated. The source of truth is the active
 * languages API's `nativeName` (mapped into `Language`); the `NATIVE_NAMES`
 * table below is the built-in fallback with the same values, so the labels stay
 * correct even when the API list has not loaded or omits the field.
 */

import { fromApiLang } from '../../domain/localeCodes'

export interface LanguageLabel {
  /** Visible short label that replaces the uppercased API code. */
  readonly label: string
  /** `lang` attribute for the label (`uzc` for Uzbek Cyrillic). */
  readonly lang: string
}

/** Short labels shown next to the flag in the compact (header) selector. */
const LABELS: Readonly<Record<string, LanguageLabel>> = {
  uz: { label: "O'z", lang: 'uz' },
  uzc: { label: 'Ўз', lang: 'uzc' },
  en: { label: 'En', lang: 'en' },
  ru: { label: 'Ру', lang: 'ru' },
}

/**
 * Native full names, keyed by internal code. `uzc` is Uzbek Cyrillic — the
 * same language as `uz` written in its own script, hence the Cyrillic label.
 */
const NATIVE_NAMES: Readonly<Record<string, string>> = {
  uz: "O'zbekcha",
  uzc: 'Ўзбекча',
  ru: 'Русский',
  en: 'English',
}

/** Normalises any code form (`uz-Cyrl`, `uz_Cyrl`, `uzc`) to the internal key. */
const toInternalKey = (code: string): string => fromApiLang(code.trim()).toLowerCase()

/**
 * Short label for a language code. Unknown codes fall back to the uppercased
 * code — the previous display — so nothing breaks for future languages.
 */
export const languageLabelFor = (code: string): LanguageLabel =>
  LABELS[toInternalKey(code)] ?? { label: code.trim().toUpperCase(), lang: code.trim() }

/**
 * The language's native full name (e.g. `Ўзбекча` for Uzbek Cyrillic), for the
 * full-label selector variants. Unknown codes return `null` so the caller can
 * fall back to its own source (the API's `nativeName`).
 */
export const nativeNameFor = (code: string): string | null =>
  NATIVE_NAMES[toInternalKey(code)] ?? null
