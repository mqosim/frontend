import type { InjectionKey } from 'vue'

import type { AdminUseCases } from '../application/useCases'
import type { AuditLogRepository } from '../domain/auditLog'

/** Provided by the composition root; bound to the SYSTEM API client there. */
export const AuditLogRepositoryKey: InjectionKey<AuditLogRepository> =
  Symbol('audit-log-repository')

/** Provided by the composition root; the admin/me + control-plane use cases. */
export const AdminUseCasesKey: InjectionKey<AdminUseCases> = Symbol('admin-use-cases')
