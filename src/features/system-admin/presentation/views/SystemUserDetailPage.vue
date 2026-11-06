<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminUser } from '../../domain/adminUser'
import { formatSystemDateTime } from '../../domain/format'
import { ADMIN_PERMISSIONS } from '../../domain/permissions'
import { adminLoadErrorKey } from '../adminErrors'
import AdminPage from '../components/AdminPage.vue'
import { useAdminAction } from '../composables/useAdminAction'
import { useAdminUseCases } from '../composables/useAdminUseCases'
import { usePermissions } from '../composables/usePermissions'

const props = defineProps<{ uuid: string }>()

const { t, locale } = useI18n()
const router = useRouter()
const admin = useAdminUseCases()
const { can } = usePermissions()

const detail = shallowRef<AdminUser | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)

const { pending, busy, errorKey, ask, cancel, confirm, dismiss } = useAdminAction(() =>
  loadDetail(),
)

const canBlock = computed(() => can(ADMIN_PERMISSIONS.systemUserBlock))
const canUnblock = computed(() => can(ADMIN_PERMISSIONS.systemUserUnblock))
const canRevoke = computed(() => can(ADMIN_PERMISSIONS.systemSessionRevoke))
const isLoadingBlocked = computed(() => detail.value?.userType === 'ORG')
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const loadDetail = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.getUser(props.uuid)
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  detail.value = result.value
  status.value = 'ready'
}

onMounted(() => void loadDetail())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const displayName = (user: AdminUser): string => user.email ?? user.phoneNumber ?? user.uuid

const back = (): void => {
  void router.push({ name: 'system-users' })
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
  <AdminPage :title="t('system.users_detail_title')" :subtitle="detail?.email ?? detail?.uuid">
    <div class="admin-actions">
      <AppButton variant="ghost" @click="back()">{{ t('system.admin_back') }}</AppButton>
    </div>

    <AppAlert v-if="errorKey !== null" variant="error">{{ t(errorKey) }}</AppAlert>

    <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="status === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="loadDetail()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <template v-else-if="detail !== null">
      <AppAlert v-if="isLoadingBlocked" variant="info">
        {{ t('system.users_org_block_notice') }}
      </AppAlert>

      <div class="admin-actions">
        <template v-if="isLoadingBlocked">
          <!-- The organization is the source of truth for ORG access. -->
          <AppButton v-if="detail.isActive" variant="ghost" disabled>
            {{ t('system.users_block') }}
          </AppButton>
          <AppButton v-else variant="ghost" disabled>
            {{ t('system.users_unblock') }}
          </AppButton>
        </template>
        <template v-else>
          <AppButton
            v-if="detail.isActive"
            variant="ghost"
            :disabled="!canBlock || busy"
            @click="askBlock(detail)"
          >
            {{ t('system.users_block') }}
          </AppButton>
          <AppButton
            v-else
            variant="ghost"
            :disabled="!canUnblock || busy"
            @click="askUnblock(detail)"
          >
            {{ t('system.users_unblock') }}
          </AppButton>
        </template>
        <AppButton variant="ghost" :disabled="!canRevoke || busy" @click="askRevoke(detail)">
          {{ t('system.users_revoke') }}
        </AppButton>
      </div>

      <dl class="admin-detail">
        <div class="admin-detail__item admin-detail__item--wide">
          <dt>{{ t('system.admin_uuid') }}</dt>
          <dd class="admin-table__mono">{{ detail.uuid }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.users_email') }}</dt>
          <dd>{{ detail.email ?? '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.users_phone') }}</dt>
          <dd class="admin-table__mono">{{ detail.phoneNumber ?? '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.users_col_type') }}</dt>
          <dd>
            {{
              t(detail.userType === 'ORG' ? 'system.users_type_org' : 'system.users_type_person')
            }}
          </dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.admin_status') }}</dt>
          <dd>
            <span
              class="admin-badge"
              :class="detail.isActive ? 'admin-badge--active' : 'admin-badge--blocked'"
            >
              {{ t(detail.isActive ? 'system.admin_active' : 'system.admin_blocked') }}
            </span>
          </dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.users_language') }}</dt>
          <dd>{{ detail.languageCode || '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.users_email_verified') }}</dt>
          <dd>
            {{
              detail.emailVerifiedAt === null
                ? t('system.users_not_verified')
                : formatDate(detail.emailVerifiedAt)
            }}
          </dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.admin_created') }}</dt>
          <dd>{{ formatDate(detail.createdAt) }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.admin_updated') }}</dt>
          <dd>{{ formatDate(detail.updatedAt) }}</dd>
        </div>
      </dl>
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
