/**
 * SYSTEM administration sample data — DEVELOPMENT PLACEHOLDER, the single
 * source of the platform dashboard's fictional figures. The management
 * services do not exist yet; every number, name and actor here is invented and
 * must never be presented as real platform statistics. Replacing this file's
 * contents with real service results is the only change needed later — the
 * presentation reads these types only.
 *
 * Dates are ISO `yyyy-mm-dd`, on or before the development date, and actor
 * names use the reserved `.test` domain so they can never look like real
 * accounts.
 */

export interface SystemStats {
  readonly organizations: number
  readonly users: number
  readonly activeSubscriptions: number
  /** Organizations registered in the last 30 days. */
  readonly newOrganizations30d: number
}

export const SYSTEM_STATS: SystemStats = {
  organizations: 132,
  users: 1478,
  activeSubscriptions: 87,
  newOrganizations30d: 12,
}

export interface SystemRegistration {
  readonly id: string
  /** Fictional organization name. */
  readonly name: string
  /** Globally-unique phrase key for the plan name. */
  readonly planKey: string
  /** ISO date `yyyy-mm-dd`. */
  readonly date: string
  /** Globally-unique phrase key for the lifecycle status. */
  readonly statusKey: string
}

/** Recent organization registrations, newest first (fictional names). */
export const SYSTEM_REGISTRATIONS: readonly SystemRegistration[] = [
  {
    id: 'reg-01',
    name: 'Yangi Bozor Savdo MChJ',
    planKey: 'system.dash_plan_standard',
    date: '2026-10-23',
    statusKey: 'system.dash_status_active',
  },
  {
    id: 'reg-02',
    name: 'Tashkent Build Group',
    planKey: 'system.dash_plan_pro',
    date: '2026-10-21',
    statusKey: 'system.dash_status_active',
  },
  {
    id: 'reg-03',
    name: 'Samarqand Meva Qayta Ishlash',
    planKey: 'system.dash_plan_free',
    date: '2026-10-18',
    statusKey: 'system.dash_status_onboarding',
  },
  {
    id: 'reg-04',
    name: 'Buxoro Agro Servis',
    planKey: 'system.dash_plan_free',
    date: '2026-10-15',
    statusKey: 'system.dash_status_onboarding',
  },
  {
    id: 'reg-05',
    name: 'Fargona Logistics MChJ',
    planKey: 'system.dash_plan_standard',
    date: '2026-10-12',
    statusKey: 'system.dash_status_active',
  },
]

export interface SystemActivityEvent {
  readonly id: string
  /** Globally-unique phrase key for the recorded action. */
  readonly actionKey: string
  /** Fictional administrative actor (reserved `.test` domain). */
  readonly actor: string
  /** ISO date `yyyy-mm-dd`. */
  readonly date: string
}

/** Recent administrative activity, newest first (fictional). */
export const SYSTEM_ACTIVITY: readonly SystemActivityEvent[] = [
  {
    id: 'evt-01',
    actionKey: 'system.dash_act_sign_in',
    actor: 'admin@mfin.test',
    date: '2026-10-24',
  },
  {
    id: 'evt-02',
    actionKey: 'system.dash_act_org_created',
    actor: 'admin@mfin.test',
    date: '2026-10-23',
  },
  {
    id: 'evt-03',
    actionKey: 'system.dash_act_plan_changed',
    actor: 'manager@mfin.test',
    date: '2026-10-20',
  },
  {
    id: 'evt-04',
    actionKey: 'system.dash_act_user_suspended',
    actor: 'manager@mfin.test',
    date: '2026-10-17',
  },
]
