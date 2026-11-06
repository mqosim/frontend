import { defineStore } from 'pinia'

import type { Principal } from '@/shared/domain'

import type { WorkspaceOption, WorkspaceState } from '../../domain/entities'

export type AuthStatus =
  'unknown' | 'restoring' | 'anonymous' | 'authenticated' | 'workspace_required'

interface AuthSessionState {
  status: AuthStatus
  principal: Principal | null
  /** Options for the pending-workspace selection (`select_workspace` flow). */
  workspaces: WorkspaceOption[]
  /**
   * The PERSON's switchable organizations, loaded from `GET /auth/workspaces`
   * once per session. Used for the account label and the switch dialog; empty for
   * ORG accounts and while the fetch has not succeeded.
   */
  accountWorkspaces: WorkspaceOption[]
  /** The workspace the current token is scoped to, from `GET /auth/workspaces`. */
  currentWorkspace: WorkspaceState | null
}

/**
 * UI/session state for the regular (PERSON/ORG) context. It never touches the
 * HTTP client or the token store — the application layer does that.
 */
export const useAuthSessionStore = defineStore('auth-session', {
  state: (): AuthSessionState => ({
    status: 'unknown',
    principal: null,
    workspaces: [],
    accountWorkspaces: [],
    currentWorkspace: null,
  }),
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
    isRestoring: (state) => state.status === 'restoring',
    needsWorkspace: (state) => state.status === 'workspace_required',
    principalType: (state): Principal['type'] | null => state.principal?.type ?? null,
  },
  actions: {
    startRestoring() {
      this.status = 'restoring'
    },
    setAuthenticated(principal: Principal) {
      this.status = 'authenticated'
      this.principal = principal
      this.workspaces = []
    },
    setWorkspaceRequired(principal: Principal, workspaces: readonly WorkspaceOption[]) {
      this.status = 'workspace_required'
      this.principal = principal
      this.workspaces = [...workspaces]
    },
    setAccountWorkspaces(options: readonly WorkspaceOption[], current: WorkspaceState) {
      this.accountWorkspaces = [...options]
      this.currentWorkspace = current
    },
    setAnonymous() {
      this.status = 'anonymous'
      this.principal = null
      this.workspaces = []
      this.accountWorkspaces = []
      this.currentWorkspace = null
    },
  },
})
