import type { DocumentEventsPreference, NotificationPreferences } from '../domain/entities'

/** The canonical locale codes the notifications contract accepts. */
export type ApiLocale = 'uz' | 'uz-Cyrl' | 'ru' | 'en'

/**
 * The wire shape of `GET/PUT /api/v1/notifications/preferences`.
 * Mirrors the generated schema types structurally so the repository does not
 * couple the domain to the OpenAPI output.
 */
export interface PreferencesResponseDto {
  document_events: DocumentEventsPreference
  locale?: ApiLocale | null
}

export interface PreferencesUpdateRequestDto {
  document_events: DocumentEventsPreference
  locale?: ApiLocale | null
}

/** Contract -> domain; the canonical locale code is preserved for the UI mapper. */
export const toNotificationPreferences = (
  dto: PreferencesResponseDto,
): NotificationPreferences => ({
  documentEvents: dto.document_events,
  locale: dto.locale === undefined ? null : dto.locale,
})

/** Domain -> contract (a full replacement, so `document_events` is always sent). */
export const toPreferencesUpdateRequest = (
  documentEvents: DocumentEventsPreference,
  locale: string | null,
): PreferencesUpdateRequestDto => ({
  document_events: documentEvents,
  locale: locale === null ? null : (locale as ApiLocale),
})
