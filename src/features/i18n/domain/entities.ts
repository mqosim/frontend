export interface Language {
  readonly code: string
  readonly name: string
  readonly isDefault: boolean
}

/** Flat `word` -> text map for a single page slug. */
export type TranslationMap = Readonly<Record<string, string>>

/** Page slug -> `word` -> text. */
export type TranslationBundle = Readonly<Record<string, TranslationMap>>

/** Result of a translation request. 304 and 404 are outcomes, not failures. */
export type TranslationOutcome =
  | { readonly status: 'ok'; readonly bundles: TranslationBundle; readonly etag: string | null }
  | { readonly status: 'not-modified' }
  | { readonly status: 'not-found' }
