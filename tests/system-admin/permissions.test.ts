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

const identity = (permissions: readonly string[], role: string | null = null): AdminIdentity => ({
  uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
  email: 'admin@example.com',
  role,
  permissions,
})

describe('grantsPermission', () => {
  test('matches an exact code', () => {
    expect(
      grantsPermission([ADMIN_PERMISSIONS.systemUsersRead], ADMIN_PERMISSIONS.systemUsersRead),
    ).toBe(true)
  })

  test('does not treat a prefix or another code as a grant', () => {
    expect(
      grantsPermission([ADMIN_PERMISSIONS.systemUsersRead], ADMIN_PERMISSIONS.systemUsersWrite),
    ).toBe(false)
    expect(grantsPermission(['system.users'], ADMIN_PERMISSIONS.systemUsersRead)).toBe(false)
  })

  test('an empty grant set denies everything', () => {
    expect(grantsPermission([], ADMIN_PERMISSIONS.auditRead)).toBe(false)
  })
})

describe('admin permissions store', () => {
  test('starts empty and unloaded before /system/auth/me resolves', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()

    expect(store.status).toBe('unknown')
    expect(store.isLoaded).toBe(false)
    expect(store.role).toBeNull()
    expect(store.can(ADMIN_PERMISSIONS.systemUsersRead)).toBe(false)
  })

  test('exposes the loaded grants and answers can()', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemUsersRead], 'operator'))

    expect(store.status).toBe('ready')
    expect(store.isLoaded).toBe(true)
    expect(store.role).toBe('operator')
    expect(store.can(ADMIN_PERMISSIONS.systemUsersRead)).toBe(true)
    expect(store.can(ADMIN_PERMISSIONS.systemUsersWrite)).toBe(false)
  })

  test('a failed load keeps the caller signed in with no grants', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.tenantsRead]))
    store.setError()

    expect(store.status).toBe('error')
    expect(store.isLoaded).toBe(false)
    expect(store.identity).toBeNull()
    expect(store.can(ADMIN_PERMISSIONS.tenantsRead)).toBe(false)
  })

  test('clear() drops a previous session’s grants', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.auditRead]))
    store.clear()

    expect(store.status).toBe('unknown')
    expect(store.identity).toBeNull()
    expect(store.role).toBeNull()
  })
})

describe('usePermissions', () => {
  test('can() and canAny() read the reactive grant set', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    store.setLoaded(identity([ADMIN_PERMISSIONS.systemUsersRead], 'operator'))
    const { can, canAny, role, isLoaded } = usePermissions()

    expect(can(ADMIN_PERMISSIONS.systemUsersRead)).toBe(true)
    expect(can(ADMIN_PERMISSIONS.systemUsersWrite)).toBe(false)
    expect(canAny([ADMIN_PERMISSIONS.systemUsersWrite, ADMIN_PERMISSIONS.systemUsersRead])).toBe(
      true,
    )
    expect(canAny([ADMIN_PERMISSIONS.systemUsersWrite, ADMIN_PERMISSIONS.tenantsRead])).toBe(false)
    expect(role.value).toBe('operator')
    expect(isLoaded.value).toBe(true)
  })

  test('grants update after the store resolves without recreating the composable', () => {
    setActivePinia(createPinia())
    const store = useAdminPermissionsStore()
    const { can } = usePermissions()

    expect(can(ADMIN_PERMISSIONS.tenantsManage)).toBe(false)
    store.setLoaded(identity([ADMIN_PERMISSIONS.tenantsManage]))
    expect(can(ADMIN_PERMISSIONS.tenantsManage)).toBe(true)
  })
})
