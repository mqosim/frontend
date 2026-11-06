import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'

import { SystemUseCasesKey, useSystemSessionStore } from '@/features/system-auth'

/**
 * SYSTEM-context logout shared by the top-right `UserMenu`: the system auth use
 * case clears the server session (the repository clears the in-memory token
 * even when the request fails, so the store is always cleared) and the user
 * returns to the system login page. Mirrors the regular-context `useOrgLogout`
 * behaviour, so there is no second logout mechanism.
 */
export const useSystemLogout = () => {
  const auth = inject(SystemUseCasesKey)
  if (auth === undefined) {
    throw new Error('System auth use cases were not provided by the composition root')
  }
  const session = useSystemSessionStore()
  const router = useRouter()

  const loggingOut = ref(false)

  const logout = async (): Promise<void> => {
    if (loggingOut.value) return
    loggingOut.value = true
    try {
      await auth.logout()
      session.setAnonymous()
    } finally {
      loggingOut.value = false
      await router.push({ name: 'system-login' })
    }
  }

  return { loggingOut, logout }
}
