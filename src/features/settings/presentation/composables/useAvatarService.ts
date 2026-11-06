import { inject } from 'vue'

import { AvatarServiceKey } from '../di'
import type { AvatarService } from '../../domain/avatar'

export const useAvatarService = (): AvatarService => {
  const service = inject(AvatarServiceKey)
  if (service === undefined) {
    throw new Error('Avatar service was not provided by the composition root')
  }
  return service
}
