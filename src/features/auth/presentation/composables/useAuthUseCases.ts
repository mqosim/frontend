import { inject } from 'vue'

import type { AuthUseCases } from '../../application/useCases'
import { AuthUseCasesKey } from '../di'

export const useAuthUseCases = (): AuthUseCases => {
  const useCases = inject(AuthUseCasesKey)
  if (useCases === undefined) {
    throw new Error('Auth use cases were not provided by the composition root')
  }
  return useCases
}
