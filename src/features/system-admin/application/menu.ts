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
    permission: ADMIN_PERMISSIONS.systemOrgRead,
    to: { name: 'system-organizations' },
  },
  {
    id: 'users',
    labelKey: 'system.nav_users',
    permission: ADMIN_PERMISSIONS.systemUserRead,
    to: { name: 'system-users' },
  },
  {
    id: 'system-users',
    labelKey: 'system.nav_system_users',
    // Control-plane operators are a role-management surface: anyone who can read
    // or manage roles may see it. Support staff lack both.
    permissions: [ADMIN_PERMISSIONS.systemRoleRead, ADMIN_PERMISSIONS.systemRoleManage],
    to: { name: 'system-system-users' },
  },
  { id: 'subscriptions', labelKey: 'system.nav_subscriptions' },
  { id: 'products', labelKey: 'system.nav_products' },
  { id: 'reports', labelKey: 'system.nav_reports' },
  { id: 'audit', labelKey: 'system.nav_audit', permission: ADMIN_PERMISSIONS.systemAuditRead },
]

/** The sidebar, in display order: the Dashboard first, then the modules. */
export const SYSTEM_MENU: readonly SystemNavDefinition[] = [
  { id: 'dashboard', labelKey: 'system.nav_dashboard', to: { name: 'system-dashboard' } },
  ...SYSTEM_MODULES,
]

export const findSystemModule = (id: string): SystemModuleDefinition | null =>
  SYSTEM_MODULES.find((module) => module.id === id) ?? null
