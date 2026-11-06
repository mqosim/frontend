<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'

import AppButton from './AppButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    loading?: boolean
    /** Which action receives focus when the dialog opens. */
    initialFocus?: 'cancel' | 'confirm'
    /**
     * Visually-hidden, polite live text for changes that should be announced
     * without reading the (frequently updating) visible message every time.
     */
    announcement?: string
  }>(),
  { loading: false, initialFocus: 'cancel', announcement: '' },
)

const emit = defineEmits<{ confirm: []; cancel: []; dismiss: [] }>()

// Unique ids: the dialog is mounted more than once at the app root (the idle
// warning and the logout confirmation), so fixed ids would collide and
// `aria-labelledby` would resolve to the wrong instance's title.
const titleId = useId()
const messageId = useId()

const dialogRef = ref<HTMLDialogElement | null>(null)
// The element focused before opening, so focus can return there on close.
let trigger: HTMLElement | null = null

// Native <dialog> shown modally renders in the top layer, so it always sits
// above the fixed global controls and the mobile drawer/scrim without z-index
// juggling, and it provides the focus trap and Escape handling for free.
watch(
  () => props.open,
  (isOpen) => {
    const dialog = dialogRef.value
    if (dialog === null) return
    if (isOpen) {
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
      trigger?.focus()
      trigger = null
    }
  },
)

// Escape fires `cancel` on the native dialog. It must not silently dismiss a
// dialog; the parent decides what a dismissal means (logout cancel vs. "stay").
const onCancel = (event: Event): void => {
  event.preventDefault()
  if (!props.loading) emit('dismiss')
}

// A click on the dialog element itself (i.e. the backdrop) is a dismissal.
const onBackdropClick = (event: MouseEvent): void => {
  if (event.target === dialogRef.value && !props.loading) emit('dismiss')
}

onBeforeUnmount(() => {
  if (dialogRef.value?.open) dialogRef.value.close()
})
</script>

<template>
  <dialog
    ref="dialogRef"
    class="confirm-dialog"
    :aria-labelledby="titleId"
    :aria-describedby="messageId"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <div class="confirm-dialog__panel">
      <h2 :id="titleId" class="confirm-dialog__title">{{ title }}</h2>
      <p :id="messageId" class="confirm-dialog__message">{{ message }}</p>
      <p
        v-if="announcement !== ''"
        class="confirm-dialog__sr"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ announcement }}
      </p>
      <div class="confirm-dialog__actions">
        <AppButton
          variant="ghost"
          :disabled="loading"
          :autofocus="initialFocus === 'cancel'"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </AppButton>
        <AppButton
          variant="primary"
          :loading="loading"
          :autofocus="initialFocus === 'confirm'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </AppButton>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  /* The top layer already wins over every z-index; the token is a fallback for
     engines without top-layer support. */
  z-index: var(--z-dialog);
  width: min(24rem, calc(100vw - 2 * var(--space-4)));
  margin: auto;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
}

.confirm-dialog::backdrop {
  background-color: var(--color-scrim);
}

.confirm-dialog__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.confirm-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.confirm-dialog__message {
  margin: 0;
  color: var(--color-text-muted);
}

/* Announcement target: present for assistive tech, not shown to sighted users. */
.confirm-dialog__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip-path: inset(50%);
}

.confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
