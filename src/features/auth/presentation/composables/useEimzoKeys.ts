import { ref, type Ref } from 'vue'

import { errorMessageKey } from '@/shared/presentation/errors/messages'

import type { EimzoKey } from '../../domain/entities'
import { useAuthUseCases } from './useAuthUseCases'

export type EimzoKeysStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface EimzoKeysState {
  readonly keys: Ref<readonly EimzoKey[]>
  readonly status: Ref<EimzoKeysStatus>
  /** An i18n key for the copy to show when `status === 'error'`. */
  readonly errorKey: Ref<string>
  reload(): Promise<void>
}

/**
 * Loads the E-IMZO keys for the panel. Distinguishes an empty result from a
 * failure so the UI can show "no keys" or a retryable error, and the panel's
 * refresh button calls `reload` again.
 */
export const useEimzoKeys = (): EimzoKeysState => {
  const auth = useAuthUseCases()
  const keys = ref<readonly EimzoKey[]>([])
  const status = ref<EimzoKeysStatus>('loading')
  const errorKey = ref('')

  const reload = async (): Promise<void> => {
    status.value = 'loading'
    errorKey.value = ''

    const result = await auth.listEimzoKeys()
    if (!result.ok) {
      errorKey.value = errorMessageKey(result.error)
      status.value = 'error'
      return
    }

    keys.value = result.value
    status.value = result.value.length === 0 ? 'empty' : 'ready'
  }

  return { keys, status, errorKey, reload }
}
