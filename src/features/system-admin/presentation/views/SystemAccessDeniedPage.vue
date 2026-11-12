<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/presentation/components/AppButton.vue'

import { firstAllowedSystemRoute } from '../../application/menu'
import AdminPage from '../components/AdminPage.vue'
import { useAdminIdentity } from '../composables/useAdminIdentity'
import { usePermissions } from '../composables/usePermissions'

/**
 * The in-shell fallback for an unauthorized SYSTEM route. It never silently
 * redirects: the caller is told why they are here and offered the first area
 * their own grants actually open. When `/system/auth/me` failed, a retry
 * re-resolves the grants before navigating.
 */
const { t } = useI18n()
const router = useRouter()
const { grants } = usePermissions()
const { load, loading } = useAdminIdentity()

const target = computed(() => firstAllowedSystemRoute(grants.value))

const retry = async (): Promise<void> => {
  await load()
  if (target.value !== null) await router.replace(target.value)
}

const openWorkspace = (): void => {
  if (target.value !== null) void router.push(target.value)
}
</script>

<template>
  <AdminPage :title="t('system.access_denied_title')">
    <p class="access-denied__text">{{ t('system.access_denied_text') }}</p>

    <div class="access-denied__actions">
      <AppButton v-if="target !== null" variant="primary" @click="openWorkspace()">
        {{ t('system.access_denied_back') }}
      </AppButton>
      <AppButton variant="ghost" :loading="loading" @click="retry()">
        {{ t('system.access_denied_retry') }}
      </AppButton>
    </div>

    <p v-if="target === null" class="access-denied__hint">
      {{ t('system.access_denied_none') }}
    </p>
  </AdminPage>
</template>

<style scoped>
.access-denied__text {
  max-width: 44rem;
  margin: 0;
}

.access-denied__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.access-denied__hint {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
