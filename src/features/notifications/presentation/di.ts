import type { InjectionKey } from 'vue'

import type { NotificationsUseCases } from '../application/useCases'

/** Provided by the composition root; the only way presentation reaches the use cases. */
export const NotificationsUseCasesKey: InjectionKey<NotificationsUseCases> =
  Symbol('notifications-use-cases')
