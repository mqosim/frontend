/**
 * SYSTEM administration menu model. Pure data: no Vue, no routing, no i18n
 * lookup — the label is referenced by its globally-unique phrase key and
 * resolved by the view.
 *
 * Every module is backed by a real endpoint and names the permission that
 * reveals it. The Dashboard is the only entry without a single permission; it
 * is shown when the caller holds any admin capability and its content is gated
 * section by section.
 */

import type { AdminPermissionCode } from './permissions'

export type SystemModuleId = 'organizations' | 'system-users' | 'i18n' | 'audit'

export interface SystemModuleDefinition {
  /** Stable id; also the route slug and the icon key. */
  readonly id: SystemModuleId
  /** Globally-unique i18n phrase key for the label. */
  readonly labelKey: string
  /**
   * Permission the caller needs to see this module in the UI. The server still
   * enforces; this only hides entries the caller cannot use.
   */
  readonly permission: AdminPermissionCode
  /** Explicit route target for modules with a dedicated list page. */
  readonly to: { readonly name: string }
}

/** A sidebar entry: the Dashboard (its own route) plus the module pages. */
export interface SystemNavDefinition {
  readonly id: string
  readonly labelKey: string
  /**
   * Explicit route target for entries that do not live on a module route (the
   * Dashboard). Modules name their own dedicated route.
   */
  readonly to?: { readonly name: string }
  /** Permission required to see the entry; `undefined` means any admin grant. */
  readonly permission?: AdminPermissionCode
  /** Any-of variant: visible when the caller holds at least one code. */
  readonly permissions?: readonly AdminPermissionCode[]
}
