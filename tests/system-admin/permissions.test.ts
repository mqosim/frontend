/**
 * Unit tests for the SYSTEM permission model: the pure `grantsPermission`
 * predicate, the Pinia store, and the `usePermissions` composable that the
 * sidebar and action buttons read.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

import type { AdminIdentity } from '../../src/features/system-admin/domain/adminAccount'
import {
  ADMIN_PERMISSIONS,
  grantsPermission,
} from '../../src/features/system-admin/domain/permissions'
import { usePermissions } from '../../src/features/system-admin/presentation/composables/usePermissions'
import { useAdminPermissionsStore } from '../../src/features/system-admin/presentation/stores/adminPermissionsStore'

const identity = (
  permissions: readonly string[],
  roles: readonly string[] = [],
): AdminIdentity => ({
  uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
  email: 'admin@example.com',
  roles,
  permissions,
})

describe('grantsPermission', () => {
  test('matches an exact code', () => {
    expect(
      grantsPermission([ADMIN_PERMISSIONS.systemUserRead], ADMIN_PERMISSIONS.systemUserRead),
    ).toBe(true)
  })

  test('does not treat a prefix or another code as a grant', () => {
    expect(
      grantsPermission([ADMIN_PERMISSIONS.systemUserRead], ADMIN_PERMISSIONS.systemUserBlock),
    ).toBe(false)
    expect(grantsPermission(['system.user'], ADMIN_PERMISSIONS.systemUserRead)).toBe(false)
  })

  test('an empty grant set denies everything', () => {
    expect(grantsPermission([], ADMIN_PERMISSIONS.systemAuditRead)).toBe(false)
  })
})

describe('admin permissions store', () => {
  test('starts empty and unloaded before /admin/me resolves', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()

    expect(store.status).toBe('unknown')
    expect(store.isLoaded).toBe(false)
    expect(store.roles).toEqual([])
    expect(store.can(ADMIN_PERMISSIONS.systemUserRead)).toBe(false)
  })

  test('exposes the loaded grants and answers can()', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemUserRead], ['system_support']))

    expect(store.status).toBe('ready')
    expect(store.isLoaded).toBe(true)
    expect(store.roles).toEqual(['system_support'])
    expect(store.can(ADMIN_PERMISSIONS.systemUserRead)).toBe(true)
    expect(store.can(ADMIN_PERMISSIONS.systemRoleManage)).toBe(false)
  })

  test('a failed load keeps the caller signed in with no grants', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemOrgRead]))
    store.setError()

    expect(store.status).toBe('error')
    expect(store.isLoaded).toBe(false)
    expect(store.identity).toBeNull()
    expect(store.can(ADMIN_PERMISSIONS.systemOrgRead)).toBe(false)
  })

  test('clear() drops a previous session’s grants', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemAuditRead]))
    store.clear()

    expect(store.status).toBe('unknown')
    expect(store.identity).toBeNull()
    expect(store.roles).toEqual([])
  })
})

describe('usePermissions', () => {
  test('can() and canAny() read the reactive grant set', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemUserRead]))
    const { can, canAny, roles, isLoaded } = usePermissions()

    expect(can(ADMIN_PERMISSIONS.systemUserRead)).toBe(true)
    expect(can(ADMIN_PERMISSIONS.systemRoleManage)).toBe(false)
    expect(canAny([ADMIN_PERMISSIONS.systemRoleManage, ADMIN_PERMISSIONS.systemUserRead])).toBe(
      true,
    )
    expect(canAny([ADMIN_PERMISSIONS.systemRoleManage, ADMIN_PERMISSIONS.systemRoleRead])).toBe(
      false,
    )
    expect(roles.value).toEqual([])
    expect(isLoaded.value).toBe(true)
  })

  test('grants update after the store resolves without recreating the composable', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    const { can } = usePermissions()

    expect(can(ADMIN_PERMISSIONS.systemOrgBlock)).toBe(false)
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemOrgBlock]))
    expect(can(ADMIN_PERMISSIONS.systemOrgBlock)).toBe(true)
  })
})
