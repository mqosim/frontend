<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="not-found">
    <h1 class="not-found__title">{{ t('errors.not_found_title') }}</h1>
    <p class="not-found__text">{{ t('errors.not_found_text') }}</p>
    <RouterLink class="not-found__link" :to="{ name: 'landing' }">
      {{ t('errors.not_found_back') }}
    </RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: var(--content-max-width-wide);
  text-align: center;
}

.not-found__title {
  font-size: var(--font-size-xl);
}

.not-found__text {
  color: var(--color-text-muted);
}

.not-found__link {
  font-weight: 600;
  color: var(--color-primary);
}
</style>
