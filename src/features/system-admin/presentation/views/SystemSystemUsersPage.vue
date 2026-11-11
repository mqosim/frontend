<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminSystemUser } from '../../domain/adminUser'
import { formatSystemDateTime } from '../../domain/format'
import { ADMIN_PERMISSIONS } from '../../domain/permissions'
import { adminLoadErrorKey } from '../adminErrors'
import AdminPage from '../components/AdminPage.vue'
import AdminPagination from '../components/AdminPagination.vue'
import { useAdminAction } from '../composables/useAdminAction'
import { useAdminList } from '../composables/useAdminList'
import { useAdminUseCases } from '../composables/useAdminUseCases'
import { usePermissions } from '../composables/usePermissions'

const { t, locale } = useI18n()
const router = useRouter()
const admin = useAdminUseCases()
const { can } = usePermissions()

const {
  items,
  total,
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  search,
  status,
  error,
  load,
  refresh,
  clearSearch,
  goToPage,
} = useAdminList<AdminSystemUser>((query) => admin.listSystemUsers(query))

const { pending, busy, errorKey, ask, cancel, confirm, dismiss } = useAdminAction(() => load())

// Status changes and role assignment are both `system.users.write` operations
// (`PATCH /system/users/{id}`); there is no session-revoke endpoint.
const canManage = computed(() => can(ADMIN_PERMISSIONS.systemUsersWrite))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

// The backend has no text search: the filter applies to the loaded page only.
const term = computed(() => search.value.trim().toLowerCase())
const visibleItems = computed(() =>
  term.value === ''
    ? items.value
    : items.value.filter(
        (user) =>
          user.email.toLowerCase().includes(term.value) ||
          user.displayName.toLowerCase().includes(term.value) ||
          user.role.toLowerCase().includes(term.value) ||
          user.id.toLowerCase().includes(term.value),
      ),
)

const isActive = (user: AdminSystemUser): boolean => user.status === 'active'

onMounted(() => void load())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const view = (user: AdminSystemUser): void => {
  void router.push({ name: 'system-system-user-detail', params: { userId: user.id } })
}

const askDisable = (user: AdminSystemUser): void => {
  ask({
    kind: 'update-system-user',
    title: t('system.system_users_block_title'),
    message: t('system.system_users_block_message', { name: user.displayName || user.email }),
    confirmLabel: t('system.system_users_block'),
    run: () => admin.updateSystemUser(user.id, { status: 'disabled' }),
  })
}

const askEnable = (user: AdminSystemUser): void => {
  ask({
    kind: 'update-system-user',
    title: t('system.system_users_unblock_title'),
    message: t('system.system_users_unblock_message', { name: user.displayName || user.email }),
    confirmLabel: t('system.system_users_unblock'),
    run: () => admin.updateSystemUser(user.id, { status: 'active' }),
  })
}
</script>

<template>
  <AdminPage :title="t('system.system_users_title')" :subtitle="t('system.system_users_subtitle')">
    <form class="admin-toolbar" role="search" @submit.prevent>
      <input
        v-model="search"
        class="admin-toolbar__input"
        type="search"
        :placeholder="t('system.admin_search_system_users')"
        :aria-label="t('system.admin_search_system_users')"
      />
      <AppButton v-if="search !== ''" variant="ghost" @click="clearSearch()">
        {{ t('system.admin_clear') }}
      </AppButton>
    </form>

    <p v-if="search !== ''" class="admin-filter-notice" role="status">
      {{ t('system.admin_filter_scope', { term: search }) }}
    </p>

    <AppAlert v-if="errorKey !== null" variant="error">{{ t(errorKey) }}</AppAlert>

    <p v-if="!canManage" class="admin-state__empty">
      {{ t('system.system_users_read_only') }}
    </p>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="refresh()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <template v-else>
      <p v-if="total === 0" class="admin-state__empty">{{ t('system.admin_empty') }}</p>
      <template v-else>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th scope="col">{{ t('system.users_col_user') }}</th>
                <th scope="col">{{ t('system.system_users_col_roles') }}</th>
                <th scope="col">{{ t('system.admin_status') }}</th>
                <th scope="col">{{ t('system.admin_created') }}</th>
                <th scope="col" class="admin-table__actions">{{ t('system.admin_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in visibleItems" :key="user.id">
                <td>
                  <span class="admin-table__desc">{{ user.displayName || user.email }}</span>
                  <span class="admin-table__sub admin-table__mono">{{ user.id }}</span>
                </td>
                <td>
                  <span class="admin-table__mono">{{ user.role }}</span>
                </td>
                <td>
                  <span
                    class="admin-badge"
                    :class="isActive(user) ? 'admin-badge--active' : 'admin-badge--blocked'"
                  >
                    {{ t(isActive(user) ? 'system.admin_active' : 'system.admin_blocked') }}
                  </span>
                </td>
                <td class="admin-table__muted">{{ formatDate(user.createdAt) }}</td>
                <td>
                  <div class="admin-table__actions">
                    <AppButton variant="ghost" @click="view(user)">
                      {{ t('system.admin_view') }}
                    </AppButton>
                    <AppButton
                      v-if="isActive(user)"
                      variant="ghost"
                      :disabled="!canManage || busy"
                      @click="askDisable(user)"
                    >
                      {{ t('system.system_users_block') }}
                    </AppButton>
                    <AppButton
                      v-else
                      variant="ghost"
                      :disabled="!canManage || busy"
                      @click="askEnable(user)"
                    >
                      {{ t('system.system_users_unblock') }}
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AdminPagination
          :page="page"
          :page-count="pageCount"
          :range-start="rangeStart"
          :range-end="rangeEnd"
          :total="total"
          @prev="goToPage(page - 1)"
          @next="goToPage(page + 1)"
        />
      </template>
    </template>

    <ConfirmDialog
      :open="pending !== null"
      :title="pending?.title ?? ''"
      :message="pending?.message ?? ''"
      :confirm-label="pending?.confirmLabel ?? t('action.save')"
      :cancel-label="t('action.cancel')"
      :loading="busy"
      @confirm="confirm()"
      @cancel="cancel()"
      @dismiss="dismiss()"
    />
  </AdminPage>
</template>

<style scoped src="../styles/admin.css"></style>

<style scoped>
/* Client-side filtering only covers the loaded page; the notice says so. */
.admin-filter-notice {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
