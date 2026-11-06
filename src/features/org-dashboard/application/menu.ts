import type { Workspace } from '@/shared/domain'

import type { ModuleDefinition, ModuleId } from '../domain/menu'

/**
 * The org module menu, in display order. Adding a module is a one-line change
 * here plus its phrase key; the route and the icon follow from the id.
 */
export const ORG_MODULES: readonly ModuleDefinition[] = [
  { id: 'dashboard', labelKey: 'org.module_dashboard' },
  { id: 'invoices', labelKey: 'org.module_invoices' },
  { id: 'bank', labelKey: 'org.module_bank' },
  { id: 'assets', labelKey: 'org.module_assets' },
  { id: 'warehouse', labelKey: 'org.module_warehouse' },
  { id: 'contracts', labelKey: 'org.module_contracts' },
  { id: 'letters', labelKey: 'org.module_letters' },
  { id: 'hr', labelKey: 'org.module_hr' },
  { id: 'balance', labelKey: 'org.module_balance' },
  { id: 'new-documents', labelKey: 'org.module_new_documents' },
  { id: 'apps', labelKey: 'org.module_apps' },
]

/**
 * The personal workspace menu: a personal Dashboard only. Organization-only
 * modules (invoices, HR, warehouse, …) are never exposed to a personal session;
 * the label is shared with the org Dashboard so both sidebars read the same.
 */
export const PERSONAL_MODULES: readonly ModuleDefinition[] = [
  { id: 'dashboard', labelKey: 'org.module_dashboard', to: { name: 'app-home' } },
]

// Menus are keyed by workspace so a PERSON who chose an organization gets the
// same module menu as a real ORG account, while the personal workspace gets a
// compact personal menu rendered by the very same shell.
const MENUS: Record<Workspace, readonly ModuleDefinition[]> = {
  org: ORG_MODULES,
  personal: PERSONAL_MODULES,
}

export const getModuleMenu = (workspace: Workspace): readonly ModuleDefinition[] => MENUS[workspace]

export const findModule = (id: string): ModuleDefinition | null =>
  ORG_MODULES.find((module) => module.id === id) ?? null

/** The module `/org` opens by default. */
export const firstModuleId = (): ModuleId => {
  const first = ORG_MODULES[0]
  if (first === undefined) throw new Error('org-dashboard: no modules are configured')
  return first.id
}
