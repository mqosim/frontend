<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminOrg } from '../../domain/adminOrg'
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

const detail = shallowRef<AdminOrg | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)

const { pending, busy, errorKey, ask, cancel, confirm, dismiss } = useAdminAction(() =>
  loadDetail(),
)

const canBlock = computed(() => can(ADMIN_PERMISSIONS.systemOrgBlock))
const canUnblock = computed(() => can(ADMIN_PERMISSIONS.systemOrgUnblock))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

const loadDetail = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.getOrg(props.uuid)
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

const back = (): void => {
  void router.push({ name: 'system-organizations' })
}

const askBlock = (org: AdminOrg): void => {
  ask({
    kind: 'block-org',
    title: t('system.orgs_block_title'),
    message: t('system.orgs_block_message', { name: org.name || org.uuid }),
    confirmLabel: t('system.orgs_block'),
    run: () => admin.blockOrg(org.uuid),
  })
}

const askUnblock = (org: AdminOrg): void => {
  ask({
    kind: 'unblock-org',
    title: t('system.orgs_unblock_title'),
    message: t('system.orgs_unblock_message', { name: org.name || org.uuid }),
    confirmLabel: t('system.orgs_unblock'),
    run: () => admin.unblockOrg(org.uuid),
  })
}
</script>

<template>
  <AdminPage :title="t('system.orgs_detail_title')" :subtitle="detail?.name">
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
      <div class="admin-actions">
        <AppButton
          v-if="canBlock && detail.isActive"
          variant="ghost"
          :disabled="busy"
          @click="askBlock(detail)"
        >
          {{ t('system.orgs_block') }}
        </AppButton>
        <AppButton
          v-if="canUnblock && !detail.isActive"
          variant="ghost"
          :disabled="busy"
          @click="askUnblock(detail)"
        >
          {{ t('system.orgs_unblock') }}
        </AppButton>
      </div>

      <dl class="admin-detail">
        <div class="admin-detail__item admin-detail__item--wide">
          <dt>{{ t('system.admin_uuid') }}</dt>
          <dd class="admin-table__mono">{{ detail.uuid }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.orgs_col_name') }}</dt>
          <dd>{{ detail.name || '—' }}</dd>
        </div>
        <div class="admin-detail__item">
          <dt>{{ t('system.orgs_col_tin') }}</dt>
          <dd class="admin-table__mono">{{ detail.tin || '—' }}</dd>
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
