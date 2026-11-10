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

/** Internal locale code -> the canonical code the public i18n endpoints accept. */
export const toApiLang = (code: string): string => {
  const trimmed = code.trim()
  return API_BY_INTERNAL[trimmed.toLowerCase()] ?? trimmed
}

/**
 * API language code -> the app's internal locale code. The Cyrillic aliases
 * (`uz-Cyrl`, `uz-Cyrl-UZ`, `uzc`) normalize to `uzc`; every other code passes
 * through unchanged.
 */
export const fromApiLang = (code: string): string => {
  const trimmed = code.trim()
  return INTERNAL_BY_API[trimmed.toLowerCase()] ?? trimmed
}
