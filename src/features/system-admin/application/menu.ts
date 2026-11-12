import type { SystemModuleDefinition, SystemNavDefinition } from '../domain/menu'
import { ADMIN_PERMISSIONS, ALL_ADMIN_PERMISSIONS } from '../domain/permissions'

/**
 * The SYSTEM module menu, in display order. Every module is backed by real
 * endpoints and names the permission that reveals it; there are no placeholder
 * entries, because a fake administration area would grant the wrong impression
 * of access.
 */
export const SYSTEM_MODULES: readonly SystemModuleDefinition[] = [
  {
    id: 'organizations',
    labelKey: 'system.nav_organizations',
    // Tenant (organization) rows: GET /system/tenants requires `tenants.read`.
    // Their members live on the detail page (the contract has no global user
    // directory).
    permission: ADMIN_PERMISSIONS.tenantsRead,
    to: { name: 'system-organizations' },
  },
  {
    id: 'system-users',
    labelKey: 'system.nav_system_users',
    // Staff (system user) management: GET /system/users requires
    // `system.users.read`; writes require `system.users.write`. Superadmin-only.
    permission: ADMIN_PERMISSIONS.systemUsersRead,
    to: { name: 'system-system-users' },
  },
  {
    id: 'i18n',
    labelKey: 'system.nav_i18n',
    // Catalog reads require `i18n.read`; mutations require `i18n.manage`.
    permission: ADMIN_PERMISSIONS.i18nRead,
    to: { name: 'system-i18n' },
  },
  {
    id: 'audit',
    labelKey: 'system.nav_audit',
    // GET /system/audit/entries requires `audit.read`; chain verification
    // requires the narrower `audit.verify` and is gated inside the page.
    permission: ADMIN_PERMISSIONS.auditRead,
    to: { name: 'system-audit' },
  },
]

/** The sidebar, in display order: the Dashboard first, then the modules. */
export const SYSTEM_MENU: readonly SystemNavDefinition[] = [
  {
    id: 'dashboard',
    labelKey: 'system.nav_dashboard',
    to: { name: 'system-dashboard' },
    // No backend endpoint backs the dashboard; it is a neutral landing shown to
    // any account that holds at least one admin capability. Its sections are
    // gated individually by the permissions that own their data.
    permissions: ALL_ADMIN_PERMISSIONS,
  },
  ...SYSTEM_MODULES,
]

export const findSystemModule = (id: string): SystemModuleDefinition | null =>
  SYSTEM_MODULES.find((module) => module.id === id) ?? null

/** True when the caller may see `entry` with the given grant set. */
export const canSeeNavEntry = (entry: SystemNavDefinition, grants: readonly string[]): boolean => {
  if (entry.permission !== undefined) return grants.includes(entry.permission)
  if (entry.permissions !== undefined) {
    return entry.permissions.some((permission) => grants.includes(permission))
  }
  return true
}

/** The sidebar entries the caller may see, in display order. */
export const visibleSystemMenu = (grants: readonly string[]): readonly SystemNavDefinition[] =>
  SYSTEM_MENU.filter((entry) => canSeeNavEntry(entry, grants))

/** The caller's first permitted destination, or `null` when they hold nothing. */
export const firstAllowedSystemRoute = (
  grants: readonly string[],
): { readonly name: string } | null => visibleSystemMenu(grants)[0]?.to ?? null
