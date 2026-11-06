import { inject } from 'vue'

import { AuditLogRepositoryKey } from '../di'
import type { AuditLogRepository } from '../../domain/auditLog'

export const useAuditLogRepository = (): AuditLogRepository => {
  const repository = inject(AuditLogRepositoryKey)
  if (repository === undefined) {
    throw new Error('Audit log repository was not provided by the composition root')
  }
  return repository
}
