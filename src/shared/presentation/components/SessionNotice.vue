<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSessionNotice } from '../composables/useSessionNotice'

const { t } = useI18n()
const { messageKey, dismiss } = useSessionNotice()

const text = computed(() => (messageKey.value === null ? '' : t(messageKey.value)))
</script>

<!--
  Rendered once at the app root, so it can appear on any page (including the
  login screens the session runtime redirects to). It sits at the bottom so it
  never collides with the top-right global controls.
-->
<template>
  <div v-if="messageKey !== null" class="session-notice" role="alert">
    <span class="session-notice__text">{{ text }}</span>
    <button
      type="button"
      class="session-notice__dismiss"
      :aria-label="t('action.dismiss')"
      @click="dismiss"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.session-notice {
  position: fixed;
  bottom: calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: calc(100vw - 2 * var(--space-4));
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  background-color: var(--color-warning-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  transform: translateX(-50%);
}

.session-notice__text {
  font-size: var(--font-size-sm);
}

.session-notice__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--icon-size-action);
  height: var(--icon-size-action);
  /* Keep the glyph size but guarantee a 44px touch target. */
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  line-height: 1;
  cursor: pointer;
}

.session-notice__dismiss:hover {
  background-color: var(--color-bg);
}

.session-notice__dismiss:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
</style>
