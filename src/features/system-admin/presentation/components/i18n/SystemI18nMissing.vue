<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'

import type { AdminMissingLanguage } from '../../../domain/adminI18n'
import { adminLoadErrorKey } from '../../adminErrors'
import { useAdminUseCases } from '../../composables/useAdminUseCases'

/**
 * The missing-translation report (`GET /system/i18n/missing`): per ACTIVE
 * language, how many phrases still lack a value, grouped by page. Read-only —
 * `i18n.read` is enough, and the page breakdown uses key names only.
 */
const { t } = useI18n()
const admin = useAdminUseCases()

const items = shallowRef<readonly AdminMissingLanguage[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)

const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const load = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.getI18nMissing()
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  items.value = result.value
  status.value = 'ready'
}

onMounted(() => void load())

const pagesText = (language: AdminMissingLanguage): string => {
  const entries = Object.entries(language.pages).sort(([a], [b]) => a.localeCompare(b))
  return entries.length === 0 ? '—' : entries.map(([page, count]) => `${page}: ${count}`).join(', ')
}
</script>

<template>
  <section class="i18n-section" :aria-busy="status === 'loading'">
    <div class="i18n-section__header">
      <p class="i18n-section__hint">{{ t('system.i18n_missing_hint') }}</p>
      <AppButton variant="ghost" :disabled="status === 'loading'" @click="load()">
        {{ t('system.audit_refresh') }}
      </AppButton>
    </div>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="load()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <p v-else-if="items.length === 0" class="admin-state__empty">
      {{ t('system.admin_empty') }}
    </p>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th scope="col">{{ t('system.i18n_col_language') }}</th>
            <th scope="col">{{ t('system.i18n_col_missing') }}</th>
            <th scope="col">{{ t('system.i18n_col_pages') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="language in items" :key="language.code">
            <td>
              <span class="admin-table__desc admin-table__mono">{{ language.code }}</span>
            </td>
            <td>{{ language.total }}</td>
            <td class="admin-table__muted">{{ pagesText(language) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped src="../../styles/admin.css"></style>
<style scoped>
.i18n-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.i18n-section__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.i18n-section__hint {
  max-width: 52rem;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
