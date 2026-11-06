/**
 * Dashboard sample data — DEVELOPMENT PLACEHOLDER, the single source of the
 * dashboard's fictional figures. The backend does not exist yet; every number
 * here is invented and must not be presented as the user's real data. Replacing
 * this file's contents with real service results is the only change needed
 * later — the presentation reads these types only.
 *
 * Amounts are whole so'm (no fractions); currency is UZS throughout.
 */

export type DashboardTransactionType = 'income' | 'expense'

export type DashboardTransactionStatus = 'completed' | 'pending'

export interface DashboardSeriesPoint {
  /** `yyyy-mm`; the label is rendered per locale. */
  readonly month: string
  readonly income: number
  readonly expenses: number
}

export interface DashboardTransaction {
  readonly id: string
  /** Globally-unique i18n key for the category line. */
  readonly categoryKey: string
  /** Optional counterparty (a proper noun — never translated). */
  readonly counterparty: string | null
  /** ISO `yyyy-mm-dd`. */
  readonly date: string
  readonly type: DashboardTransactionType
  readonly amount: number
  readonly status: DashboardTransactionStatus
}

export interface DashboardAttentionItem {
  /** Globally-unique i18n key for the label. */
  readonly labelKey: string
  readonly value: string
}

export const DASHBOARD_CURRENCY = 'UZS'

/** The outstanding receivables summary (fictional). */
export const DASHBOARD_RECEIVABLES = 46250000

/**
 * Trailing 12 months of activity, oldest first. The chart and the income /
 * expense / balance summaries are all derived from this one series so the
 * figures stay internally consistent.
 */
export const DASHBOARD_SERIES: readonly DashboardSeriesPoint[] = [
  { month: '2025-11', income: 42500000, expenses: 31200000 },
  { month: '2025-12', income: 45000000, expenses: 33800000 },
  { month: '2026-01', income: 39800000, expenses: 30500000 },
  { month: '2026-02', income: 51200000, expenses: 36900000 },
  { month: '2026-03', income: 48600000, expenses: 35100000 },
  { month: '2026-04', income: 55400000, expenses: 40200000 },
  { month: '2026-05', income: 52900000, expenses: 38600000 },
  { month: '2026-06', income: 60300000, expenses: 43800000 },
  { month: '2026-07', income: 58100000, expenses: 41900000 },
  { month: '2026-08', income: 63800000, expenses: 46300000 },
  { month: '2026-09', income: 61500000, expenses: 44700000 },
  { month: '2026-10', income: 68400000, expenses: 49200000 },
]

/** Recent transactions, newest first (fictional counterparties). */
export const DASHBOARD_TRANSACTIONS: readonly DashboardTransaction[] = [
  {
    id: 'tx-01',
    categoryKey: 'org.dashboard_tx_cat_client_payment',
    counterparty: 'Oq Bozor Market',
    date: '2026-10-23',
    type: 'income',
    amount: 12500000,
    status: 'completed',
  },
  {
    id: 'tx-02',
    categoryKey: 'org.dashboard_tx_cat_invoice',
    counterparty: 'Bekzod Savdo',
    date: '2026-10-21',
    type: 'income',
    amount: 8400000,
    status: 'pending',
  },
  {
    id: 'tx-03',
    categoryKey: 'org.dashboard_tx_cat_tax',
    counterparty: null,
    date: '2026-10-20',
    type: 'expense',
    amount: 6750000,
    status: 'completed',
  },
  {
    id: 'tx-04',
    categoryKey: 'org.dashboard_tx_cat_supplier_payment',
    counterparty: 'Milliy Trade',
    date: '2026-10-18',
    type: 'expense',
    amount: 18200000,
    status: 'completed',
  },
  {
    id: 'tx-05',
    categoryKey: 'org.dashboard_tx_cat_client_payment',
    counterparty: 'Savdo Servis',
    date: '2026-10-15',
    type: 'income',
    amount: 9300000,
    status: 'pending',
  },
  {
    id: 'tx-06',
    categoryKey: 'org.dashboard_tx_cat_payroll',
    counterparty: null,
    date: '2026-10-12',
    type: 'expense',
    amount: 27400000,
    status: 'completed',
  },
  {
    id: 'tx-07',
    categoryKey: 'org.dashboard_tx_cat_utilities',
    counterparty: null,
    date: '2026-10-09',
    type: 'expense',
    amount: 1860000,
    status: 'completed',
  },
  {
    id: 'tx-08',
    categoryKey: 'org.dashboard_tx_cat_bank_fee',
    counterparty: null,
    date: '2026-10-06',
    type: 'expense',
    amount: 240000,
    status: 'completed',
  },
]

/** Open items that need the user's attention (fictional counts). */
export const DASHBOARD_ATTENTION: readonly DashboardAttentionItem[] = [
  { labelKey: 'org.dashboard_attention_invoices', value: '3' },
  { labelKey: 'org.dashboard_attention_contracts', value: '2' },
  { labelKey: 'org.dashboard_attention_overdue', value: '1' },
]
