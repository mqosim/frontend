import type { InjectionKey } from 'vue'

import type { SystemAuthUseCases } from '../application/useCases'

/** Provided by the composition root; the only way presentation reaches application. */
export const SystemUseCasesKey: InjectionKey<SystemAuthUseCases> = Symbol('system-auth-use-cases')
