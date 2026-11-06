import type { InjectionKey } from 'vue'

import type { AuthUseCases } from '../application/useCases'

/**
 * Provided by the composition root (`src/app/di/container.ts`); the only way
 * presentation reaches the application layer.
 */
export const AuthUseCasesKey: InjectionKey<AuthUseCases> = Symbol('auth-use-cases')
