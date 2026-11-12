<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'

import type { AdminLanguage, AdminLanguagePatch } from '../../../domain/adminI18n'
import { ADMIN_PERMISSIONS } from '../../../domain/permissions'
import { adminLoadErrorKey, i18nActionErrorKey } from '../../adminErrors'
import { useAdminUseCases } from '../../composables/useAdminUseCases'
import { usePermissions } from '../../composables/usePermissions'

/**
 * Catalog languages. `i18n.read` lists them; activation and the default flag
 * require `i18n.manage`. The four codes are fixed by the backend — there is no
 * create/delete control here.
 */
const { t } = useI18n()
const admin = useAdminUseCases()
const { can } = usePermissions()

const canManage = computed(() => can(ADMIN_PERMISSIONS.i18nManage))

const languages = shallowRef<readonly AdminLanguage[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)
const busyCode = ref<string | null>(null)
const actionErrorKey = ref<string | null>(null)

const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const load = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.listI18nLanguages()
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  languages.value = result.value
  status.value = 'ready'
}

onMounted(() => void load())

const run = async (language: AdminLanguage, patch: AdminLanguagePatch): Promise<void> => {
  if (!canManage.value || busyCode.value !== null) return
  busyCode.value = language.code
  actionErrorKey.value = null
  const result = await admin.updateI18nLanguage(language.code, patch)
  busyCode.value = null
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  languages.value = languages.value.map((item) =>
    item.code === result.value.code ? result.value : item,
  )
}

const toggleActive = (language: AdminLanguage): void => {
  void run(language, { isActive: !language.isActive })
}

const makeDefault = (language: AdminLanguage): void => {
  void run(language, { isDefault: true })
}
</script>

<template>
  <section class="i18n-section" :aria-busy="status === 'loading'">
    <AppAlert v-if="actionErrorKey !== null" variant="error">
      {{ t(actionErrorKey) }}
    </AppAlert>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="load()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <p v-else-if="languages.length === 0" class="admin-state__empty">
      {{ t('system.admin_empty') }}
    </p>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th scope="col">{{ t('system.i18n_col_language') }}</th>
            <th scope="col">{{ t('system.i18n_col_code') }}</th>
            <th scope="col">{{ t('system.i18n_col_script') }}</th>
            <th scope="col">{{ t('system.admin_status') }}</th>
            <th scope="col">{{ t('system.i18n_col_default') }}</th>
            <th v-if="canManage" scope="col" class="admin-table__actions">
              {{ t('system.admin_actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="language in languages" :key="language.code">
            <td>
              <span class="admin-table__desc">{{ language.nativeName }}</span>
              <span class="admin-table__sub">{{ language.name }}</span>
            </td>
            <td class="admin-table__mono">{{ language.code }}</td>
            <td class="admin-table__muted">{{ language.script }}</td>
            <td>
              <span
                class="admin-badge"
                :class="language.isActive ? 'admin-badge--active' : 'admin-badge--blocked'"
              >
                {{ t(language.isActive ? 'system.i18n_active' : 'system.i18n_inactive') }}
              </span>
            </td>
            <td>
              <span v-if="language.isDefault" class="admin-badge admin-badge--active">
                {{ t('system.i18n_default') }}
              </span>
              <span v-else class="admin-table__muted">—</span>
            </td>
            <td v-if="canManage">
              <div class="admin-table__actions">
                <AppButton
                  variant="ghost"
                  :disabled="busyCode !== null"
                  @click="toggleActive(language)"
                >
                  {{ t(language.isActive ? 'system.i18n_deactivate' : 'system.i18n_activate') }}
                </AppButton>
                <AppButton
                  v-if="!language.isDefault"
                  variant="ghost"
                  :disabled="busyCode !== null"
                  @click="makeDefault(language)"
                >
                  {{ t('system.i18n_make_default') }}
                </AppButton>
              </div>
            </td>
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
</style>
