<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    /**
     * Decorative spinner, for use inside a control that already exposes its busy
     * state (e.g. an `AppButton` with `aria-busy`): it carries no role and no
     * accessible name of its own, so the control's own state is the only thing
     * announced.
     */
    decorative?: boolean
    /** Accessible name for a standalone spinner; defaults to `common.loading`. */
    label?: string
    size?: number
  }>(),
  { decorative: false, label: undefined, size: 18 },
)

const { t } = useI18n()

// Never hardcode copy here: an explicit label from the caller wins, otherwise the
// existing localized `common.loading` key supplies the name.
const accessibleName = computed(() => props.label ?? t('common.loading'))
</script>

<template>
  <svg
    class="spinner"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :role="decorative ? undefined : 'status'"
    :aria-label="decorative ? undefined : accessibleName"
    :aria-hidden="decorative ? 'true' : undefined"
  >
    <circle class="spinner__track" cx="12" cy="12" r="9" fill="none" stroke-width="3" />
    <circle class="spinner__head" cx="12" cy="12" r="9" fill="none" stroke-width="3" />
  </svg>
</template>

<style scoped>
.spinner {
  animation: spinner-rotate 0.8s linear infinite;
}

.spinner__track {
  stroke: var(--color-border);
}

.spinner__head {
  stroke: var(--color-primary);
  stroke-linecap: round;
  stroke-dasharray: 40 60;
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2s;
  }
}
</style>
