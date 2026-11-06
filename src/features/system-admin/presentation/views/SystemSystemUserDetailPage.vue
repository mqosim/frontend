<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminRole } from '../../domain/adminRole'
import type { AdminSystemUser } from '../../domain/adminUser'
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

const detail = shallowRef<AdminSystemUser | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)

const roles = shallowRef<readonly AdminRole[]>([])
const rolesStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const rolesError = shallowRef<AppError | null>(null)
const selectedRoles = ref<string[]>([])
const rolesSaving = ref(false)
const rolesSaved = ref(false)
const rolesSaveErrorKey = ref<string | null>(null)

const { pending, busy, errorKey, ask, cancel, confirm, dismiss } = useAdminAction(() =>
  loadDetail(),
)

const canManage = computed(() => can(ADMIN_PERMISSIONS.systemRoleManage))
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)
const rolesErrorKey = computed(() =>
  rolesError.value === null ? 'errors.generic' : adminLoadErrorKey(rolesError.value),
)
const rolesDirty = computed(() => {
  const current = detail.value?.roles ?? []
  if (current.length !== selectedRoles.value.length) return true
  return selectedRoles.value.some((code) => !current.includes(code))
})

const loadDetail = async (): Promise<void> => {
  status.value = 'loading'
  error.value = null
  const result = await admin.getSystemUser(props.uuid)
  if (!result.ok) {
    status.value = 'error'
    error.value = result.error
    return
  }
  detail.value = result.value
  selectedRoles.value = [...result.value.roles]
  rolesSaved.value = false
  status.value = 'ready'
}

const loadRoles = async (): Promise<void> => {
  if (!canManage.value) return
  rolesStatus.value = 'loading'
  rolesError.value = null
  const result = await admin.listRoles()
  if (!result.ok) {
    rolesStatus.value = 'error'
    rolesError.value = result.error
    return
  }
  roles.value = result.value
  rolesStatus.value = 'ready'
}

// The role catalogue only exists for operators who may change roles; a reader
// still sees the assigned roles on the detail itself.
watch(
  canManage,
  (allowed) => {
    if (allowed && rolesStatus.value === 'idle') void loadRoles()
  },
  { immediate: true },
)

onMounted(() => void loadDetail())

const formatDate = (value: string | null): string =>
  value === null ? '—' : formatSystemDateTime(value, locale.value)

const displayName = (user: AdminSystemUser): string => user.email ?? user.phoneNumber ?? user.uuid

const toggleRole = (code: string): void => {
  if (!canManage.value || rolesSaving.value) return
  rolesSaved.value = false
  rolesSaveErrorKey.value = null
  selectedRoles.value = selectedRoles.value.includes(code)
    ? selectedRoles.value.filter((value) => value !== code)
    : [...selectedRoles.value, code]
}

const saveRoles = async (): Promise<void> => {
  const user = detail.value
  if (user === null || !canManage.value || rolesSaving.value) return
  rolesSaving.value = true
  rolesSaved.value = false
  rolesSaveErrorKey.value = null
  const result = await admin.setSystemUserRoles(user.uuid, selectedRoles.value)
  rolesSaving.value = false
  if (!result.ok) {
    rolesSaveErrorKey.value = adminLoadErrorKey(result.error)
    return
  }
  detail.value = result.value
  selectedRoles.value = [...result.value.roles]
  rolesSaved.value = true
}

const back = (): void => {
  void router.push({ name: 'system-system-users' })
}

const askBlock = (user: AdminSystemUser): void => {
  ask({
    kind: 'block-system-user',
    title: t('system.system_users_block_title'),
    message: t('system.system_users_block_message', { name: displayName(user) }),
    confirmLabel: t('system.system_users_block'),
    run: () => admin.blockSystemUser(user.uuid),
  })
}

const askUnblock = (user: AdminSystemUser): void => {
  ask({
    kind: 'unblock-system-user',
    title: t('system.system_users_unblock_title'),
    message: t('system.system_users_unblock_message', { name: displayName(user) }),
    confirmLabel: t('system.system_users_unblock'),
    run: () => admin.unblockSystemUser(user.uuid),
  })
}

const askRevoke = (user: AdminSystemUser): void => {
  ask({
    kind: 'revoke-system-user-sessions',
    title: t('system.system_users_revoke_title'),
    message: t('system.system_users_revoke_message', { name: displayName(user) }),
    confirmLabel: t('system.system_users_revoke'),
    run: () => admin.revokeSystemUserSessions(user.uuid),
  })
}
</script>

<template>
  <AdminPage
    :title="t('system.system_users_detail_title')"
    :subtitle="detail?.email ?? detail?.uuid"
  >
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
      <p v-if="!canManage" class="admin-state__empty">
        {{ t('system.system_users_read_only') }}
      </p>

      <div class="admin-actions">
        <AppButton
          v-if="detail.isActive"
          variant="ghost"
          :disabled="!canManage || busy"
          @click="askBlock(detail)"
        >
          {{ t('system.system_users_block') }}
        </AppButton>
        <AppButton
          v-else
          variant="ghost"
          :disabled="!canManage || busy"
          @click="askUnblock(detail)"
        >
          {{ t('system.system_users_unblock') }}
        </AppButton>
        <AppButton variant="ghost" :disabled="!canManage || busy" @click="askRevoke(detail)">
          {{ t('system.system_users_revoke') }}
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
        <div class="admin-detail__item admin-detail__item--wide">
          <dt>{{ t('system.system_users_col_roles') }}</dt>
          <dd>
            <span v-if="detail.roles.length === 0" class="admin-table__muted">
              {{ t('system.system_users_no_roles') }}
            </span>
            <span v-else>{{ detail.roles.join(', ') }}</span>
          </dd>
        </div>
      </dl>

      <section v-if="canManage" class="admin-roles" aria-labelledby="system-user-roles-title">
        <h2 id="system-user-roles-title" class="admin-roles__title">
          {{ t('system.system_users_roles_title') }}
        </h2>
        <p class="admin-state__empty">{{ t('system.system_users_roles_hint') }}</p>

        <AppAlert v-if="rolesSaveErrorKey !== null" variant="error">
          {{ t(rolesSaveErrorKey) }}
        </AppAlert>
        <AppAlert v-else-if="rolesSaved" variant="info">
          {{ t('system.system_users_roles_saved') }}
        </AppAlert>

        <p v-if="rolesStatus === 'loading'" class="admin-state__empty">
          {{ t('common.loading') }}
        </p>
        <div v-else-if="rolesStatus === 'error'" class="admin-state">
          <AppAlert variant="error">{{ t(rolesErrorKey) }}</AppAlert>
          <AppButton variant="ghost" @click="loadRoles()">{{ t('system.admin_retry') }}</AppButton>
        </div>
        <template v-else>
          <ul class="admin-checkbox-list">
            <li v-for="role in roles" :key="role.code" class="admin-checkbox">
              <input
                :id="`role-${role.code}`"
                type="checkbox"
                :checked="selectedRoles.includes(role.code)"
                :disabled="rolesSaving"
                @change="toggleRole(role.code)"
              />
              <label :for="`role-${role.code}`">
                <span class="admin-table__mono">{{ role.code }}</span>
                <span class="admin-table__sub">{{ role.description }}</span>
                <span class="admin-table__sub">
                  {{
                    t('system.system_users_role_permissions', { count: role.permissions.length })
                  }}
                </span>
              </label>
            </li>
          </ul>
          <div class="admin-actions">
            <AppButton
              variant="primary"
              :loading="rolesSaving"
              :disabled="!rolesDirty"
              @click="saveRoles()"
            >
              {{ t('system.system_users_save_roles') }}
            </AppButton>
          </div>
        </template>
      </section>
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
.admin-roles {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.admin-roles__title {
  margin: 0;
  font-size: var(--font-size-lg);
}
</style>
