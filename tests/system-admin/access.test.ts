/**
 * Unit tests for the SYSTEM navigation and permission gates: which sidebar
 * entries a grant set may see, the first destination offered to a caller, and
 * the pure `grantsGate` predicate the routes use.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'

import { grantsGate } from '../../src/features/system-admin/application/access'
import {
  SYSTEM_MENU,
  SYSTEM_MODULES,
  canSeeNavEntry,
  firstAllowedSystemRoute,
  visibleSystemMenu,
} from '../../src/features/system-admin/application/menu'
import { ADMIN_PERMISSIONS } from '../../src/features/system-admin/domain/permissions'

const SUPERADMIN_GRANTS = [
  ADMIN_PERMISSIONS.systemUsersRead,
  ADMIN_PERMISSIONS.systemUsersWrite,
  ADMIN_PERMISSIONS.tenantsRead,
  ADMIN_PERMISSIONS.tenantsManage,
  ADMIN_PERMISSIONS.tenantsUsersRead,
  ADMIN_PERMISSIONS.i18nRead,
  ADMIN_PERMISSIONS.i18nManage,
  ADMIN_PERMISSIONS.auditRead,
  ADMIN_PERMISSIONS.auditVerify,
]

/** The backend's operator role: four reads, no staff/i18n/audit mutations. */
const OPERATOR_GRANTS = [
  ADMIN_PERMISSIONS.tenantsRead,
  ADMIN_PERMISSIONS.tenantsUsersRead,
  ADMIN_PERMISSIONS.i18nRead,
  ADMIN_PERMISSIONS.auditRead,
]

/** The backend's i18n_editor role: catalog read plus mutation only. */
const I18N_EDITOR_GRANTS = [ADMIN_PERMISSIONS.i18nRead, ADMIN_PERMISSIONS.i18nManage]

const visibleIds = (grants: readonly string[]): string[] =>
  visibleSystemMenu(grants).map((entry) => entry.id)

describe('grantsGate', () => {
  test('an exact permission must be present', () => {
    expect(
      grantsGate([ADMIN_PERMISSIONS.tenantsRead], { permission: ADMIN_PERMISSIONS.tenantsRead }),
    ).toBe(true)
    expect(
      grantsGate([ADMIN_PERMISSIONS.tenantsRead], {
        permission: ADMIN_PERMISSIONS.systemUsersRead,
      }),
    ).toBe(false)
  })

  test('an any-of gate needs at least one listed code', () => {
    const gate = {
      permissions: [ADMIN_PERMISSIONS.i18nRead, ADMIN_PERMISSIONS.auditRead],
    } as const
    expect(grantsGate([ADMIN_PERMISSIONS.auditRead], gate)).toBe(true)
    expect(grantsGate([ADMIN_PERMISSIONS.tenantsRead], gate)).toBe(false)
    expect(grantsGate([], gate)).toBe(false)
  })

  test('an ungated control is open to any authenticated admin', () => {
    expect(grantsGate([], {})).toBe(true)
  })
})

describe('SYSTEM menu', () => {
  test('every module is backed by a real permission and none is a placeholder', () => {
    expect(SYSTEM_MODULES.map((module) => module.id)).toEqual([
      'organizations',
      'system-users',
      'i18n',
      'audit',
    ])
    expect(SYSTEM_MODULES.every((module) => module.permission.length > 0)).toBe(true)
  })

  test('staff access is gated by system.users.read, never tenants.read', () => {
    const staff = SYSTEM_MODULES.find((module) => module.id === 'system-users')
    expect(staff?.permission).toBe(ADMIN_PERMISSIONS.systemUsersRead)
    expect(staff?.permission).not.toBe(ADMIN_PERMISSIONS.tenantsRead)
  })

  test('the dashboard is a neutral any-of entry before the modules', () => {
    const dashboard = SYSTEM_MENU[0]
    expect(dashboard?.id).toBe('dashboard')
    expect(dashboard?.permission).toBeUndefined()
    expect(dashboard?.permissions).toContain(ADMIN_PERMISSIONS.systemUsersRead)
    expect(dashboard?.permissions).toContain(ADMIN_PERMISSIONS.i18nRead)
  })
})

describe('visibleSystemMenu', () => {
  test('superadmin sees the dashboard and every module', () => {
    expect(visibleIds(SUPERADMIN_GRANTS)).toEqual([
      'dashboard',
      'organizations',
      'system-users',
      'i18n',
      'audit',
    ])
  })

  test('operator sees organization, catalog and audit but no staff page', () => {
    expect(visibleIds(OPERATOR_GRANTS)).toEqual(['dashboard', 'organizations', 'i18n', 'audit'])
    expect(visibleIds(OPERATOR_GRANTS)).not.toContain('system-users')
  })

  test('the i18n Manager sees only the dashboard and the catalog', () => {
    expect(visibleIds(I18N_EDITOR_GRANTS)).toEqual(['dashboard', 'i18n'])
  })

  test('an account with no grants sees nothing', () => {
    expect(visibleIds([])).toEqual([])
  })

  test('canSeeNavEntry denies an unknown permission code', () => {
    const entry = SYSTEM_MODULES.find((module) => module.id === 'audit')
    if (entry === undefined) throw new Error('audit module missing')
    expect(canSeeNavEntry(entry, SUPERADMIN_GRANTS)).toBe(true)
    expect(canSeeNavEntry(entry, I18N_EDITOR_GRANTS)).toBe(false)
  })
})

describe('firstAllowedSystemRoute', () => {
  test('any admin lands on the dashboard first', () => {
    expect(firstAllowedSystemRoute(I18N_EDITOR_GRANTS)).toEqual({ name: 'system-dashboard' })
  })

  test('no grants means no destination to offer', () => {
    expect(firstAllowedSystemRoute([])).toBeNull()
  })
})
