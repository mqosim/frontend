<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'

import type { AdminImportReport, AdminImportRequest } from '../../../domain/adminI18n'
import { i18nActionErrorKey } from '../../adminErrors'
import { useAdminUseCases } from '../../composables/useAdminUseCases'

/**
 * Bulk catalog import in the legacy seed shape (`POST /system/i18n/import`,
 * `i18n.manage`). The textarea holds `{pages?, phrases?}`; overwrite and
 * dry-run are separate toggles because they are request flags, not data.
 * Conflicts are reported back — a stored value is never silently replaced.
 */
const { t } = useI18n()
const admin = useAdminUseCases()

const payload = ref('')
const overwrite = ref(false)
const dryRun = ref(true)

const running = ref(false)
const report = shallowRef<AdminImportReport | null>(null)
const actionErrorKey = ref<string | null>(null)
const localErrorKey = ref<string | null>(null)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const run = async (): Promise<void> => {
  if (running.value) return
  actionErrorKey.value = null
  localErrorKey.value = null
  report.value = null

  let parsed: unknown
  try {
    parsed = JSON.parse(payload.value)
  } catch {
    localErrorKey.value = 'system.i18n_import_invalid_json'
    return
  }
  if (!isRecord(parsed)) {
    localErrorKey.value = 'system.i18n_import_invalid_shape'
    return
  }

  const pagesRaw = parsed.pages
  const phrasesRaw = parsed.phrases
  if (pagesRaw !== undefined && pagesRaw !== null && !Array.isArray(pagesRaw)) {
    localErrorKey.value = 'system.i18n_import_invalid_shape'
    return
  }
  if (phrasesRaw !== undefined && phrasesRaw !== null && !isRecord(phrasesRaw)) {
    localErrorKey.value = 'system.i18n_import_invalid_shape'
    return
  }
  const hasPages = Array.isArray(pagesRaw) && pagesRaw.length > 0
  const hasPhrases = isRecord(phrasesRaw) && Object.keys(phrasesRaw).length > 0
  if (!hasPages && !hasPhrases) {
    localErrorKey.value = 'system.i18n_import_empty'
    return
  }

  const body: AdminImportRequest = {
    pages:
      pagesRaw === undefined || pagesRaw === null
        ? null
        : (pagesRaw as AdminImportRequest['pages']),
    phrases:
      phrasesRaw === undefined || phrasesRaw === null
        ? null
        : (phrasesRaw as AdminImportRequest['phrases']),
    overwrite: overwrite.value,
    dryRun: dryRun.value,
  }

  running.value = true
  const result = await admin.importI18n(body)
  running.value = false
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  report.value = result.value
}

const perLanguageText = (values: Readonly<Record<string, number>>): string => {
  const entries = Object.entries(values).sort(([a], [b]) => a.localeCompare(b))
  return entries.length === 0 ? '—' : entries.map(([code, count]) => `${code}: ${count}`).join(', ')
}

const summary = computed(() =>
  report.value === null
    ? []
    : [
        { id: 'pages_created', value: report.value.pagesCreated },
        { id: 'phrases_created', value: report.value.phrasesCreated },
        { id: 'inserted', value: report.value.inserted },
        { id: 'updated', value: report.value.updated },
        { id: 'unchanged', value: report.value.unchanged },
      ],
)
</script>

<template>
  <section class="i18n-section">
    <p class="i18n-section__hint">{{ t('system.i18n_import_hint') }}</p>

    <form class="i18n-import" @submit.prevent="run()">
      <label class="i18n-field">
        <span class="i18n-field__label">{{ t('system.i18n_import_payload') }}</span>
        <textarea
          v-model="payload"
          class="admin-toolbar__input i18n-import__text"
          rows="14"
          spellcheck="false"
          :placeholder="t('system.i18n_import_placeholder')"
        ></textarea>
      </label>

      <div class="i18n-import__options">
        <label class="i18n-check">
          <input v-model="dryRun" type="checkbox" />
          <span>{{ t('system.i18n_import_dry_run') }}</span>
        </label>
        <label class="i18n-check">
          <input v-model="overwrite" type="checkbox" />
          <span>{{ t('system.i18n_import_overwrite') }}</span>
        </label>
        <AppButton type="submit" :loading="running">
          {{ t('system.i18n_import_run') }}
        </AppButton>
      </div>
    </form>

    <AppAlert v-if="localErrorKey !== null" variant="error">{{ t(localErrorKey) }}</AppAlert>
    <AppAlert v-if="actionErrorKey !== null" variant="error">{{ t(actionErrorKey) }}</AppAlert>

    <template v-if="report !== null">
      <AppAlert variant="info">
        {{ report.dryRun ? t('system.i18n_import_dry_notice') : t('system.i18n_import_done') }}
      </AppAlert>

      <div class="i18n-import__summary">
        <div v-for="item in summary" :key="item.id" class="i18n-import__metric">
          <span class="i18n-import__metric-label">{{ t(`system.i18n_import_${item.id}`) }}</span>
          <span class="i18n-import__metric-value">{{ item.value }}</span>
        </div>
      </div>

      <dl class="i18n-import__meta">
        <div>
          <dt>{{ t('system.i18n_import_per_language') }}</dt>
          <dd>{{ perLanguageText(report.perLanguage) }}</dd>
        </div>
        <div>
          <dt>{{ t('system.i18n_import_missing') }}</dt>
          <dd>{{ perLanguageText(report.missingPerLanguage) }}</dd>
        </div>
        <div v-if="report.revision !== null">
          <dt>{{ t('system.i18n_import_revision') }}</dt>
          <dd>{{ report.revision }}</dd>
        </div>
      </dl>

      <div class="i18n-import__conflicts">
        <h2 class="i18n-import__conflicts-title">
          {{ t('system.i18n_import_conflicts', { count: report.conflicts.length }) }}
        </h2>
        <p v-if="report.conflicts.length === 0" class="admin-state__empty">
          {{ t('system.i18n_import_no_conflicts') }}
        </p>
        <div v-else class="admin-table-wrap i18n-import__conflicts-table">
          <table class="admin-table">
            <thead>
              <tr>
                <th scope="col">{{ t('system.i18n_page_key') }}</th>
                <th scope="col">{{ t('system.i18n_phrase_key') }}</th>
                <th scope="col">{{ t('system.i18n_col_language') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="conflict in report.conflicts"
                :key="`${conflict.pageKey}/${conflict.phraseKey}/${conflict.languageCode}`"
              >
                <td class="admin-table__mono">{{ conflict.pageKey }}</td>
                <td class="admin-table__mono">{{ conflict.phraseKey }}</td>
                <td class="admin-table__mono">{{ conflict.languageCode }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped src="../../styles/admin.css"></style>
<style scoped>
.i18n-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.i18n-section__hint {
  max-width: 52rem;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.i18n-import {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.i18n-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.i18n-field__label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* The shared row-toolbar input carries `flex: 1 1 14rem`, which becomes a
   14rem HEIGHT inside these column-flow fields; the payload textarea sizes
   itself from `rows` (with the `min-height` below as the floor). */
.i18n-field .admin-toolbar__input {
  flex: none;
}

.i18n-import__text {
  width: 100%;
  min-height: 14rem;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--font-size-sm);
}

.i18n-import__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.i18n-check {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-sm);
}

.i18n-import__summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
}

.i18n-import__metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.i18n-import__metric-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.i18n-import__metric-value {
  font-size: var(--font-size-lg);
  font-variant-numeric: tabular-nums;
}

.i18n-import__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--font-size-sm);
}

.i18n-import__meta dt {
  color: var(--color-text-muted);
}

.i18n-import__meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.i18n-import__conflicts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.i18n-import__conflicts-title {
  margin: 0;
  font-size: var(--font-size-md);
}

.i18n-import__conflicts-table {
  max-height: 22rem;
  overflow: auto;
}

@media (max-width: 48rem) {
  .i18n-import__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
