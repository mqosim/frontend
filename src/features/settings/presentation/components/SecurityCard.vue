<script setup lang="ts">
import { useId } from 'vue'

/**
 * Shared chrome for the Account Security cards: white card with the pale-blue
 * circular icon, card title and hint, plus a default slot for the form. Both
 * cards (email, password) render through it so their headers cannot drift.
 */
defineProps<{
  title: string
  hint: string
}>()

const titleId = useId()
</script>

<template>
  <section class="scard" :aria-labelledby="titleId">
    <div class="scard__head">
      <span class="scard__icon" aria-hidden="true">
        <slot name="icon" />
      </span>
      <div class="scard__heading">
        <h2 :id="titleId" class="scard__title">{{ title }}</h2>
        <p class="scard__hint">{{ hint }}</p>
      </div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.scard {
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.scard__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.scard__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-info-surface);
  color: var(--color-primary);
}

.scard__icon :deep(svg) {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scard__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text);
}

.scard__hint {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--color-text-muted);
}
</style>
