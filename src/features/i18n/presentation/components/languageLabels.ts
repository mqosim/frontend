/**
 * Short labels shown next to the flag in the language UI (the switcher trigger
 * and its dropdown options), keyed by language code.
 *
 * These are deliberately NOT the API code: Uzbek Cyrillic (`uzc`) must read in
 * Cyrillic while `uz`/`en` stay Latin, so each entry also carries its own BCP 47
 * tag for `lang`. Any code that is not listed falls back to the uppercased code
 * — the previous display — so a new language keeps working without editing here.
 */
export interface LanguageLabel {
  /** Visible short label that replaces the uppercased API code. */
  readonly label: string
  /** `lang` attribute for the label (`uzc` for Uzbek Cyrillic). */
  readonly lang: string
}

const LABELS: Readonly<Record<string, LanguageLabel>> = {
  uz: { label: "O'z", lang: 'uz' },
  uzc: { label: 'Ўз', lang: 'uzc' },
  en: { label: 'En', lang: 'en' },
  ru: { label: 'Ру', lang: 'ru' },
}

/**
 * Short label for a language code. Unknown codes fall back to the uppercased
 * code — the previous display — so nothing breaks for future languages.
 */
export const languageLabelFor = (code: string): LanguageLabel =>
  LABELS[code.trim().toLowerCase()] ?? { label: code.trim().toUpperCase(), lang: code.trim() }
