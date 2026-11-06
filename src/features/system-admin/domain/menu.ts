/**
 * SYSTEM administration menu model. Pure data: no Vue, no routing, no i18n
 * lookup — the label is referenced by its globally-unique phrase key and
 * resolved by the view.
 */

import type { AdminPermissionCode } from './permissions'

export type SystemModuleId =
  'organizations' | 'users' | 'system-users' | 'subscriptions' | 'products' | 'reports' | 'audit'

export interface SystemModuleDefinition {
  /** Stable id; also the route slug (`/system/<id>`) and the icon key. */
  readonly id: SystemModuleId
  /** Globally-unique i18n phrase key for the label. */
  readonly labelKey: string
  /**
   * Permission the caller needs to see this module in the UI. `undefined` for
   * modules without a backend permission (placeholder pages). The server still
   * enforces; this only hides entries the caller cannot use.
   */
  readonly permission?: AdminPermissionCode
  /** Any-of variant: visible when the caller holds at least one code. */
  readonly permissions?: readonly AdminPermissionCode[]
  /** Explicit route target for modules with a dedicated list page. */
  readonly to?: { readonly name: string }
}

/** A sidebar entry: the Dashboard (its own route) plus the module pages. */
export interface SystemNavDefinition {
  readonly id: string
  readonly labelKey: string
  /**
   * Explicit route target for entries that do not live on the system module
   * route (the Dashboard). Modules omit it and default to
   * `{ name: 'system-module', params: { module: id } }`.
   */
  readonly to?: { readonly name: string }
  /** Permission required to see the entry; `undefined` means always visible. */
  readonly permission?: AdminPermissionCode
  /** Any-of variant: visible when the caller holds at least one code. */
  readonly permissions?: readonly AdminPermissionCode[]
}
