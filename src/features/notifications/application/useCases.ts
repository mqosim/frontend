import type { Result } from '@/shared/domain'

import type { NotificationPreferences } from '../domain/entities'
import type { NotificationPreferencesRepository } from '../domain/ports'

export interface NotificationsUseCaseDeps {
  readonly repository: NotificationPreferencesRepository
}

export interface NotificationsUseCases {
  loadPreferences(): Promise<Result<NotificationPreferences>>
  /**
   * Persists the account's interface locale while preserving the current
   * document-event level. The PUT is a full replacement, so the current
   * preferences are read first; a failed read aborts before any write.
   */
  saveLocale(locale: string): Promise<Result<NotificationPreferences>>
}

export const createNotificationsUseCases = ({
  repository,
}: NotificationsUseCaseDeps): NotificationsUseCases => ({
  loadPreferences: () => repository.getPreferences(),
  async saveLocale(locale) {
    const current = await repository.getPreferences()
    if (!current.ok) return current
    return repository.updatePreferences({
      documentEvents: current.value.documentEvents,
      locale,
    })
  },
})
