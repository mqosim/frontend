export interface Language {
  readonly code: string
  /** The backend's reference name (English); display uses `nativeName`. */
  readonly name: string
  /**
   * The language's own name for itself (`native_name`), e.g. `Ўзбекча` for
   * Uzbek Cyrillic — independent of the active UI language.
   */
  readonly nativeName: string
  readonly isDefault: boolean
}

/** Flat `word` -> text map for a single page slug. */
export type TranslationMap = Readonly<Record<string, string>>

/** Page slug -> `word` -> text. */
export type TranslationBundle = Readonly<Record<string, TranslationMap>>

/** Result of a translation request. 304 and 404 are outcomes, not failures. */
export type TranslationOutcome =
  | {
      readonly status: 'ok'
      /** Internal locale code the backend actually served (may differ from the request). */
      readonly lang: string
      readonly bundles: TranslationBundle
      readonly etag: string | null
    }
  | { readonly status: 'not-modified' }
  | { readonly status: 'not-found' }
