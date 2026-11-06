import { inject } from 'vue'

import type { AdminUseCases } from '../../application/useCases'
import { AdminUseCasesKey } from '../di'

export const useAdminUseCases = (): AdminUseCases => {
  const admin = inject(AdminUseCasesKey)
  if (admin === undefined) {
    throw new Error('Admin use cases were not provided by the composition root')
  }
  return admin
}
