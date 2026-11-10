import type { Result } from '@/shared/domain'

import type { DocumentEventsPreference, NotificationPreferences } from './entities'

/** A full preference replacement; the contract rejects partial payloads. */
export interface UpdatePreferencesInput {
  readonly documentEvents: DocumentEventsPreference
  readonly locale: string | null
}

/** Outbound port for `/api/v1/notifications/preferences`. */
export interface NotificationPreferencesRepository {
  getPreferences(): Promise<Result<NotificationPreferences>>
  updatePreferences(input: UpdatePreferencesInput): Promise<Result<NotificationPreferences>>
}
