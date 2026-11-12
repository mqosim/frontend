<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminTranslationPage } from '../../../domain/adminI18n'
import { ADMIN_PERMISSIONS } from '../../../domain/permissions'
import { adminLoadErrorKey, i18nActionErrorKey } from '../../adminErrors'
import { useAdminUseCases } from '../../composables/useAdminUseCases'
import { usePermissions } from '../../composables/usePermissions'

/**
 * Catalog pages. Reads need `i18n.read`; creating, editing and deleting an
 * EMPTY page need `i18n.manage`. A page holding phrases cannot be deleted (the
 * backend answers 409) and its copy is mapped from the machine code.
 */
const { t } = useI18n()
const admin = useAdminUseCases()
const { can } = usePermissions()

const canManage = computed(() => can(ADMIN_PERMISSIONS.i18nManage))

const pages = shallowRef<readonly AdminTranslationPage[]>([])
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)
const actionErrorKey = ref<string | null>(null)
const busyKey = ref<string | null>(null)

const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const load = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.listI18nPages()
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  pages.value = [...result.value].sort((a, b) => a.key.localeCompare(b.key))
  status.value = 'ready'
}

onMounted(() => void load())

// ── Create ────────────────────────────────────────────────────────────────
const newKey = ref('')
const newDescription = ref('')
const newActive = ref(true)
const creating = ref(false)

const create = async (): Promise<void> => {
  if (!canManage.value || creating.value) return
  const key = newKey.value.trim()
  if (key === '') {
    actionErrorKey.value = 'system.i18n_error_invalid_key'
    return
  }
  creating.value = true
  actionErrorKey.value = null
  const result = await admin.createI18nPage({
    key,
    description: newDescription.value.trim() === '' ? null : newDescription.value.trim(),
    isActive: newActive.value,
  })
  creating.value = false
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  newKey.value = ''
  newDescription.value = ''
  newActive.value = true
  await load()
}

// ── Edit ──────────────────────────────────────────────────────────────────
const editingKey = ref<string | null>(null)
const editDescription = ref('')
const editActive = ref(true)

const startEdit = (page: AdminTranslationPage): void => {
  editingKey.value = page.key
  editDescription.value = page.description ?? ''
  editActive.value = page.isActive
  actionErrorKey.value = null
}

const cancelEdit = (): void => {
  editingKey.value = null
}

const saveEdit = async (page: AdminTranslationPage): Promise<void> => {
  if (!canManage.value || busyKey.value !== null) return
  busyKey.value = page.key
  actionErrorKey.value = null
  const result = await admin.updateI18nPage(page.key, {
    description: editDescription.value.trim() === '' ? null : editDescription.value.trim(),
    isActive: editActive.value,
  })
  busyKey.value = null
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  editingKey.value = null
  await load()
}

// ── Delete (confirm) ──────────────────────────────────────────────────────
const pendingDelete = shallowRef<AdminTranslationPage | null>(null)
const deleting = ref(false)

const askDelete = (page: AdminTranslationPage): void => {
  if (!canManage.value) return
  actionErrorKey.value = null
  pendingDelete.value = page
}

const confirmDelete = async (): Promise<void> => {
  const page = pendingDelete.value
  if (page === null || deleting.value) return
  deleting.value = true
  actionErrorKey.value = null
  const result = await admin.deleteI18nPage(page.key)
  deleting.value = false
  pendingDelete.value = null
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  await load()
}
</script>

<template>
  <section class="i18n-section" :aria-busy="status === 'loading'">
    <form v-if="canManage" class="i18n-create" @submit.prevent="create()">
      <label class="i18n-field">
        <span class="i18n-field__label">{{ t('system.i18n_page_key') }}</span>
        <input v-model="newKey" class="admin-toolbar__input" type="text" maxlength="100" />
      </label>
      <label class="i18n-field i18n-field--grow">
        <span class="i18n-field__label">{{ t('system.i18n_page_description') }}</span>
        <input v-model="newDescription" class="admin-toolbar__input" type="text" maxlength="500" />
      </label>
      <label class="i18n-check">
        <input v-model="newActive" type="checkbox" />
        <span>{{ t('system.i18n_page_active') }}</span>
      </label>
      <AppButton type="submit" :loading="creating">{{ t('system.i18n_page_create') }}</AppButton>
    </form>

    <AppAlert v-if="actionErrorKey !== null" variant="error">
      {{ t(actionErrorKey) }}
    </AppAlert>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="load()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <p v-else-if="pages.length === 0" class="admin-state__empty">
      {{ t('system.admin_empty') }}
    </p>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th scope="col">{{ t('system.i18n_page_key') }}</th>
            <th scope="col">{{ t('system.i18n_page_description') }}</th>
            <th scope="col">{{ t('system.i18n_col_phrases') }}</th>
            <th scope="col">{{ t('system.admin_status') }}</th>
            <th v-if="canManage" scope="col" class="admin-table__actions">
              {{ t('system.admin_actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="page in pages" :key="page.key">
            <td class="admin-table__mono">{{ page.key }}</td>
            <td>
              <template v-if="editingKey === page.key">
                <input
                  v-model="editDescription"
                  class="admin-toolbar__input"
                  type="text"
                  maxlength="500"
                  :aria-label="t('system.i18n_page_description')"
                />
              </template>
              <span v-else class="admin-table__muted">{{ page.description || '—' }}</span>
            </td>
            <td class="admin-table__muted">{{ page.phraseCount }}</td>
            <td>
              <template v-if="editingKey === page.key">
                <label class="i18n-check">
                  <input v-model="editActive" type="checkbox" />
                  <span>{{ t('system.i18n_page_active') }}</span>
                </label>
              </template>
              <span
                v-else
                class="admin-badge"
                :class="page.isActive ? 'admin-badge--active' : 'admin-badge--blocked'"
              >
                {{ t(page.isActive ? 'system.i18n_active' : 'system.i18n_inactive') }}
              </span>
            </td>
            <td v-if="canManage">
              <div class="admin-table__actions admin-table__actions--nowrap">
                <template v-if="editingKey === page.key">
                  <AppButton
                    variant="primary"
                    :loading="busyKey === page.key"
                    @click="saveEdit(page)"
                  >
                    {{ t('action.save') }}
                  </AppButton>
                  <AppButton variant="ghost" @click="cancelEdit()">
                    {{ t('action.cancel') }}
                  </AppButton>
                </template>
                <template v-else>
                  <AppButton variant="ghost" @click="startEdit(page)">
                    {{ t('system.admin_edit') }}
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    :disabled="page.phraseCount > 0"
                    :title="page.phraseCount > 0 ? t('system.i18n_delete_needs_empty') : undefined"
                    @click="askDelete(page)"
                  >
                    {{ t('system.i18n_delete') }}
                  </AppButton>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('system.i18n_page_delete_title')"
      :message="t('system.i18n_page_delete_message', { key: pendingDelete?.key ?? '' })"
      :confirm-label="t('system.i18n_delete')"
      :cancel-label="t('action.cancel')"
      :loading="deleting"
      @confirm="confirmDelete()"
      @cancel="pendingDelete = null"
      @dismiss="pendingDelete = null"
    />
  </section>
</template>

<style scoped src="../../styles/admin.css"></style>
<style scoped>
.i18n-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.i18n-create {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
}

.i18n-field {
  display: flex;
  flex: 1 1 12rem;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.i18n-field--grow {
  flex: 2 1 18rem;
}

.i18n-field__label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* The shared row-toolbar input carries `flex: 1 1 14rem`, which becomes a
   14rem HEIGHT once it sits in these column-flow fields. Here the control
   keeps its natural, text-sized height instead. */
.i18n-field .admin-toolbar__input {
  flex: none;
}

.i18n-check {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-sm);
}
</style>
