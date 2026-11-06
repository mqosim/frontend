<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * "How it works": the real three-step path — register, choose a workspace,
 * run the business. The numbers mark a true sequence, so they are justified.
 */
const { t } = useI18n()

const steps = [
  { title: 'landing.steps.one.title', text: 'landing.steps.one.text' },
  { title: 'landing.steps.two.title', text: 'landing.steps.two.text' },
  { title: 'landing.steps.three.title', text: 'landing.steps.three.text' },
]
</script>

<template>
  <section id="how" class="steps">
    <div class="steps__inner">
      <h2 class="steps__heading">{{ t('landing.steps.title') }}</h2>
      <ol class="steps__list">
        <li v-for="(step, index) in steps" :key="step.title" class="steps__item">
          <span class="steps__number" aria-hidden="true">{{ index + 1 }}</span>
          <div class="steps__content">
            <h3 class="steps__title">{{ t(step.title) }}</h3>
            <p class="steps__text">{{ t(step.text) }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.steps {
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg);
  scroll-margin-top: 4.5rem;
}

.steps__inner {
  max-width: 76rem;
  margin-inline: auto;
  padding: var(--space-7) var(--space-5);
}

.steps__heading {
  margin: 0;
  font-size: clamp(1.5rem, 1.15rem + 1.3vw, 2.125rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--color-text);
}

.steps__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.steps__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.steps__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.steps__title {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-md);
  font-weight: 650;
  color: var(--color-text);
}

.steps__text {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
}

@media (max-width: 56rem) {
  .steps__inner {
    padding-inline: var(--space-4);
  }

  .steps__list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 30rem) {
  .steps__inner {
    padding-inline: var(--space-3);
  }
}
</style>
