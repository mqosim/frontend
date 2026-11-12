/**
 * Internationalization management entities, mirroring the FastAPI SYSTEM i18n
 * surface (`/api/v1/system/i18n/*`, ADR 0015/0016). Reads need `i18n.read`;
 * every mutation needs `i18n.manage` — the UI hides what the caller cannot do
 * and the server still enforces each call.
 *
 * Language codes stay in the **API spelling** here (`uz`, `uz-Cyrl`, `ru`,
 * `en`) because that is what the endpoints accept and return. The presentation
 * layer normalizes to the app's internal locale codes only for display.
 */

/** One interface language (`SystemLanguageResponse`). Codes are fixed. */
export interface AdminLanguage {
  readonly code: string
  readonly name: string
  readonly nativeName: string
  readonly script: string
  readonly isActive: boolean
  readonly isDefault: boolean
  readonly sortOrder: number
}

/** One translation page with its phrase count (`SystemPageResponse`). */
export interface AdminTranslationPage {
  readonly key: string
  readonly description: string | null
  readonly isActive: boolean
  readonly phraseCount: number
}

/** Create payload for `POST /system/i18n/pages` (an EMPTY page). */
export interface AdminPageCreateInput {
  readonly key: string
  readonly description?: string | null
  readonly isActive: boolean
}

/** Patch payload for `PATCH /system/i18n/pages/{page_key}`. */
export interface AdminPagePatch {
  readonly description?: string | null
  readonly isActive?: boolean
}

/** One phrase with the values it has per language (`SystemPhraseResponse`). */
export interface AdminPhrase {
  readonly pageKey: string
  readonly phraseKey: string
  /** Language code (API spelling) → value; an absent code has no value yet. */
  readonly values: Readonly<Record<string, string>>
}

/** One key-cursor slice of a page's phrases; `nextCursor` is `null` at the end. */
export interface AdminPhrasePage {
  readonly items: readonly AdminPhrase[]
  readonly nextCursor: string | null
}

/** Missing-value counts of one active language (`SystemMissingLanguageResponse`). */
export interface AdminMissingLanguage {
  readonly code: string
  readonly total: number
  /** Page key → phrases still missing a value. */
  readonly pages: Readonly<Record<string, number>>
}

/** One reported input/stored-value mismatch (`SystemImportConflictResponse`). */
export interface AdminImportConflict {
  readonly pageKey: string
  readonly phraseKey: string
  readonly languageCode: string
}

/** Bulk import in the legacy seed shape (`SystemImportRequest`). */
export interface AdminImportRequest {
  readonly pages: readonly (string | AdminImportPageSpec)[] | null
  readonly phrases: Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>
  > | null
  readonly overwrite: boolean
  readonly dryRun: boolean
}

export interface AdminImportPageSpec {
  readonly key: string
  readonly description?: string | null
  readonly isActive: boolean
}

/** What an import did (or would do) — counts and key locations only. */
export interface AdminImportReport {
  readonly pagesCreated: number
  readonly phrasesCreated: number
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly conflicts: readonly AdminImportConflict[]
  readonly perLanguage: Readonly<Record<string, number>>
  readonly missingPerLanguage: Readonly<Record<string, number>>
  readonly dryRun: boolean
  readonly revision: number | null
}

/** Language patch accepted by `PATCH /system/i18n/languages/{code}`. */
export interface AdminLanguagePatch {
  readonly isActive?: boolean
  readonly isDefault?: boolean
}
