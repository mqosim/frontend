/**
 * The account-wide document-event notification level
 * (`GET/PUT /api/v1/notifications/preferences.document_events`).
 */
export type DocumentEventsPreference = 'all' | 'important' | 'none'

/**
 * The caller's notification preferences.
 *
 * `locale` is the contract's canonical language code (`uz`, `uz-Cyrl`, `ru`,
 * `en`). Presentation maps it to and from the app's internal code (`uzc`) with
 * the public `fromApiLang`/`toApiLang` helpers from `features/i18n`. `null`
 * means the account has no explicit saved language.
 */
export interface NotificationPreferences {
  readonly documentEvents: DocumentEventsPreference
  readonly locale: string | null
}
