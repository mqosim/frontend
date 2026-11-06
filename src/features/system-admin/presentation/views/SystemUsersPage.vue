<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminUser } from '../../domain/adminUser'
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
  appliedSearch,
  status,
  error,
  load,
  refresh,
  submitSearch,
  clearSearch,
  goToPage,
} = useAdminList<AdminUser>((query) => admin.listUsers(query))

const { pending, busy, errorKey, ask, cancel, confirm, dismiss } = useAdminAction(() => load())

const canBlock = computed(() => can(ADMIN_PERMISSIONS.systemUserBlock))
const canUnblock = computed(() => can(ADMIN_PERMISSIONS.systemUserUnblock))
const canRevoke = computed(() => can(ADMIN_PERMISSIONS.systemSessionRevoke))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

onMounted(() => void load())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const displayName = (user: AdminUser): string => user.email ?? user.phoneNumber ?? user.uuid

const typeLabel = (user: AdminUser): string =>
  t(user.userType === 'ORG' ? 'system.users_type_org' : 'system.users_type_person')

const view = (user: AdminUser): void => {
  void router.push({ name: 'system-user-detail', params: { uuid: user.uuid } })
}

const askBlock = (user: AdminUser): void => {
  ask({
    kind: 'block-user',
    title: t('system.users_block_title'),
    message: t('system.users_block_message', { name: displayName(user) }),
    confirmLabel: t('system.users_block'),
    run: () => admin.blockUser(user.uuid),
  })
}

const askUnblock = (user: AdminUser): void => {
  ask({
    kind: 'unblock-user',
    title: t('system.users_unblock_title'),
    message: t('system.users_unblock_message', { name: displayName(user) }),
    confirmLabel: t('system.users_unblock'),
    run: () => admin.unblockUser(user.uuid),
  })
}

const askRevoke = (user: AdminUser): void => {
  ask({
    kind: 'revoke-user-sessions',
    title: t('system.users_revoke_title'),
    message: t('system.users_revoke_message', { name: displayName(user) }),
    confirmLabel: t('system.users_revoke'),
    run: () => admin.revokeUserSessions(user.uuid),
  })
}
</script>

<template>
  <AdminPage :title="t('system.users_title')" :subtitle="t('system.users_subtitle')">
    <form class="admin-toolbar" role="search" @submit.prevent="submitSearch()">
      <input
        v-model="search"
        class="admin-toolbar__input"
        type="search"
        :placeholder="t('system.admin_search_users')"
        :aria-label="t('system.admin_search_users')"
      />
      <AppButton type="submit" variant="ghost">{{ t('system.admin_search') }}</AppButton>
      <AppButton v-if="appliedSearch !== ''" variant="ghost" @click="clearSearch()">
        {{ t('system.admin_clear') }}
      </AppButton>
    </form>

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
                <th scope="col">{{ t('system.users_col_user') }}</th>
                <th scope="col">{{ t('system.users_col_type') }}</th>
                <th scope="col">{{ t('system.admin_status') }}</th>
                <th scope="col">{{ t('system.admin_created') }}</th>
                <th scope="col" class="admin-table__actions">{{ t('system.admin_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in items" :key="user.uuid">
                <td>
                  <span class="admin-table__desc">{{ displayName(user) }}</span>
                  <span class="admin-table__sub admin-table__mono">{{ user.uuid }}</span>
                </td>
                <td>{{ typeLabel(user) }}</td>
                <td>
                  <span
                    class="admin-badge"
                    :class="user.isActive ? 'admin-badge--active' : 'admin-badge--blocked'"
                  >
                    {{ t(user.isActive ? 'system.admin_active' : 'system.admin_blocked') }}
                  </span>
                </td>
                <td class="admin-table__muted">{{ formatDate(user.createdAt) }}</td>
                <td>
                  <div class="admin-table__actions">
                    <AppButton variant="ghost" @click="view(user)">
                      {{ t('system.admin_view') }}
                    </AppButton>

                    <!-- ORG accounts are blocked through the organization itself;
                         blocking the owning user account is never the source of
                         truth, so the action stays unavailable here. -->
                    <template v-if="user.userType === 'ORG'">
                      <span class="admin-row-notice">{{ t('system.users_org_block_notice') }}</span>
                      <AppButton v-if="user.isActive" variant="ghost" disabled>
                        {{ t('system.users_block') }}
                      </AppButton>
                      <AppButton v-else variant="ghost" disabled>
                        {{ t('system.users_unblock') }}
                      </AppButton>
                    </template>
                    <template v-else>
                      <AppButton
                        v-if="user.isActive"
                        variant="ghost"
                        :disabled="!canBlock || busy"
                        @click="askBlock(user)"
                      >
                        {{ t('system.users_block') }}
                      </AppButton>
                      <AppButton
                        v-else
                        variant="ghost"
                        :disabled="!canUnblock || busy"
                        @click="askUnblock(user)"
                      >
                        {{ t('system.users_unblock') }}
                      </AppButton>
                    </template>

                    <AppButton
                      variant="ghost"
                      :disabled="!canRevoke || busy"
                      @click="askRevoke(user)"
                    >
                      {{ t('system.users_revoke') }}
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
