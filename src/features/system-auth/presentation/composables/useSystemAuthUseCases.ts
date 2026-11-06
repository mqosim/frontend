import { inject } from 'vue'

import type { SystemAuthUseCases } from '../../application/useCases'
import { SystemUseCasesKey } from '../di'

export const useSystemAuthUseCases = (): SystemAuthUseCases => {
  const useCases = inject(SystemUseCasesKey)
  if (useCases === undefined) {
    throw new Error('System auth use cases were not provided by the composition root')
  }
  return useCases
}
