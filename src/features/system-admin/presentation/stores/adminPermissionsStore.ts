import { defineStore } from 'pinia'

import type { AdminIdentity } from '../../domain/adminAccount'
import { grantsPermission } from '../../domain/permissions'
import type { AdminPermissionCode } from '../../domain/permissions'

export type AdminLoadStatus = 'unknown' | 'loading' | 'ready' | 'error'

interface AdminPermissionsState {
  status: AdminLoadStatus
  identity: AdminIdentity | null
}

/**
 * The resolved admin identity/grants for the current SYSTEM session. Populated
 * once per session from `GET /api/v1/system/auth/me`; cleared when the session
 * ends so a later sign-in never inherits the previous account's permissions.
 */
export const useAdminPermissionsStore = defineStore('admin-permissions', {
  state: (): AdminPermissionsState => ({
    status: 'unknown',
    identity: null,
  }),
  getters: {
    /** The caller's single backend role, or `null` before `/me` resolves. */
    role: (state): string | null => state.identity?.role ?? null,
    permissions: (state): readonly string[] => state.identity?.permissions ?? [],
    isLoaded: (state): boolean => state.status === 'ready',
  },
  actions: {
    startLoading() {
      this.status = 'loading'
    },
    setLoaded(identity: AdminIdentity) {
      this.identity = identity
      this.status = 'ready'
    },
    setError() {
      this.identity = null
      this.status = 'error'
    },
    clear() {
      this.identity = null
      this.status = 'unknown'
    },
    /** True when the current grants contain `permission`. */
    can(permission: AdminPermissionCode): boolean {
      return grantsPermission(this.permissions, permission)
    },
  },
})
