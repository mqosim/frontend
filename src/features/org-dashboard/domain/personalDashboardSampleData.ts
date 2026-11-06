import type { DashboardTransaction } from './dashboardSampleData'

/**
 * Personal Dashboard sample data — DEVELOPMENT PLACEHOLDER, the single source of
 * the personal dashboard's fictional figures. The backend does not exist yet;
 * every number here is invented and must not be presented as the user's real
 * data. Replacing this file's contents with real service results is the only
 * change needed later — the presentation reads these types only.
 *
 * Amounts are whole so'm (no fractions); currency is UZS throughout. The
 * transaction shape is shared with the org dashboard.
 */

export const PERSONAL_CURRENCY = 'UZS'

/** The personal wallet-style balance (fictional). */
export const PERSONAL_BALANCE = 8420000

export interface PersonalMonthSummary {
  /** `yyyy-mm` the figures belong to. */
  readonly month: string
  readonly income: number
  /** Same month one year earlier is not needed; the trend compares months. */
  readonly previousIncome: number
  readonly expenses: number
  readonly previousExpenses: number
}

/** Current-month personal figures plus the previous month for the trends. */
export const PERSONAL_SUMMARY: PersonalMonthSummary = {
  month: '2026-10',
  income: 12400000,
  previousIncome: 10850000,
  expenses: 9350000,
  previousExpenses: 10120000,
}

/** Recent personal activity, newest first (fictional counterparties). */
export const PERSONAL_TRANSACTIONS: readonly DashboardTransaction[] = [
  {
    id: 'ptx-01',
    categoryKey: 'personal.dashboard_tx_cat_salary',
    counterparty: null,
    date: '2026-10-24',
    type: 'income',
    amount: 12000000,
    status: 'completed',
  },
  {
    id: 'ptx-02',
    categoryKey: 'personal.dashboard_tx_cat_groceries',
    counterparty: 'Korzinka Savdo',
    date: '2026-10-21',
    type: 'expense',
    amount: 486000,
    status: 'completed',
  },
  {
    id: 'ptx-03',
    categoryKey: 'personal.dashboard_tx_cat_utilities',
    counterparty: null,
    date: '2026-10-19',
    type: 'expense',
    amount: 320000,
    status: 'pending',
  },
  {
    id: 'ptx-04',
    categoryKey: 'personal.dashboard_tx_cat_transfer',
    counterparty: 'Aziz Rahimov',
    date: '2026-10-14',
    type: 'income',
    amount: 1250000,
    status: 'completed',
  },
  {
    id: 'ptx-05',
    categoryKey: 'personal.dashboard_tx_cat_cafe',
    counterparty: null,
    date: '2026-10-11',
    type: 'expense',
    amount: 95000,
    status: 'completed',
  },
]
