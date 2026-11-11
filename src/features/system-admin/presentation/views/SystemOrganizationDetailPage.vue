<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminOrg, AdminOrgDetail } from '../../domain/adminOrg'
import type { AdminMember } from '../../domain/adminUser'
import { formatSystemCount, formatSystemDateTime } from '../../domain/format'
import { ADMIN_PERMISSIONS } from '../../domain/permissions'
import { adminLoadErrorKey } from '../adminErrors'
import AdminPage from '../components/AdminPage.vue'
import AdminPagination from '../components/AdminPagination.vue'
import { useAdminAction } from '../composables/useAdminAction'
import { useAdminList } from '../composables/useAdminList'
import { useAdminUseCases } from '../composables/useAdminUseCases'
import { usePermissions } from '../composables/usePermissions'

const props = defineProps<{ tenantId: string }>()

const { t, locale } = useI18n()
const router = useRouter()
const admin = useAdminUseCases()
const { can } = usePermissions()

const detail = shallowRef<AdminOrgDetail | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)

const { pending, busy, errorKey, reason, ask, cancel, confirm, dismiss } = useAdminAction(() =>
  loadDetail(),
)

const canManage = computed(() => can(ADMIN_PERMISSIONS.tenantsManage))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const loadDetail = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.getOrg(props.tenantId)
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  detail.value = result.value
  status.value = 'ready'
}

// Members are tenant-scoped (`GET /system/tenants/{id}/users`); read-only —
// the contract has no member mutation endpoints.
const {
  items: members,
  total: membersTotal,
  page: membersPage,
  pageCount: membersPageCount,
  rangeStart: membersRangeStart,
  rangeEnd: membersRangeEnd,
  status: membersStatus,
  error: membersError,
  load: loadMembers,
  refresh: refreshMembers,
  goToPage: goToMembersPage,
} = useAdminList<AdminMember>((query) => admin.listOrgMembers(props.tenantId, query))

const membersErrorKey = computed(() =>
  membersError.value === null ? 'errors.generic' : adminLoadErrorKey(membersError.value),
)

const loadDetailAndMembers = async (): Promise<void> => {
  await loadDetail()
  await loadMembers()
}

onMounted(() => void loadDetailAndMembers())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const formatCount = (value: number): string => formatSystemCount(value, locale.value)

const isActive = (org: AdminOrg): boolean => org.status === 'active'

const documentCountsText = (detail: AdminOrgDetail): string =>
  detail.documentCounts.map((count) => `${count.status}: ${formatCount(count.count)}`).join(', ')

const back = (): void => {
  void router.push({ name: 'system-organizations' })
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
  <AdminPage :title="t('system.orgs_detail_title')" :subtitle="detail?.org.name">
    <div class="admin-actions">
      <AppButton variant="ghost" @click="back()">{{ t('system.admin_back') }}</AppButton>
    </div>

    <AppAlert v-if="errorKey !== null" variant="error">{{ t(errorKey) }}</AppAlert>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="loadDetailAndMembers()">
        {{ t('system.admin_retry') }}
      </AppButton>
    </div>

    <template v-else-if="detail !== null">
      <div class="admin-actions">
        <AppButton
          v-if="canManage && isActive(detail.org)"
          variant="ghost"
          :disabled="busy"
          @click="askSuspend(detail.org)"
        >
          {{ t('system.orgs_block') }}
        </AppButton>
        <AppButton
          v-if="canManage && !isActive(detail.org)"
          variant="ghost"
          :disabled="busy"
          @click="askReactivate(detail.org)"
        >
          {{ t('system.orgs_unblock') }}
        </AppButton>
      </div>

      <dl class="admin-detail">
        <div class="admin-detail__item admin-detail__item--wide">
          <dt>{{ t('system.admin_uuid') }}</dt>
          <dd class="admin-table__mono">{{ detail.org.id }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.orgs_col_name') }}</dt>
          <dd>{{ detail.org.name || '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.orgs_col_tin') }}</dt>
          <dd class="admin-table__mono">{{ detail.org.stir || '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.admin_status') }}</dt>
          <dd>
            <span
              class="admin-badge"
              :class="isActive(detail.org) ? 'admin-badge--active' : 'admin-badge--blocked'"
            >
              {{ t(isActive(detail.org) ? 'system.admin_active' : 'system.admin_blocked') }}
            </span>
          </dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.admin_created') }}</dt>
          <dd>{{ formatDate(detail.org.createdAt) }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.orgs_members_count') }}</dt>
          <dd>{{ formatCount(detail.memberCount) }}</dd>
        </div>
        <div class="admin-detail__item admin-detail__item--wide">
          <dt>{{ t('system.admin_status') }}</dt>
          <dd>{{ documentCountsText(detail) }}</dd>
        </div>
      </dl>

      <section class="admin-members" aria-labelledby="org-members-title">
        <h2 id="org-members-title" class="admin-members__title">
          {{ t('system.orgs_members_title') }}
        </h2>

        <p v-if="membersStatus === 'loading'" class="admin-state__empty">
          {{ t('common.loading') }}
        </p>
        <div v-else-if="membersStatus === 'error'" class="admin-state">
          <AppAlert variant="error">{{ t(membersErrorKey) }}</AppAlert>
          <AppButton variant="ghost" @click="refreshMembers()">
            {{ t('system.admin_retry') }}
          </AppButton>
        </div>
        <template v-else>
          <p v-if="membersTotal === 0" class="admin-state__empty">{{ t('system.admin_empty') }}</p>
          <template v-else>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{{ t('system.users_col_user') }}</th>
                    <th scope="col">{{ t('system.system_users_col_roles') }}</th>
                    <th scope="col">{{ t('system.admin_status') }}</th>
                    <th scope="col">{{ t('system.members_col_identity') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="member in members" :key="member.userId">
                    <td>
                      <span class="admin-table__desc">{{ member.fullName || '—' }}</span>
                      <span class="admin-table__sub admin-table__mono">
                        {{ member.emailMasked || '—' }}
                      </span>
                    </td>
                    <td>{{ member.role }}</td>
                    <td>
                      <span
                        class="admin-badge"
                        :class="
                          member.status === 'active'
                            ? 'admin-badge--active'
                            : 'admin-badge--blocked'
                        "
                      >
                        {{
                          t(
                            member.status === 'active'
                              ? 'system.admin_active'
                              : 'system.admin_blocked',
                          )
                        }}
                      </span>
                    </td>
                    <td class="admin-table__mono">{{ member.identityStatus }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <AdminPagination
              :page="membersPage"
              :page-count="membersPageCount"
              :range-start="membersRangeStart"
              :range-end="membersRangeEnd"
              :total="membersTotal"
              @prev="goToMembersPage(membersPage - 1)"
              @next="goToMembersPage(membersPage + 1)"
            />
          </template>
        </template>
      </section>
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
.admin-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.admin-members__title {
  margin: 0;
  font-size: var(--font-size-lg);
}
</style>
