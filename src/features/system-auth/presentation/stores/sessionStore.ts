import { defineStore } from 'pinia'

import type { Principal } from '@/shared/domain'

export type SystemStatus = 'unknown' | 'restoring' | 'anonymous' | 'authenticated'

interface SystemSessionState {
  status: SystemStatus
  principal: Principal | null
}

/** UI/session state for the SYSTEM context. Independent of the regular store. */
export const useSystemSessionStore = defineStore('system-session', {
  state: (): SystemSessionState => ({
    status: 'unknown',
    principal: null,
  }),
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
    isRestoring: (state) => state.status === 'restoring',
    principalType: (state): Principal['type'] | null => state.principal?.type ?? null,
  },
  actions: {
    startRestoring() {
      this.status = 'restoring'
    },
    setAuthenticated(principal: Principal) {
      this.status = 'authenticated'
      this.principal = principal
    },
    setAnonymous() {
      this.status = 'anonymous'
      this.principal = null
    },
  },
})
