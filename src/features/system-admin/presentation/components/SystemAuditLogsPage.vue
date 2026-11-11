<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { auditRowKey, type AuditLogEntry } from '../../domain/auditLog'
import { formatSystemDateTime } from '../../domain/format'
import {
  AUDIT_RANGE_PRESETS,
  useAuditLogs,
  type AuditRangePresetId,
} from '../composables/useAuditLogs'

/**
 * The SYSTEM Audit Logs page, reading the FastAPI audit endpoint through the
 * feature's repository. The period presets map to the `occurred_from`/
 * `occurred_to` window, slices arrive newest-first, and `next_cursor` drives
 * the Load-more control. There is no detail endpoint: expanding a row shows the
 * fields the list item already carries.
 */
const { t, locale } = useI18n()

const {
  status,
  errorKind,
  preset,
  load,
  loadMore,
  loadingMore,
  hasMore,
  total,
  entries,
} = useAuditLogs()

onMounted(() => {
  void load()
})

// ── Row expansion: the list item is the single source of audit data ─────────
const expandedId = ref<string | null>(null)

// Toolbar actions collapse any open detail row before reloading the window.
const selectPreset = (id: AuditRangePresetId): void => {
  expandedId.value = null
  void load(id)
}

const refresh = (): void => {
  expandedId.value = null
  void load()
}

const loadNext = (): void => {
  void loadMore()
}

const toggleDetails = (entry: AuditLogEntry): void => {
  expandedId.value = expandedId.value === entry.id ? null : entry.id
}

// ── Safe presentation of nullable fields ─────────────────────────────────────
const display = (value: string | number | null): string => (value === null ? '—' : String(value))

const occurredAt = (entry: AuditLogEntry): string =>
  entry.occurredAt === null ? '—' : formatSystemDateTime(entry.occurredAt, locale.value)

const resourceValue = (entry: AuditLogEntry): string | null => {
  if (entry.resourceType === null && entry.resourceId === null) return null
  return [entry.resourceType, entry.resourceId].filter((part) => part !== null).join(':')
}

const payloadText = (entry: AuditLogEntry): string | null =>
  entry.details === undefined || entry.details === null
    ? null
    : JSON.stringify(entry.details, null, 2)

const expandedDetail = computed(
  () => entries.value.find((entry) => entry.id === expandedId.value) ?? null,
)
</script>

<template>
  <section class="audit" :aria-busy="status === 'loading'">
    <header class="audit__intro">
      <h1 class="audit__title">{{ t('system.audit_title') }}</h1>
      <p class="audit__subtitle">{{ t('system.audit_subtitle') }}</p>
    </header>

    <div class="audit__toolbar">
      <div class="audit-period" role="group" :aria-label="t('system.audit_range_label')">
        <button
          v-for="id in AUDIT_RANGE_PRESETS"
          :key="id"
          type="button"
          class="audit-period__btn"
          :class="{ 'audit-period__btn--active': preset === id }"
          :aria-pressed="preset === id"
          @click="selectPreset(id)"
        >
          {{ t(`system.audit_range_${id}`) }}
        </button>
      </div>
      <div class="audit__toolbar-end">
        <p v-if="status === 'ready'" class="audit__count">
          {{ t('system.audit_count', { count: total }) }}
        </p>
        <button
          type="button"
          class="audit-period__btn"
          :disabled="status === 'loading'"
          @click="refresh"
        >
          {{ t('system.audit_refresh') }}
        </button>
      </div>
    </div>

    <p v-if="status === 'loading'" class="audit__status">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="audit-card audit__error" role="alert">
      <p class="audit__error-text">
        {{
          errorKind === 'Forbidden'
            ? t('system.audit_error_forbidden')
            : t('system.audit_error_load')
        }}
      </p>
      <button type="button" class="audit-period__btn" @click="refresh">
        {{ t('system.audit_retry') }}
      </button>
    </div>

    <template v-else>
      <p v-if="total === 0" class="audit__status" role="status">{{ t('system.audit_empty') }}</p>

      <template v-else>
        <article class="audit-card">
          <div
            class="audit-table-wrap"
            role="region"
            tabindex="0"
            :aria-label="t('system.audit_title')"
          >
            <table class="audit-table">
              <thead>
                <tr>
                  <th scope="col">{{ t('system.audit_col_time') }}</th>
                  <th scope="col">{{ t('system.audit_col_action') }}</th>
                  <th scope="col">{{ t('system.audit_col_actor') }}</th>
                  <th scope="col">{{ t('system.audit_col_resource') }}</th>
                  <th scope="col">{{ t('system.audit_col_ip') }}</th>
                  <th scope="col" class="audit-table__actions"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="entry in entries" :key="auditRowKey(entry)">
                  <tr>
                    <td class="audit-table__muted">{{ occurredAt(entry) }}</td>
                    <td>
                      <span class="audit-action-chip">{{ display(entry.action) }}</span>
                    </td>
                    <td :title="entry.actorUserId ?? undefined">
                      <span class="audit-table__desc audit-table__mono">
                        {{ display(entry.actorUserId) }}
                      </span>
                      <span v-if="entry.actorType !== null" class="audit-table__sub">
                        {{ entry.actorType }}
                      </span>
                    </td>
                    <td class="audit-table__muted" :title="resourceValue(entry) ?? undefined">
                      <span class="audit-table__mono">{{ display(resourceValue(entry)) }}</span>
                    </td>
                    <td class="audit-table__muted">{{ display(entry.ip) }}</td>
                    <td class="audit-table__actions">
                      <button
                        type="button"
                        class="audit-toggle"
                        :aria-expanded="expandedId === entry.id"
                        :aria-label="t('system.audit_row_details')"
                        @click="toggleDetails(entry)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="expandedId === entry.id">
                    <td colspan="6">
                      <div :id="`audit-detail-${auditRowKey(entry)}`" class="audit-detail">
                        <div class="audit-detail__head">
                          <h3 class="audit-detail__title">
                            {{ t('system.audit_details_title') }}
                          </h3>
                          <button
                            type="button"
                            class="audit-period__btn"
                            :aria-label="t('system.audit_details_close')"
                            @click="expandedId = null"
                          >
                            {{ t('system.audit_details_close') }}
                          </button>
                        </div>

                        <dl v-if="expandedDetail !== null" class="audit-detail__grid">
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_col_time') }}</dt>
                            <dd>{{ occurredAt(expandedDetail) }}</dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_col_action') }}</dt>
                            <dd>{{ display(expandedDetail.action) }}</dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_details_user') }}</dt>
                            <dd class="audit-detail__wrap">
                              {{ display(expandedDetail.actorUserId) }}
                            </dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.principal') }}</dt>
                            <dd>{{ display(expandedDetail.actorType) }}</dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_details_auth_method') }}</dt>
                            <dd>{{ display(expandedDetail.authMethod) }}</dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_details_cert_serial') }}</dt>
                            <dd class="audit-detail__wrap">
                              {{ display(expandedDetail.certSerial) }}
                            </dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_col_resource') }}</dt>
                            <dd class="audit-detail__wrap">
                              {{ display(resourceValue(expandedDetail)) }}
                            </dd>
                          </div>
                          <div class="audit-detail__item">
                            <dt>{{ t('system.audit_col_ip') }}</dt>
                            <dd class="audit-detail__wrap">{{ display(expandedDetail.ip) }}</dd>
                          </div>
                          <div class="audit-detail__item audit-detail__item--wide">
                            <dt>{{ t('system.audit_details_request_id') }}</dt>
                            <dd class="audit-detail__wrap">
                              {{ display(expandedDetail.requestId) }}
                            </dd>
                          </div>
                          <div class="audit-detail__item audit-detail__item--wide">
                            <dt>{{ t('system.audit_details_uuid') }}</dt>
                            <dd class="audit-detail__wrap">{{ display(expandedDetail.id) }}</dd>
                          </div>
                          <div class="audit-detail__item audit-detail__item--wide">
                            <dt>{{ t('system.audit_details_payload') }}</dt>
                            <dd>
                              <pre
                                v-if="payloadText(expandedDetail) !== null"
                                class="audit-detail__payload"
                                >{{ payloadText(expandedDetail) }}</pre
                              >
                              <span v-else class="audit-detail__none">
                                {{ t('system.audit_details_no_data') }}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </article>

        <nav v-if="hasMore || loadingMore" class="audit-pagination" :aria-label="t('system.audit_title')">
          <button
            type="button"
            class="audit-period__btn"
            :disabled="loadingMore"
            @click="loadNext"
          >
            {{ t('system.audit_next_page') }}
          </button>
        </nav>
      </template>
    </template>
  </section>
</template>

<style scoped>
.audit {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width-dashboard);
  padding-top: var(--space-5);
}

.audit__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.audit__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.audit__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}

/* ── Toolbar: period presets, count, refresh ────────────────────────────── */
.audit__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  align-items: center;
  justify-content: space-between;
}

.audit__toolbar-end {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  align-items: center;
}

.audit__count {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.audit-period {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.audit-period__btn {
  padding: var(--space-1) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.audit-period__btn:hover:not(:disabled) {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.audit-period__btn--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 600;
}

.audit-period__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.audit-period__btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* ── Card, states ───────────────────────────────────────────────────────── */
.audit-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.audit__status {
  margin: 0;
  color: var(--color-text-muted);
}

.audit__error {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  align-items: center;
  justify-content: space-between;
}

.audit__error-text {
  margin: 0;
}

/* ── Table ──────────────────────────────────────────────────────────────── */
.audit-table-wrap {
  overflow-x: auto;
}

.audit-table {
  width: 100%;
  min-width: 46rem;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.audit-table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.audit-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.audit-table tbody tr:last-child td {
  border-bottom: 0;
}

.audit-table__desc {
  display: block;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.audit-table__sub {
  display: block;
  color: var(--color-text-muted);
}

.audit-table__muted {
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Long identifiers (UUIDs) stay on one line and truncate; the cell's `title`
   carries the full value. */
.audit-table__mono {
  display: block;
  max-width: 18ch;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-table__actions {
  width: 2.5rem;
  text-align: right;
}

.audit-table-wrap:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.audit-action-chip {
  display: inline-flex;
  padding: 0.125rem var(--space-2);
  border-radius: 999px;
  background-color: var(--color-info-surface);
  color: var(--color-info);
  overflow-wrap: anywhere;
  white-space: normal;
}

.audit-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.audit-toggle:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.audit-toggle:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.audit-toggle svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.audit-toggle[aria-expanded='true'] svg {
  transform: rotate(180deg);
}

/* ── Expanded detail row ────────────────────────────────────────────────── */
.audit-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
}

.audit-detail__head {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.audit-detail__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}

.audit-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: 0;
}

.audit-detail__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.audit-detail__item--wide {
  grid-column: 1 / -1;
}

.audit-detail__item dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.audit-detail__item dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.audit-detail__wrap {
  overflow-wrap: anywhere;
}

.audit-detail__payload {
  max-height: 16rem;
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-y: auto;
}

.audit-detail__none {
  color: var(--color-text-muted);
}

/* ── Pagination (cursor: load more) ─────────────────────────────────────── */
.audit-pagination {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: flex-end;
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 48rem) {
  .audit-detail__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .audit-pagination {
    justify-content: space-between;
  }
}
</style>
