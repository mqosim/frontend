import type { SystemModuleDefinition, SystemNavDefinition } from '../domain/menu'
import { ADMIN_PERMISSIONS } from '../domain/permissions'

/**
 * The SYSTEM module menu, in display order. Adding a module is a one-line
 * change here plus its phrase key; the route and the icon follow from the id.
 * Entries backed by a real endpoint name the permission that reveals them; the
 * placeholder pages (subscriptions/products/reports) stay visible until they
 * gain a backend surface.
 */
export const SYSTEM_MODULES: readonly SystemModuleDefinition[] = [
  {
    id: 'organizations',
    labelKey: 'system.nav_organizations',
    // Tenant (organization) rows: GET /system/tenants requires `tenants.read`.
    // Their members live on the detail page (the contract has no global
    // user directory).
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
  { id: 'subscriptions', labelKey: 'system.nav_subscriptions' },
  { id: 'products', labelKey: 'system.nav_products' },
  { id: 'reports', labelKey: 'system.nav_reports' },
  { id: 'audit', labelKey: 'system.nav_audit', permission: ADMIN_PERMISSIONS.auditRead },
]

/** The sidebar, in display order: the Dashboard first, then the modules. */
export const SYSTEM_MENU: readonly SystemNavDefinition[] = [
  { id: 'dashboard', labelKey: 'system.nav_dashboard', to: { name: 'system-dashboard' } },
  ...SYSTEM_MODULES,
]

export const findSystemModule = (id: string): SystemModuleDefinition | null =>
  SYSTEM_MODULES.find((module) => module.id === id) ?? null
