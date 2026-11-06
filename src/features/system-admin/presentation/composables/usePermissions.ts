import { computed } from 'vue'
import type { ComputedRef } from 'vue'

import type { AdminIdentity } from '../../domain/adminAccount'
import type { AdminPermissionCode } from '../../domain/permissions'
import { useAdminPermissionsStore } from '../stores/adminPermissionsStore'

export interface Permissions {
  /** True when the current grants contain `permission`. */
  readonly can: (permission: AdminPermissionCode) => boolean
  /** True when the current grants contain at least one of `permissions`. */
  readonly canAny: (permissions: readonly AdminPermissionCode[]) => boolean
  /** The caller's resolved roles. */
  readonly roles: ComputedRef<readonly string[]>
  /** True once `/admin/me` has been loaded for this session. */
  readonly isLoaded: ComputedRef<boolean>
  readonly identity: ComputedRef<AdminIdentity | null>
}

/**
 * Reads the current SYSTEM caller's permissions. `can(...)` is reactive: a call
 * inside a `computed` re-evaluates when `/admin/me` resolves or the session
 * clears. Missing permissions simply mean "hide" — the server still enforces.
 */
export const usePermissions = (): Permissions => {
  const store = useAdminPermissionsStore()

  const can = (permission: AdminPermissionCode): boolean => store.can(permission)
  const canAny = (permissions: readonly AdminPermissionCode[]): boolean =>
    permissions.some((permission) => can(permission))

  return {
    can,
    canAny,
    roles: computed(() => store.roles),
    isLoaded: computed(() => store.isLoaded),
    identity: computed(() => store.identity),
  }
}
