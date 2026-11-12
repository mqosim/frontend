import { computed, ref } from 'vue'

import { useAdminPermissionsStore } from '../stores/adminPermissionsStore'
import { useAdminUseCases } from './useAdminUseCases'

/** Loads/retries `/system/auth/me` without touching the session — a failure never logs out. */
export const useAdminIdentity = () => {
  const admin = useAdminUseCases()
  const store = useAdminPermissionsStore()
  const loading = ref(false)

  const load = async (): Promise<void> => {
    if (loading.value) return
    loading.value = true
    store.startLoading()
    const result = await admin.getMe()
    loading.value = false
    if (result.ok) store.setLoaded(result.value)
    else store.setError()
  }

  return {
    load,
    loading,
    status: computed(() => store.status),
    identity: computed(() => store.identity),
    role: computed(() => store.role),
  }
}
