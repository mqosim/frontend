<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import PasswordRegisterPanel from '../components/PasswordRegisterPanel.vue'

const { t } = useI18n()
</script>

<template>
  <section class="auth-view">
    <header class="auth-view__header">
      <h1 class="auth-view__title">{{ t('auth.register_title') }}</h1>
    </header>

    <PasswordRegisterPanel />

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
