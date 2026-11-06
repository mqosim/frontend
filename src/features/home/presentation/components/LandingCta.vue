<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Final call to action before the footer. The destination follows the visitor's
 * session context, exactly like the hero (Dashboard when signed in, otherwise
 * registration).
 */
defineProps<{
  startTo: string
  startLabel: string
}>()

const { t } = useI18n()
</script>

<template>
  <section class="cta">
    <div class="cta__panel">
      <h2 class="cta__title">{{ t('landing.final.title') }}</h2>
      <p class="cta__text">{{ t('landing.final.text') }}</p>
      <RouterLink class="cta__button" :to="{ name: startTo }">{{ startLabel }}</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.cta {
  max-width: 76rem;
  margin-inline: auto;
  padding: var(--space-6) var(--space-5) var(--space-7);
  scroll-margin-top: 4.5rem;
}

.cta__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.cta__title {
  margin: 0;
  font-size: clamp(1.5rem, 1.15rem + 1.3vw, 2.125rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.cta__text {
  max-width: 34rem;
  margin: 0;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.cta__button {
  display: inline-flex;
  align-items: center;
  height: 2.75rem;
  margin-top: var(--space-2);
  padding-inline: var(--space-6);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.cta__button:hover {
  background-color: var(--color-primary-hover);
}

@media (max-width: 56rem) {
  .cta {
    padding-inline: var(--space-4);
  }
}

@media (max-width: 30rem) {
  .cta {
    padding-inline: var(--space-3);
  }

  .cta__panel {
    padding: var(--space-6) var(--space-4);
  }
}
</style>
