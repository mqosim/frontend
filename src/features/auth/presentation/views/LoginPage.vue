<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import EimzoLoginPanel from '../components/EimzoLoginPanel.vue'
import MethodSelector from '../components/MethodSelector.vue'
import PasswordLoginPanel from '../components/PasswordLoginPanel.vue'
import UsbTokenPanel from '../components/UsbTokenPanel.vue'
import { LOGIN_METHODS, type LoginMethod } from '../methods'

const { t } = useI18n()

// Password is the default: it is the path every existing account already has.
// Switching methods unmounts the previous panel, so its state resets.
const method = ref<LoginMethod>('password')
</script>

<template>
  <section class="auth-view">
    <header class="auth-view__header">
      <h1 class="auth-view__title">{{ t('auth.sign_in') }}</h1>
      <p class="auth-view__subtitle">{{ t('auth.login_subtitle') }}</p>
    </header>

    <MethodSelector
      v-model="method"
      :options="LOGIN_METHODS"
      :label="t('auth.method_label')"
      id-prefix="login"
    />

    <div :id="`login-panel-${method}`" role="tabpanel" :aria-labelledby="`login-tab-${method}`">
      <PasswordLoginPanel v-if="method === 'password'" />
      <EimzoLoginPanel v-else-if="method === 'eimzo'" />
      <UsbTokenPanel v-else />
    </div>

    <p class="auth-view__footer">
      {{ t('auth.no_account') }}
      <RouterLink :to="{ name: 'register' }">{{ t('auth.register_title') }}</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.auth-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.auth-view__title {
  font-size: var(--font-size-xl);
}

.auth-view__subtitle {
  color: var(--color-text-muted);
}

.auth-view__footer {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
