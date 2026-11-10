import { defineStore } from 'pinia'

import type { Principal } from '@/shared/domain'

import type { WorkspaceOption, WorkspaceState } from '../../domain/entities'

export type AuthStatus = 'unknown' | 'restoring' | 'anonymous' | 'authenticated'

interface AuthSessionState {
  status: AuthStatus
  principal: Principal | null
  /**
   * The person's switchable tenants, loaded from `GET /identity/me` once per
   * session. Used for the account label and the switch dialog; empty while the
   * fetch has not succeeded.
   */
  accountWorkspaces: WorkspaceOption[]
  /** The tenant the current token is scoped to, from `GET /identity/me`. */
  currentWorkspace: WorkspaceState | null
}

/**
 * UI/session state for the regular (PERSON/ORG) context. It never touches the
 * HTTP client or the token store — the application layer does that.
 *
 * The new contract has no pending-workspace step: login, refresh and a tenant
 * switch all produce a complete session.
 */
export const useAuthSessionStore = defineStore('auth-session', {
  state: (): AuthSessionState => ({
    status: 'unknown',
    principal: null,
    accountWorkspaces: [],
    currentWorkspace: null,
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
    setAccountWorkspaces(options: readonly WorkspaceOption[], current: WorkspaceState) {
      this.accountWorkspaces = [...options]
      this.currentWorkspace = current
    },
    setAnonymous() {
      this.status = 'anonymous'
      this.principal = null
      this.accountWorkspaces = []
      this.currentWorkspace = null
    },
  },
})
