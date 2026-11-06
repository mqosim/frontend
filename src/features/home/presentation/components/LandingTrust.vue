<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Trust section: only claims backed by the current implementation — E-IMZO
 * sign-in, organization-based workspaces, and expiring sessions. One
 * restrained panel instead of a grid of marketing cards.
 */
const { t } = useI18n()

const points = [
  { title: 'landing.trust.signing.title', text: 'landing.trust.signing.text' },
  { title: 'landing.trust.workspaces.title', text: 'landing.trust.workspaces.text' },
  { title: 'landing.trust.sessions.title', text: 'landing.trust.sessions.text' },
]
</script>

<template>
  <section id="security" class="trust">
    <div class="trust__inner">
      <h2 class="trust__heading">{{ t('landing.trust.title') }}</h2>
      <ul class="trust__panel">
        <li v-for="point in points" :key="point.title" class="trust__item">
          <span class="trust__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.5 2.5 2.5 4.5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <div>
            <h3 class="trust__title">{{ t(point.title) }}</h3>
            <p class="trust__text">{{ t(point.text) }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.trust {
  scroll-margin-top: 4.5rem;
}

.trust__inner {
  max-width: 76rem;
  margin-inline: auto;
  padding: var(--space-7) var(--space-5);
}

.trust__heading {
  margin: 0;
  font-size: clamp(1.5rem, 1.15rem + 1.3vw, 2.125rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--color-text);
}

.trust__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin: var(--space-6) 0 0;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  list-style: none;
}

.trust__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.trust__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.trust__check svg {
  width: 1.125rem;
  height: 1.125rem;
}

.trust__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 650;
  color: var(--color-text);
}

.trust__text {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
}

@media (max-width: 56rem) {
  .trust__inner {
    padding-inline: var(--space-4);
  }
}

@media (max-width: 30rem) {
  .trust__inner {
    padding-inline: var(--space-3);
  }

  .trust__panel {
    padding: var(--space-4);
  }
}
</style>
