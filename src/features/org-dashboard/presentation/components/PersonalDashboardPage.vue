<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  formatDashboardDate,
  formatDashboardMoney,
  formatDashboardPercent,
} from '../../domain/dashboardFormat'
import {
  PERSONAL_BALANCE,
  PERSONAL_CURRENCY,
  PERSONAL_SUMMARY,
  PERSONAL_TRANSACTIONS,
} from '../../domain/personalDashboardSampleData'
import type { DashboardTransactionStatus } from '../../domain/dashboardSampleData'

/**
 * The personal workspace Dashboard. All figures come from
 * `personalDashboardSampleData.ts` — a development placeholder until the backend
 * exists; the page presents them as sample data and reads only the exported
 * types, so real services can replace the module without touching this file.
 *
 * The layout mirrors the org Dashboard's design language (intro, summary cards,
 * recent-activity table) with personal-workspace content only: no organization
 * statistics, receivables, chart or business quick actions.
 */
const { t, locale } = useI18n()

// ── Summary figures and month-over-month trends ─────────────────────────────
const percentTrend = (current: number, previous: number): number | null => {
  if (previous === 0) return null
  return (current - previous) / previous
}

const incomeTrend = computed(() =>
  percentTrend(PERSONAL_SUMMARY.income, PERSONAL_SUMMARY.previousIncome),
)
const expensesTrend = computed(() =>
  percentTrend(PERSONAL_SUMMARY.expenses, PERSONAL_SUMMARY.previousExpenses),
)
// For income, growth is good; for expenses, growth is bad.
const incomeTrendGood = computed(() => (incomeTrend.value ?? 0) >= 0)
const expensesTrendGood = computed(() => (expensesTrend.value ?? 0) < 0)

const incomeAmount = computed(() =>
  formatDashboardMoney(PERSONAL_SUMMARY.income, PERSONAL_CURRENCY, locale.value),
)
const expensesAmount = computed(() =>
  formatDashboardMoney(PERSONAL_SUMMARY.expenses, PERSONAL_CURRENCY, locale.value),
)
const balanceAmount = computed(() =>
  formatDashboardMoney(PERSONAL_BALANCE, PERSONAL_CURRENCY, locale.value),
)

// ── Recent activity ──────────────────────────────────────────────────────────
const statusLabelKey = (status: DashboardTransactionStatus): string =>
  status === 'completed'
    ? 'personal.dashboard_status_completed'
    : 'personal.dashboard_status_pending'
</script>

<template>
  <section class="pdash">
    <header class="pdash__intro">
      <h1 class="pdash__title">{{ t('personal.dashboard_title') }}</h1>
      <p class="pdash__subtitle">{{ t('personal.dashboard_subtitle') }}</p>
      <p class="pdash__notice">{{ t('personal.dashboard_sample_notice') }}</p>
    </header>

    <div class="pdash__cards">
      <article class="pdash-card pdash-sumcard">
        <span class="pdash-sumcard__icon pdash-sumcard__icon--income" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M17 7 7 17" />
            <path d="M17 17H7V7" />
          </svg>
        </span>
        <p class="pdash-sumcard__label">{{ t('personal.dashboard_card_income') }}</p>
        <p class="pdash-sumcard__amount">{{ incomeAmount }}</p>
        <p
          v-if="incomeTrend !== null"
          class="pdash-sumcard__trend"
          :class="incomeTrendGood ? 'pdash-sumcard__trend--good' : 'pdash-sumcard__trend--bad'"
        >
          <span class="pdash-sumcard__trend-value">
            {{ formatDashboardPercent(incomeTrend, locale) }}
          </span>
          <span class="pdash-sumcard__trend-label">{{
            t('personal.dashboard_vs_prev_month')
          }}</span>
        </p>
      </article>

      <article class="pdash-card pdash-sumcard">
        <span class="pdash-sumcard__icon pdash-sumcard__icon--expenses" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
        <p class="pdash-sumcard__label">{{ t('personal.dashboard_card_expenses') }}</p>
        <p class="pdash-sumcard__amount">{{ expensesAmount }}</p>
        <p
          v-if="expensesTrend !== null"
          class="pdash-sumcard__trend"
          :class="expensesTrendGood ? 'pdash-sumcard__trend--good' : 'pdash-sumcard__trend--bad'"
        >
          <span class="pdash-sumcard__trend-value">
            {{ formatDashboardPercent(expensesTrend, locale) }}
          </span>
          <span class="pdash-sumcard__trend-label">{{
            t('personal.dashboard_vs_prev_month')
          }}</span>
        </p>
      </article>

      <article class="pdash-card pdash-sumcard">
        <span class="pdash-sumcard__icon pdash-sumcard__icon--balance" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </span>
        <p class="pdash-sumcard__label">{{ t('personal.dashboard_card_balance') }}</p>
        <p class="pdash-sumcard__amount">{{ balanceAmount }}</p>
      </article>
    </div>

    <article class="pdash-card">
      <h2 class="pdash-card__title">{{ t('personal.dashboard_activity_title') }}</h2>
      <div
        class="pdash-table-wrap"
        role="region"
        tabindex="0"
        :aria-label="t('personal.dashboard_activity_title')"
      >
        <table class="pdash-table">
          <thead>
            <tr>
              <th scope="col">{{ t('personal.dashboard_tx_description') }}</th>
              <th scope="col">{{ t('personal.dashboard_tx_date') }}</th>
              <th scope="col" class="pdash-table__num">{{ t('personal.dashboard_tx_amount') }}</th>
              <th scope="col">{{ t('personal.dashboard_tx_status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in PERSONAL_TRANSACTIONS" :key="transaction.id">
              <td>
                <span class="pdash-table__desc">{{ t(transaction.categoryKey) }}</span>
                <span v-if="transaction.counterparty !== null" class="pdash-table__sub">
                  {{ transaction.counterparty }}
                </span>
              </td>
              <td class="pdash-table__muted">
                {{ formatDashboardDate(transaction.date, locale) }}
              </td>
              <td
                class="pdash-table__num"
                :class="
                  transaction.type === 'income' ? 'pdash-table__income' : 'pdash-table__expense'
                "
              >
                {{ transaction.type === 'income' ? '+' : '−' }}
                {{ formatDashboardMoney(transaction.amount, PERSONAL_CURRENCY, locale) }}
              </td>
              <td>
                <span
                  class="pdash-badge"
                  :class="
                    transaction.status === 'completed'
                      ? 'pdash-badge--success'
                      : 'pdash-badge--warning'
                  "
                >
                  {{ t(statusLabelKey(transaction.status)) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.pdash {
  /* Size container for the container queries below; see the org Dashboard.
     The shell content column already provides the top inset. */
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width-dashboard);
}

.pdash__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pdash__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.pdash__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}

.pdash__notice {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Shared card surface (org Dashboard's design language) ──────────────── */
.pdash-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.pdash-card__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}

/* ── Summary cards ──────────────────────────────────────────────────────── */
.pdash__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.pdash-sumcard {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pdash-sumcard__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
}

.pdash-sumcard__icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pdash-sumcard__icon--income {
  background-color: var(--color-success-surface);
  color: var(--color-success);
}

.pdash-sumcard__icon--expenses {
  background-color: var(--color-danger-surface);
  color: var(--color-danger);
}

.pdash-sumcard__icon--balance {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.pdash-sumcard__label {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.pdash-sumcard__amount {
  overflow-wrap: anywhere;
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.pdash-sumcard__trend {
  display: flex;
  gap: var(--space-1);
  align-items: baseline;
  margin: 0;
  font-size: var(--font-size-sm);
}

.pdash-sumcard__trend-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pdash-sumcard__trend--good .pdash-sumcard__trend-value {
  color: var(--color-success);
}

.pdash-sumcard__trend--bad .pdash-sumcard__trend-value {
  color: var(--color-danger);
}

.pdash-sumcard__trend-label {
  color: var(--color-text-muted);
}

/* ── Recent activity table ──────────────────────────────────────────────── */
.pdash-table-wrap {
  overflow-x: auto;
  margin-top: var(--space-3);
}

.pdash-table {
  width: 100%;
  min-width: 30rem;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.pdash-table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.pdash-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.pdash-table tbody tr:last-child td {
  border-bottom: 0;
}

.pdash-table__desc {
  display: block;
  font-weight: 500;
}

.pdash-table__sub {
  display: block;
  color: var(--color-text-muted);
}

.pdash-table__muted {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.pdash-table__num {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.pdash-table__income {
  color: var(--color-success);
}

.pdash-table__expense {
  color: var(--color-danger);
}

.pdash-badge {
  display: inline-flex;
  padding: 0.125rem var(--space-2);
  border-radius: 999px;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.pdash-badge--success {
  background-color: var(--color-success-surface);
  color: var(--color-success);
}

.pdash-badge--warning {
  background-color: var(--color-warning-surface);
  color: var(--color-warning);
}

.pdash-table-wrap:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 48rem) {
  .pdash__cards {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Container refinement; see the org Dashboard. Three summary cards need
   ~44rem; below that they collapse to a single column. */
@container (width < 44rem) {
  .pdash__cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
