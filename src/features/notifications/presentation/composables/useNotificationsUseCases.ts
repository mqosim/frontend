import { inject } from 'vue'

import type { NotificationsUseCases } from '../../application/useCases'
import { NotificationsUseCasesKey } from '../di'

export const useNotificationsUseCases = (): NotificationsUseCases => {
  const useCases = inject(NotificationsUseCasesKey)
  if (useCases === undefined) {
    throw new Error('Notifications use cases were not provided by the composition root')
  }
  return useCases
}
