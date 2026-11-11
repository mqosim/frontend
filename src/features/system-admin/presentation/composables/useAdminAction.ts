import { ref } from 'vue'

import type { Result } from '@/shared/domain'

import { adminActionErrorKey } from '../adminErrors'
import type { AdminActionKind } from '../adminErrors'

/**
 * A pending mutation, with its already-localized dialog copy. When the backend
 * stores a reason in the audit record, the dialog collects one and `confirm`
 * hands it to `run`.
 */
export interface AdminPendingAction {
  readonly kind: AdminActionKind
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly run: (reason: string) => Promise<Result<unknown>>
}

/**
 * Drives one confirmation dialog per page: `ask` opens it, `confirm` runs the
 * mutation once (passing the collected reason, empty when the dialog has no
 * reason field), and a failure closes the dialog and exposes an i18n key so the
 * page can show the backend's failure (403/409/422/503) clearly. On success it
 * calls `onSuccess` so the caller refreshes its list/detail.
 */
export const useAdminAction = (onSuccess: () => void | Promise<void>) => {
  const pending = ref<AdminPendingAction | null>(null)
  const busy = ref(false)
  const errorKey = ref<string | null>(null)
  const reason = ref('')

  const ask = (action: AdminPendingAction): void => {
    if (busy.value) return
    errorKey.value = null
    reason.value = ''
    pending.value = action
  }

  const cancel = (): void => {
    if (busy.value) return
    pending.value = null
  }

  const confirm = async (): Promise<void> => {
    const action = pending.value
    if (action === null || busy.value) return
    busy.value = true
    errorKey.value = null
    const result = await action.run(reason.value)
    busy.value = false
    if (!result.ok) {
      errorKey.value = adminActionErrorKey(result.error, action.kind)
      pending.value = null
      return
    }
    pending.value = null
    await onSuccess()
  }

  return { pending, busy, errorKey, reason, ask, cancel, confirm, dismiss: cancel }
}
