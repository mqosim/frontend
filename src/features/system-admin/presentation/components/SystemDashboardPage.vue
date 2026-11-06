<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

import { formatSystemCount, formatSystemDate } from '../../domain/format'
import { SYSTEM_ACTIVITY, SYSTEM_REGISTRATIONS, SYSTEM_STATS } from '../../domain/systemSampleData'

/**
 * The SYSTEM (Superadmin) platform Dashboard. All figures, organization names
 * and activity entries come from `systemSampleData.ts` — a development
 * placeholder until the management services exist; the page presents them as
 * sample data and reads only the exported types, so real services can replace
 * the module without touching this file.
 */
const { t, locale } = useI18n()

const statCards: readonly { id: string; value: number; iconId: string }[] = [
  { id: 'organizations', value: SYSTEM_STATS.organizations, iconId: 'organizations' },
  { id: 'users', value: SYSTEM_STATS.users, iconId: 'users' },
  { id: 'subs', value: SYSTEM_STATS.activeSubscriptions, iconId: 'subscriptions' },
  { id: 'new-orgs', value: SYSTEM_STATS.newOrganizations30d, iconId: 'reports' },
]
</script>

<template>
  <section class="sdash">
    <header class="sdash__intro">
      <p class="sdash__eyebrow">
        <span class="sdash__badge">{{ t('system.badge') }}</span>
      </p>
      <h1 class="sdash__title">{{ t('system.dash_title') }}</h1>
      <p class="sdash__subtitle">{{ t('system.dash_subtitle') }}</p>
      <p class="sdash__notice">{{ t('system.dash_sample_notice') }}</p>
    </header>

    <div class="sdash__cards">
      <article v-for="card in statCards" :key="card.id" class="sdash-card sdash-sumcard">
        <span class="sdash-sumcard__icon" aria-hidden="true">
          <ModuleIcon :id="card.iconId" :size="20" />
        </span>
        <p class="sdash-sumcard__label">{{ t(`system.dash_card_${card.id}`) }}</p>
        <p class="sdash-sumcard__amount">{{ formatSystemCount(card.value, locale) }}</p>
      </article>
    </div>

    <div class="sdash__panels">
      <article class="sdash-card">
        <h2 class="sdash-card__title">{{ t('system.dash_registrations_title') }}</h2>
        <div
          class="sdash-table-wrap"
          role="region"
          tabindex="0"
          :aria-label="t('system.dash_registrations_title')"
        >
          <table class="sdash-table">
            <thead>
              <tr>
                <th scope="col">{{ t('system.dash_reg_name') }}</th>
                <th scope="col">{{ t('system.dash_reg_plan') }}</th>
                <th scope="col">{{ t('system.dash_reg_date') }}</th>
                <th scope="col">{{ t('system.dash_reg_status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="registration in SYSTEM_REGISTRATIONS" :key="registration.id">
                <td>
                  <span class="sdash-table__desc">{{ registration.name }}</span>
                </td>
                <td class="sdash-table__muted">{{ t(registration.planKey) }}</td>
                <td class="sdash-table__muted">
                  {{ formatSystemDate(registration.date, locale) }}
                </td>
                <td>
                  <span
                    class="sdash-badge"
                    :class="
                      registration.statusKey === 'system.dash_status_active'
                        ? 'sdash-badge--success'
                        : 'sdash-badge--info'
                    "
                  >
                    {{ t(registration.statusKey) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="sdash-card">
        <h2 class="sdash-card__title">{{ t('system.dash_activity_title') }}</h2>
        <ul class="sdash-activity">
          <li v-for="event in SYSTEM_ACTIVITY" :key="event.id" class="sdash-activity__item">
            <span class="sdash-activity__dot" aria-hidden="true"></span>
            <span class="sdash-activity__body">
              <span class="sdash-activity__action">{{ t(event.actionKey) }}</span>
              <span class="sdash-activity__meta">
                {{ event.actor }} · {{ formatSystemDate(event.date, locale) }}
              </span>
            </span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.sdash {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width-dashboard);
  padding-top: var(--space-5);
}

.sdash__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sdash__eyebrow {
  margin: 0;
}

.sdash__badge {
  display: inline-flex;
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
}

.sdash__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.sdash__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}

.sdash__notice {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Shared card surface (org Dashboard's design language) ──────────────── */
.sdash-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.sdash-card__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}

/* ── Platform stat cards ────────────────────────────────────────────────── */
.sdash__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.sdash-sumcard {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sdash-sumcard__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.sdash-sumcard__label {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.sdash-sumcard__amount {
  overflow-wrap: anywhere;
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

/* ── Registrations and activity ─────────────────────────────────────────── */
.sdash__panels {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--space-4);
  align-items: start;
}

.sdash-table-wrap {
  overflow-x: auto;
  margin-top: var(--space-3);
}

.sdash-table {
  width: 100%;
  min-width: 26rem;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.sdash-table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.sdash-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.sdash-table tbody tr:last-child td {
  border-bottom: 0;
}

.sdash-table__desc {
  display: block;
  font-weight: 500;
}

.sdash-table__muted {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.sdash-badge {
  display: inline-flex;
  padding: 0.125rem var(--space-2);
  border-radius: 999px;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.sdash-badge--success {
  background-color: var(--color-success-surface);
  color: var(--color-success);
}

.sdash-badge--info {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.sdash-table-wrap:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.sdash-activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.sdash-activity__item {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
}

.sdash-activity__dot {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: var(--color-info);
}

.sdash-activity__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sdash-activity__action {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.sdash-activity__meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 64rem) {
  .sdash__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sdash__panels {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 40rem) {
  .sdash__cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
