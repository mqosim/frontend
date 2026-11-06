import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'

import { AuthUseCasesKey, useAuthSessionStore } from '@/features/auth'

/**
 * Regular-context logout shared by the authenticated chrome: the org module
 * menu used it directly and now the top-right `UserMenu` does (org shell,
 * personal header, settings header). Mirrors the app layout's behaviour:
 * the repository clears the in-memory token even when the request fails, so
 * the store is always cleared and the user returns to the login page.
 */
export const useOrgLogout = () => {
  const auth = inject(AuthUseCasesKey)
  if (auth === undefined) {
    throw new Error('Auth use cases were not provided by the composition root')
  }
  const session = useAuthSessionStore()
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
      await router.push({ name: 'login' })
    }
  }

  return { loggingOut, logout }
}
