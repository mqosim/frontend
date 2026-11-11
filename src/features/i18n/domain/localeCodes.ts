/**
 * The app keeps its own locale codes (`uz`, `uzc`, `ru`, `en`), while the
 * public i18n endpoints speak canonical BCP 47 (`uz-Cyrl` for Uzbek Cyrillic).
 * These two helpers are the only place that translates between the two, so the
 * store, switcher, flags and labels only ever see internal codes.
 */

const API_BY_INTERNAL: Readonly<Record<string, string>> = {
  uzc: 'uz-Cyrl',
}

const INTERNAL_BY_API: Readonly<Record<string, string>> = {
  'uz-cyrl': 'uzc',
  'uz-cyrl-uz': 'uzc',
  uzc: 'uzc',
}

/**
 * The language codes the backend accepts for the account's saved language
 * (`MeLanguageUpdateRequest.language_code` and its SYSTEM twin). Hand-written
 * as the i18n feature's domain union; the auth infrastructure derives the
 * schema's own union and proves the two identical at compile time, so a
 * contract change breaks the build instead of shipping an unknown code.
 */
export type ApiLanguageCode = 'uz' | 'uz-Cyrl' | 'ru' | 'en'

/** Internal locale code -> the canonical code the public i18n endpoints accept. */
export const toApiLang = (code: string): string => {
  const trimmed = code.trim()
  return API_BY_INTERNAL[trimmed.toLowerCase()] ?? trimmed
}

/** Canonical spelling by lowercase lookup, so case variants resolve cleanly. */
const CANONICAL_API_LANGUAGE: Readonly<Record<string, ApiLanguageCode>> = {
  uz: 'uz',
  'uz-cyrl': 'uz-Cyrl',
  ru: 'ru',
  en: 'en',
}

/**
 * Internal/arbitrary language code -> the canonical code the backend accepts
 * for the saved-language endpoints, or `null` when the value is unsupported
 * (`toApiLang` first, so the internal `uzc` maps to `uz-Cyrl`). Callers must
 * omit the request field or show a validation error instead of sending `null`.
 */
export const toApiLanguageCode = (code: string): ApiLanguageCode | null =>
  CANONICAL_API_LANGUAGE[toApiLang(code.trim()).toLowerCase()] ?? null

/**
 * API language code -> the app's internal locale code. The Cyrillic aliases
 * (`uz-Cyrl`, `uz-Cyrl-UZ`, `uzc`) normalize to `uzc`; every other code passes
 * through unchanged.
 */
export const fromApiLang = (code: string): string => {
  const trimmed = code.trim()
  return INTERNAL_BY_API[trimmed.toLowerCase()] ?? trimmed
}
