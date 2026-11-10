import { ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { toResult } from '@/shared/infrastructure/api/client'
import type { ApiClient } from '@/shared/infrastructure/api/client'

import type { NotificationPreferences } from '../domain/entities'
import type { NotificationPreferencesRepository, UpdatePreferencesInput } from '../domain/ports'
import { toNotificationPreferences, toPreferencesUpdateRequest } from './mappers'

export const createNotificationPreferencesRepository = (
  client: ApiClient,
): NotificationPreferencesRepository => ({
  async getPreferences(): Promise<Result<NotificationPreferences>> {
    const result = toResult(await client.GET('/api/v1/notifications/preferences'))
    if (!result.ok) return result
    return ok(toNotificationPreferences(result.value))
  },

  async updatePreferences(input: UpdatePreferencesInput): Promise<Result<NotificationPreferences>> {
    const body = toPreferencesUpdateRequest(input.documentEvents, input.locale)
    const result = toResult(await client.PUT('/api/v1/notifications/preferences', { body }))
    if (!result.ok) return result
    return ok(toNotificationPreferences(result.value))
  },
})
