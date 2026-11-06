/**
 * Org module menu model. Pure data: no Vue, no routing, no i18n lookup — the
 * label is referenced by its globally-unique phrase key and resolved by the view.
 */

export type ModuleId =
  | 'dashboard'
  | 'invoices'
  | 'bank'
  | 'assets'
  | 'warehouse'
  | 'contracts'
  | 'letters'
  | 'hr'
  | 'balance'
  | 'new-documents'
  | 'apps'

export interface ModuleDefinition {
  /** Stable id; also the route slug (`/org/<id>`) and the icon key. */
  readonly id: ModuleId
  /** Globally-unique i18n phrase key for the label. */
  readonly labelKey: string
  /**
   * Explicit route target for modules that do not live on the org module route
   * (the personal workspace's Dashboard on `/app/home`). Org modules omit it
   * and default to `{ name: 'org-module', params: { module: id } }`.
   */
  readonly to?: { readonly name: string }
}
