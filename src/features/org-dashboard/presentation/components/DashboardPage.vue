<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  formatDashboardCompact,
  formatDashboardDate,
  formatDashboardMoney,
  formatDashboardMonth,
  formatDashboardPercent,
} from '../../domain/dashboardFormat'
import {
  DASHBOARD_ATTENTION,
  DASHBOARD_CURRENCY,
  DASHBOARD_RECEIVABLES,
  DASHBOARD_SERIES,
  DASHBOARD_TRANSACTIONS,
} from '../../domain/dashboardSampleData'
import type {
  DashboardTransactionStatus,
  DashboardTransactionType,
} from '../../domain/dashboardSampleData'

/**
 * The org Dashboard. All figures come from `dashboardSampleData.ts` — a
 * development placeholder until the backend exists; the page presents them as
 * sample data and reads only the exported types, so real services can replace
 * the module without touching this file.
 */

type PeriodId = '3m' | '6m' | '12m'

const PERIOD_IDS: readonly PeriodId[] = ['3m', '6m', '12m']
const PERIOD_LABEL_KEYS: Record<PeriodId, string> = {
  '3m': 'org.dashboard_period_3m',
  '6m': 'org.dashboard_period_6m',
  '12m': 'org.dashboard_period_12m',
}
const PERIOD_MONTHS: Record<PeriodId, number> = { '3m': 3, '6m': 6, '12m': 12 }

// Chart geometry in viewBox units (the SVG scales to the container width).
const VIEW_W = 720
const VIEW_H = 260
const PAD = { top: 12, right: 12, bottom: 28, left: 64 }
const INNER_W = VIEW_W - PAD.left - PAD.right
const INNER_H = VIEW_H - PAD.top - PAD.bottom

const { t, locale } = useI18n()

// ── Summary figures, derived from the single sample series ──────────────────
const totalIncome = computed(() => DASHBOARD_SERIES.reduce((sum, point) => sum + point.income, 0))
const totalExpenses = computed(() =>
  DASHBOARD_SERIES.reduce((sum, point) => sum + point.expenses, 0),
)
const balance = computed(() => totalIncome.value - totalExpenses.value)

const percentTrend = (key: 'income' | 'expenses'): number | null => {
  const count = DASHBOARD_SERIES.length
  if (count < 2) return null
  const last = DASHBOARD_SERIES[count - 1]
  const previous = DASHBOARD_SERIES[count - 2]
  if (last === undefined || previous === undefined || previous[key] === 0) return null
  return (last[key] - previous[key]) / previous[key]
}

const incomeTrend = computed(() => percentTrend('income'))
const expensesTrend = computed(() => percentTrend('expenses'))
// For income, growth is good; for expenses, growth is bad.
const incomeTrendGood = computed(() => (incomeTrend.value ?? 0) >= 0)
const expensesTrendGood = computed(() => (expensesTrend.value ?? 0) < 0)

const incomeAmount = computed(() =>
  formatDashboardMoney(totalIncome.value, DASHBOARD_CURRENCY, locale.value),
)
const expensesAmount = computed(() =>
  formatDashboardMoney(totalExpenses.value, DASHBOARD_CURRENCY, locale.value),
)
const balanceAmount = computed(() =>
  formatDashboardMoney(balance.value, DASHBOARD_CURRENCY, locale.value),
)
const receivablesAmount = computed(() =>
  formatDashboardMoney(DASHBOARD_RECEIVABLES, DASHBOARD_CURRENCY, locale.value),
)

// ── Chart ───────────────────────────────────────────────────────────────────
const period = ref<PeriodId>('6m')
const series = computed(() => DASHBOARD_SERIES.slice(-PERIOD_MONTHS[period.value]))

/** Rounds up to a value whose quarters are clean numbers for the axis. */
const niceCeil = (value: number): number => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const unit = value / power
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 4 ? 4 : unit <= 8 ? 8 : 10
  return nice * power
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const chartTop = computed(() =>
  niceCeil(Math.max(1, ...series.value.map((point) => Math.max(point.income, point.expenses)))),
)

const xAt = (index: number): number => {
  const count = series.value.length
  if (count <= 1) return PAD.left + INNER_W / 2
  return PAD.left + (index * INNER_W) / (count - 1)
}
const yAt = (value: number): number => PAD.top + INNER_H * (1 - value / chartTop.value)

const linePath = (pick: (point: (typeof DASHBOARD_SERIES)[number]) => number): string =>
  series.value
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${round1(xAt(index))} ${round1(yAt(pick(point)))}`,
    )
    .join(' ')

const incomePath = computed(() => linePath((point) => point.income))
const expensesPath = computed(() => linePath((point) => point.expenses))
const incomeAreaPath = computed(() => {
  const count = series.value.length
  if (count === 0) return ''
  const base = PAD.top + INNER_H
  return `${linePath((point) => point.income)} L${round1(xAt(count - 1))} ${round1(base)} L${round1(xAt(0))} ${round1(base)} Z`
})

const incomePoints = computed(() =>
  series.value.map((point, index) => ({ x: round1(xAt(index)), y: round1(yAt(point.income)) })),
)
const expensesPoints = computed(() =>
  series.value.map((point, index) => ({ x: round1(xAt(index)), y: round1(yAt(point.expenses)) })),
)

const chartTicks = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = chartTop.value * fraction
    return { value, label: formatDashboardCompact(value, locale.value) }
  }),
)

// With 12 points, every other month is labelled so the axis never crowds.
const showXLabel = (index: number): boolean => {
  const count = series.value.length
  if (count <= 8) return true
  return index % 2 === 0 || index === count - 1
}

// Hover/focus inspection: a guide line plus a localized tooltip. Keyboard users
// step through months with the arrow keys.
const chartSvg = ref<SVGSVGElement | null>(null)
const chartHover = ref<number | null>(null)

const onChartPointerMove = (event: PointerEvent): void => {
  const svg = chartSvg.value
  if (svg === null) return
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0) return
  const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_W
  const count = series.value.length
  if (count === 0) return
  const step = count === 1 ? INNER_W : INNER_W / (count - 1)
  const index = Math.round((viewX - PAD.left) / step)
  chartHover.value = Math.min(count - 1, Math.max(0, index))
}

const onChartStep = (direction: -1 | 1): void => {
  const count = series.value.length
  const current = chartHover.value ?? (direction === 1 ? -1 : 0)
  chartHover.value = Math.min(count - 1, Math.max(0, current + direction))
}

const onChartFocus = (): void => {
  if (chartHover.value === null && series.value.length > 0) {
    chartHover.value = series.value.length - 1
  }
}

const hoverTooltip = computed(() => {
  const index = chartHover.value
  const point = series.value[index ?? -1]
  if (index === null || point === undefined) return null
  const clampedLeft = Math.min(86, Math.max(14, (xAt(index) / VIEW_W) * 100))
  const topY = Math.min(yAt(point.income), yAt(point.expenses))
  return {
    style: { left: `${clampedLeft}%`, top: `${(topY / VIEW_H) * 100}%` },
    month: formatDashboardMonth(point.month, locale.value),
    income: formatDashboardMoney(point.income, DASHBOARD_CURRENCY, locale.value),
    expenses: formatDashboardMoney(point.expenses, DASHBOARD_CURRENCY, locale.value),
  }
})

// ── Transactions ────────────────────────────────────────────────────────────
const typeLabelKey = (type: DashboardTransactionType): string =>
  type === 'income' ? 'org.dashboard_type_income' : 'org.dashboard_type_expense'

const statusLabelKey = (status: DashboardTransactionStatus): string =>
  status === 'completed' ? 'org.dashboard_status_completed' : 'org.dashboard_status_pending'
</script>

<template>
  <section class="dash">
    <header class="dash__intro">
      <h1 class="dash__title">{{ t('org.dashboard_title') }}</h1>
      <p class="dash__subtitle">{{ t('org.dashboard_subtitle') }}</p>
      <p class="dash__notice">{{ t('org.dashboard_sample_notice') }}</p>
    </header>

    <div class="dash__cards">
      <article class="dash-card dash-sumcard">
        <span class="dash-sumcard__icon dash-sumcard__icon--income" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M17 7 7 17" />
            <path d="M17 17H7V7" />
          </svg>
        </span>
        <p class="dash-sumcard__label">{{ t('org.dashboard_card_income') }}</p>
        <p class="dash-sumcard__amount">{{ incomeAmount }}</p>
        <p
          v-if="incomeTrend !== null"
          class="dash-sumcard__trend"
          :class="incomeTrendGood ? 'dash-sumcard__trend--good' : 'dash-sumcard__trend--bad'"
        >
          <span class="dash-sumcard__trend-value">
            {{ formatDashboardPercent(incomeTrend, locale) }}
          </span>
          <span class="dash-sumcard__trend-label">{{ t('org.dashboard_vs_prev_month') }}</span>
        </p>
      </article>

      <article class="dash-card dash-sumcard">
        <span class="dash-sumcard__icon dash-sumcard__icon--expenses" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
        <p class="dash-sumcard__label">{{ t('org.dashboard_card_expenses') }}</p>
        <p class="dash-sumcard__amount">{{ expensesAmount }}</p>
        <p
          v-if="expensesTrend !== null"
          class="dash-sumcard__trend"
          :class="expensesTrendGood ? 'dash-sumcard__trend--good' : 'dash-sumcard__trend--bad'"
        >
          <span class="dash-sumcard__trend-value">
            {{ formatDashboardPercent(expensesTrend, locale) }}
          </span>
          <span class="dash-sumcard__trend-label">{{ t('org.dashboard_vs_prev_month') }}</span>
        </p>
      </article>

      <article class="dash-card dash-sumcard">
        <span class="dash-sumcard__icon dash-sumcard__icon--balance" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </span>
        <p class="dash-sumcard__label">{{ t('org.dashboard_card_balance') }}</p>
        <p class="dash-sumcard__amount">{{ balanceAmount }}</p>
      </article>

      <article class="dash-card dash-sumcard">
        <span class="dash-sumcard__icon dash-sumcard__icon--receivables" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </span>
        <p class="dash-sumcard__label">{{ t('org.dashboard_card_receivables') }}</p>
        <p class="dash-sumcard__amount">{{ receivablesAmount }}</p>
      </article>
    </div>

    <article class="dash-card">
      <div class="dash-chart__head">
        <h2 class="dash-card__title">{{ t('org.dashboard_chart_title') }}</h2>
        <div class="dash-chart__controls">
          <div class="dash-legend" aria-hidden="true">
            <span class="dash-legend__item">
              <span class="dash-legend__swatch dash-legend__swatch--income"></span>
              {{ t('org.dashboard_legend_income') }}
            </span>
            <span class="dash-legend__item">
              <span class="dash-legend__swatch dash-legend__swatch--expenses"></span>
              {{ t('org.dashboard_legend_expenses') }}
            </span>
          </div>
          <div class="dash-period" role="group" :aria-label="t('org.dashboard_chart_title')">
            <button
              v-for="periodId in PERIOD_IDS"
              :key="periodId"
              type="button"
              class="dash-period__btn"
              :class="{ 'dash-period__btn--active': period === periodId }"
              :aria-pressed="period === periodId"
              @click="period = periodId"
            >
              {{ t(PERIOD_LABEL_KEYS[periodId]) }}
            </button>
          </div>
        </div>
      </div>

      <div
        class="dash-chart__frame"
        tabindex="0"
        :aria-label="t('org.dashboard_chart_aria')"
        @focus="onChartFocus"
        @blur="chartHover = null"
        @keydown.left.prevent="onChartStep(-1)"
        @keydown.right.prevent="onChartStep(1)"
      >
        <div class="dash-chart__scroll">
          <div class="dash-chart__canvas">
            <svg
              ref="chartSvg"
              class="dash-chart__svg"
              viewBox="0 0 720 260"
              aria-hidden="true"
              focusable="false"
              @pointermove="onChartPointerMove"
              @pointerleave="chartHover = null"
            >
              <g>
                <template v-for="tick in chartTicks" :key="`grid-${tick.value}`">
                  <line
                    class="dash-chart__grid"
                    :x1="PAD.left"
                    :x2="VIEW_W - PAD.right"
                    :y1="yAt(tick.value)"
                    :y2="yAt(tick.value)"
                  />
                  <text
                    class="dash-chart__ylabel"
                    :x="PAD.left - 8"
                    :y="yAt(tick.value) + 4"
                    text-anchor="end"
                  >
                    {{ tick.label }}
                  </text>
                </template>
              </g>

              <template v-for="(point, index) in series" :key="`xlabel-${point.month}`">
                <text
                  v-if="showXLabel(index)"
                  class="dash-chart__xlabel"
                  :x="xAt(index)"
                  :y="VIEW_H - 8"
                  text-anchor="middle"
                >
                  {{ formatDashboardMonth(point.month, locale) }}
                </text>
              </template>

              <path class="dash-chart__area" :d="incomeAreaPath" />
              <path class="dash-chart__line dash-chart__line--expenses" :d="expensesPath" />
              <path class="dash-chart__line dash-chart__line--income" :d="incomePath" />

              <line
                v-if="chartHover !== null"
                class="dash-chart__guide"
                :x1="xAt(chartHover)"
                :x2="xAt(chartHover)"
                :y1="PAD.top"
                :y2="PAD.top + INNER_H"
              />
              <circle
                v-for="(point, index) in incomePoints"
                :key="`dot-income-${index}`"
                class="dash-chart__dot dash-chart__dot--income"
                :cx="point.x"
                :cy="point.y"
                :r="chartHover === index ? 4.5 : 3"
              />
              <circle
                v-for="(point, index) in expensesPoints"
                :key="`dot-expenses-${index}`"
                class="dash-chart__dot dash-chart__dot--expenses"
                :cx="point.x"
                :cy="point.y"
                :r="chartHover === index ? 4.5 : 3"
              />
            </svg>

            <div
              v-if="hoverTooltip !== null"
              class="dash-chart__tooltip"
              :style="hoverTooltip.style"
            >
              <p class="dash-chart__tooltip-month">{{ hoverTooltip.month }}</p>
              <p class="dash-chart__tooltip-row">
                <span
                  class="dash-chart__swatch dash-chart__swatch--income"
                  aria-hidden="true"
                ></span>
                {{ t('org.dashboard_legend_income') }}:
                <span class="dash-chart__tooltip-value">{{ hoverTooltip.income }}</span>
              </p>
              <p class="dash-chart__tooltip-row">
                <span
                  class="dash-chart__swatch dash-chart__swatch--expenses"
                  aria-hidden="true"
                ></span>
                {{ t('org.dashboard_legend_expenses') }}:
                <span class="dash-chart__tooltip-value">{{ hoverTooltip.expenses }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div class="dash__bottom">
      <article class="dash-card">
        <h2 class="dash-card__title">{{ t('org.dashboard_transactions_title') }}</h2>
        <div
          class="dash-table-wrap"
          role="region"
          tabindex="0"
          :aria-label="t('org.dashboard_transactions_title')"
        >
          <table class="dash-table">
            <thead>
              <tr>
                <th scope="col">{{ t('org.dashboard_tx_description') }}</th>
                <th scope="col">{{ t('org.dashboard_tx_date') }}</th>
                <th scope="col">{{ t('org.dashboard_tx_type') }}</th>
                <th scope="col" class="dash-table__num">{{ t('org.dashboard_tx_amount') }}</th>
                <th scope="col">{{ t('org.dashboard_tx_status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in DASHBOARD_TRANSACTIONS" :key="transaction.id">
                <td>
                  <span class="dash-table__desc">{{ t(transaction.categoryKey) }}</span>
                  <span v-if="transaction.counterparty !== null" class="dash-table__sub">
                    {{ transaction.counterparty }}
                  </span>
                </td>
                <td class="dash-table__muted">
                  {{ formatDashboardDate(transaction.date, locale) }}
                </td>
                <td class="dash-table__muted">{{ t(typeLabelKey(transaction.type)) }}</td>
                <td
                  class="dash-table__num"
                  :class="
                    transaction.type === 'income' ? 'dash-table__income' : 'dash-table__expense'
                  "
                >
                  {{ transaction.type === 'income' ? '+' : '−' }}
                  {{ formatDashboardMoney(transaction.amount, DASHBOARD_CURRENCY, locale) }}
                </td>
                <td>
                  <span
                    class="dash-badge"
                    :class="
                      transaction.status === 'completed'
                        ? 'dash-badge--success'
                        : 'dash-badge--warning'
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

      <div class="dash__side">
        <article class="dash-card">
          <h2 class="dash-card__title">{{ t('org.dashboard_quick_actions') }}</h2>
          <div class="dash-actions">
            <button type="button" class="dash-action" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M12 12v6" />
                <path d="M9 15h6" />
              </svg>
              <span>{{ t('org.dashboard_qa_create_invoice') }}</span>
            </button>
            <button type="button" class="dash-action" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M17 7 7 17" />
                <path d="M17 17H7V7" />
              </svg>
              <span>{{ t('org.dashboard_qa_record_income') }}</span>
            </button>
            <button type="button" class="dash-action" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
              <span>{{ t('org.dashboard_qa_record_expense') }}</span>
            </button>
            <button type="button" class="dash-action" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
              <span>{{ t('org.dashboard_qa_view_transactions') }}</span>
            </button>
          </div>
          <p class="dash-actions__note">{{ t('org.dashboard_qa_unavailable') }}</p>
        </article>

        <article class="dash-card">
          <h2 class="dash-card__title">{{ t('org.dashboard_attention_title') }}</h2>
          <dl class="dash-attention">
            <div
              v-for="item in DASHBOARD_ATTENTION"
              :key="item.labelKey"
              class="dash-attention__row"
            >
              <dt>{{ t(item.labelKey) }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash {
  /* Size container for the container queries at the end of this style block:
     the grids react to the width this page actually receives, which depends
     on the sidebar, not only on the viewport. The shell content column
     already provides the top inset. */
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width-dashboard);
}

.dash__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dash__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.dash__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}

.dash__notice {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Shared card surface ────────────────────────────────────────────────── */
.dash-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.dash-card__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}

/* ── Summary cards ──────────────────────────────────────────────────────── */
.dash__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.dash-sumcard {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dash-sumcard__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
}

.dash-sumcard__icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dash-sumcard__icon--income {
  background-color: var(--color-success-surface);
  color: var(--color-success);
}

.dash-sumcard__icon--expenses {
  background-color: var(--color-danger-surface);
  color: var(--color-danger);
}

.dash-sumcard__icon--balance {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.dash-sumcard__icon--receivables {
  background-color: var(--color-warning-surface);
  color: var(--color-warning);
}

.dash-sumcard__label {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dash-sumcard__amount {
  overflow-wrap: anywhere;
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.dash-sumcard__trend {
  display: flex;
  gap: var(--space-1);
  align-items: baseline;
  margin: 0;
  font-size: var(--font-size-sm);
}

.dash-sumcard__trend-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dash-sumcard__trend--good .dash-sumcard__trend-value {
  color: var(--color-success);
}

.dash-sumcard__trend--bad .dash-sumcard__trend-value {
  color: var(--color-danger);
}

.dash-sumcard__trend-label {
  color: var(--color-text-muted);
}

/* ── Chart ──────────────────────────────────────────────────────────────── */
.dash-chart__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.dash-chart__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  align-items: center;
}

.dash-legend {
  display: flex;
  gap: var(--space-4);
}

.dash-legend__item {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dash-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.dash-legend__swatch--income {
  background-color: var(--color-success);
}

.dash-legend__swatch--expenses {
  background-color: var(--color-danger);
}

.dash-period {
  display: flex;
  gap: var(--space-1);
}

.dash-period__btn {
  padding: var(--space-1) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.dash-period__btn:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.dash-period__btn--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 600;
}

.dash-period__btn:focus-visible,
.dash-chart__frame:focus-visible,
.dash-table-wrap:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.dash-chart__frame {
  position: relative;
  border-radius: var(--radius-sm);
}

.dash-chart__scroll {
  overflow-x: auto;
}

.dash-chart__canvas {
  position: relative;
  min-width: 30rem;
}

.dash-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
}

.dash-chart__grid {
  stroke: var(--color-border);
  stroke-width: 1;
}

.dash-chart__ylabel,
.dash-chart__xlabel {
  font-size: 12px;
  fill: var(--color-text-muted);
}

.dash-chart__area {
  fill: var(--color-success);
  opacity: 0.07;
}

.dash-chart__line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dash-chart__line--income {
  stroke: var(--color-success);
}

.dash-chart__line--expenses {
  stroke: var(--color-danger);
}

.dash-chart__dot {
  stroke: var(--color-surface);
  stroke-width: 1.5;
}

.dash-chart__dot--income {
  fill: var(--color-success);
}

.dash-chart__dot--expenses {
  fill: var(--color-danger);
}

.dash-chart__guide {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.dash-chart__tooltip {
  position: absolute;
  min-width: 11rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 12px));
}

.dash-chart__tooltip-month {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.dash-chart__tooltip-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dash-chart__tooltip-value {
  margin-left: auto;
  color: var(--color-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dash-chart__swatch {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.dash-chart__swatch--income {
  background-color: var(--color-success);
}

.dash-chart__swatch--expenses {
  background-color: var(--color-danger);
}

/* ── Transactions table ─────────────────────────────────────────────────── */
.dash__bottom {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.dash-table-wrap {
  overflow-x: auto;
  margin-top: var(--space-3);
}

.dash-table {
  width: 100%;
  min-width: 42rem;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.dash-table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.dash-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.dash-table tbody tr:last-child td {
  border-bottom: 0;
}

.dash-table__desc {
  display: block;
  font-weight: 500;
}

.dash-table__sub {
  display: block;
  color: var(--color-text-muted);
}

.dash-table__muted {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.dash-table__num {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.dash-table__income {
  color: var(--color-success);
}

.dash-table__expense {
  color: var(--color-danger);
}

.dash-badge {
  display: inline-flex;
  padding: 0.125rem var(--space-2);
  border-radius: 999px;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.dash-badge--success {
  background-color: var(--color-success-surface);
  color: var(--color-success);
}

.dash-badge--warning {
  background-color: var(--color-warning-surface);
  color: var(--color-warning);
}

/* ── Quick actions + attention ──────────────────────────────────────────── */
.dash-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.dash-action {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  text-align: left;
  cursor: pointer;
}

.dash-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dash-action svg {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dash-actions__note {
  margin: var(--space-3) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dash-attention {
  margin: var(--space-2) 0 0;
}

.dash-attention__row {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.dash-attention__row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.dash-attention dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.dash-attention dd {
  margin: 0;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 64rem) {
  .dash__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dash__bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 34rem) {
  .dash__cards {
    grid-template-columns: minmax(0, 1fr);
  }

  .dash-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}

/*
 * Container refinement. The media queries above react to the viewport, but
 * the space the Dashboard receives also depends on the sidebar (expanded,
 * collapsed or a mobile drawer). These rules restate the same grids against
 * the page's own width; placed after the media queries they win where they
 * match in modern browsers, while browsers without container queries keep
 * the viewport behaviour above.
 */
@container (width < 60rem) {
  .dash__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (width < 36rem) {
  .dash__cards {
    grid-template-columns: minmax(0, 1fr);
  }

  .dash-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* The transactions table needs its 42rem minimum; below this width the
   two-column split would force an inner horizontal scrollbar onto it, so it
   stacks and keeps the full page width. */
@container (width < 66rem) {
  .dash__bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
