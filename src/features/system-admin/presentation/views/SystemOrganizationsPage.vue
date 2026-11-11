<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminOrg } from '../../domain/adminOrg'
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
} = useAdminList<AdminOrg>((query) => admin.listOrgs(query))

const { pending, busy, errorKey, reason, ask, cancel, confirm, dismiss } = useAdminAction(() =>
  load(),
)

const canManage = computed(() => can(ADMIN_PERMISSIONS.tenantsManage))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

// The backend has no text search: the filter applies to the loaded page only.
const term = computed(() => search.value.trim().toLowerCase())
const visibleItems = computed(() =>
  term.value === ''
    ? items.value
    : items.value.filter(
        (org) =>
          org.name.toLowerCase().includes(term.value) ||
          org.stir.toLowerCase().includes(term.value) ||
          org.id.toLowerCase().includes(term.value),
      ),
)
const isActive = (org: AdminOrg): boolean => org.status === 'active'

onMounted(() => void load())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const view = (org: AdminOrg): void => {
  void router.push({ name: 'system-organization-detail', params: { tenantId: org.id } })
}

const askSuspend = (org: AdminOrg): void => {
  ask({
    kind: 'suspend-org',
    title: t('system.orgs_block_title'),
    message: t('system.orgs_block_message', { name: org.name || org.id }),
    confirmLabel: t('system.orgs_block'),
    run: (reason) => admin.suspendOrg(org.id, reason),
  })
}

const askReactivate = (org: AdminOrg): void => {
  ask({
    kind: 'reactivate-org',
    title: t('system.orgs_unblock_title'),
    message: t('system.orgs_unblock_message', { name: org.name || org.id }),
    confirmLabel: t('system.orgs_unblock'),
    run: (reason) => admin.reactivateOrg(org.id, reason),
  })
}
</script>

<template>
  <AdminPage :title="t('system.orgs_title')" :subtitle="t('system.orgs_subtitle')">
    <form class="admin-toolbar" role="search" @submit.prevent>
      <input
        v-model="search"
        class="admin-toolbar__input"
        type="search"
        :placeholder="t('system.admin_search_orgs')"
        :aria-label="t('system.admin_search')"
      />
      <AppButton v-if="search !== ''" variant="ghost" @click="clearSearch()">
        {{ t('system.admin_clear') }}
      </AppButton>
    </form>

    <p v-if="search !== ''" class="admin-filter-notice" role="status">
      {{ t('system.admin_filter_scope', { term: search }) }}
    </p>

    <AppAlert v-if="errorKey !== null" variant="error">{{ t(errorKey) }}</AppAlert>

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
                <th scope="col">{{ t('system.orgs_col_name') }}</th>
                <th scope="col">{{ t('system.orgs_col_tin') }}</th>
                <th scope="col">{{ t('system.admin_status') }}</th>
                <th scope="col">{{ t('system.admin_created') }}</th>
                <th scope="col" class="admin-table__actions">{{ t('system.admin_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in visibleItems" :key="org.id">
                <td>
                  <span class="admin-table__desc">{{ org.name || '—' }}</span>
                  <span class="admin-table__sub admin-table__mono">{{ org.id }}</span>
                </td>
                <td class="admin-table__mono">{{ org.stir || '—' }}</td>
                <td>
                  <span
                    class="admin-badge"
                    :class="isActive(org) ? 'admin-badge--active' : 'admin-badge--blocked'"
                  >
                    {{ t(isActive(org) ? 'system.admin_active' : 'system.admin_blocked') }}
                  </span>
                </td>
                <td class="admin-table__muted">{{ formatDate(org.createdAt) }}</td>
                <td>
                  <div class="admin-table__actions">
                    <AppButton variant="ghost" @click="view(org)">
                      {{ t('system.admin_view') }}
                    </AppButton>
                    <AppButton
                      v-if="canManage && isActive(org)"
                      variant="ghost"
                      :disabled="busy"
                      @click="askSuspend(org)"
                    >
                      {{ t('system.orgs_block') }}
                    </AppButton>
                    <AppButton
                      v-if="canManage && !isActive(org)"
                      variant="ghost"
                      :disabled="busy"
                      @click="askReactivate(org)"
                    >
                      {{ t('system.orgs_unblock') }}
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
      v-model:reason="reason"
      :open="pending !== null"
      :title="pending?.title ?? ''"
      :message="pending?.message ?? ''"
      :confirm-label="pending?.confirmLabel ?? t('action.save')"
      :cancel-label="t('action.cancel')"
      :loading="busy"
      :reason-label="t('system.orgs_reason_label')"
      :reason-placeholder="t('system.orgs_reason_placeholder')"
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
