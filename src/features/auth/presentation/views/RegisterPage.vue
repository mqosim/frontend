<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import EimzoRegisterPanel from '../components/EimzoRegisterPanel.vue'
import MethodSelector from '../components/MethodSelector.vue'
import UsbTokenPanel from '../components/UsbTokenPanel.vue'
import { REGISTER_METHODS, type RegisterMethod } from '../methods'

const { t } = useI18n()

// E-IMZO is the only working method (register is signature-only on the backend);
// USB is shown disabled until the backend implements it. Switching methods
// unmounts the previous panel, so its state resets.
const method = ref<RegisterMethod>('eimzo')
</script>

<template>
  <section class="auth-view">
    <header class="auth-view__header">
      <h1 class="auth-view__title">{{ t('auth.register_title') }}</h1>
    </header>

    <MethodSelector
      v-model="method"
      :options="REGISTER_METHODS"
      :label="t('auth.register_method_label')"
      id-prefix="register"
    />

    <div
      :id="`register-panel-${method}`"
      role="tabpanel"
      :aria-labelledby="`register-tab-${method}`"
    >
      <EimzoRegisterPanel v-if="method === 'eimzo'" />
      <UsbTokenPanel v-else />
    </div>

    <p class="auth-view__footer">
      {{ t('auth.have_account') }}
      <RouterLink :to="{ name: 'login' }">{{ t('auth.sign_in') }}</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.auth-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-view__title {
  font-size: var(--font-size-xl);
}

.auth-view__footer {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
