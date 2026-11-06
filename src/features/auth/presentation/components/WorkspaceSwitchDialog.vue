<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import { errorMessageKey } from '@/shared/presentation/errors/messages'
import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

import type { WorkspaceChoice, WorkspaceOption, WorkspaceState } from '../../domain/entities'
import { useAuthUseCases } from '../composables/useAuthUseCases'
import { loadAccountWorkspaces } from '../stores/accountWorkspaces'
import { useAuthSessionStore } from '../stores/sessionStore'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const router = useRouter()
const auth = useAuthUseCases()
const session = useAuthSessionStore()

const dialogRef = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const groupName = useId()
// The element focused before opening, so focus can return there on close.
let trigger: HTMLElement | null = null

const loading = ref(false)
const submitting = ref(false)
const loadErrorKey = ref('')
const errorKey = ref('')
const options = ref<readonly WorkspaceOption[]>([])
const current = ref<WorkspaceState | null>(null)
// The value of the radio group: `'personal'` or an org id, or `''` for none.
const selectedKey = ref('')

const isUnchanged = computed(() => {
  const state = current.value
  if (state === null) return false
  if (selectedKey.value === 'personal') return state.workspace === 'personal'
  return state.workspace === 'org' && state.orgId === selectedKey.value
})

const canSubmit = computed(
  () => selectedKey.value !== '' && !isUnchanged.value && !submitting.value,
)

/** The initial selection: the current workspace when it maps to a listed option. */
const initialKey = (state: WorkspaceState, list: readonly WorkspaceOption[]): string => {
  if (state.workspace === 'personal') return 'personal'
  return state.orgId !== null && list.some((org) => org.id === state.orgId) ? state.orgId : ''
}

const load = async (): Promise<void> => {
  loading.value = true
  loadErrorKey.value = ''
  errorKey.value = ''
  selectedKey.value = ''
  options.value = []
  current.value = null

  const result = await loadAccountWorkspaces(auth)
  loading.value = false
  if (!result.ok) {
    // Never leave the picker unusable: surface the failure with a retry.
    loadErrorKey.value = errorMessageKey(result.error)
    return
  }
  options.value = result.value.options
  current.value = result.value.current
  selectedKey.value = initialKey(result.value.current, result.value.options)
}

const toChoice = (key: string): WorkspaceChoice =>
  key === 'personal' ? { kind: 'personal' } : { kind: 'org', orgId: key }

const close = (): void => {
  if (submitting.value) return
  emit('close')
}

const submit = async (): Promise<void> => {
  if (!canSubmit.value) return
  submitting.value = true
  errorKey.value = ''

  const result = await auth.switchWorkspace(toChoice(selectedKey.value))
  if (!result.ok) {
    submitting.value = false
    if (result.error.kind === 'Unauthorized') {
      // The session is gone; the only way forward is to sign in again.
      session.setAnonymous()
      emit('close')
      void router.push({ name: 'login' })
      return
    }
    errorKey.value = errorMessageKey(result.error)
    return
  }

  const outcome = result.value
  if (outcome.kind === 'workspace_required') {
    // Defensive: the token came back pending (should not happen for a switch).
    session.setWorkspaceRequired(outcome.principal, outcome.workspaces)
    submitting.value = false
    emit('close')
    void router.push({ name: 'workspaces' })
    return
  }

  session.setAuthenticated(outcome.principal)
  // Refresh the cached org list/label for the new workspace, then land on the
  // area the new principal owns (org shell or personal home).
  await loadAccountWorkspaces(auth)
  submitting.value = false
  emit('close')
  void router.push({ name: regularDashboardRoute(outcome.principal) })
}

watch(
  () => props.open,
  (isOpen) => {
    const dialog = dialogRef.value
    if (dialog === null) return
    if (isOpen) {
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialog.open) dialog.showModal()
      void load()
    } else if (dialog.open) {
      dialog.close()
      trigger?.focus()
      trigger = null
    }
  },
)

// Escape and backdrop click behave like Cancel; they never switch workspace.
const onCancel = (event: Event): void => {
  event.preventDefault()
  close()
}

const onBackdropClick = (event: MouseEvent): void => {
  if (event.target === dialogRef.value) close()
}

onBeforeUnmount(() => {
  if (dialogRef.value?.open) dialogRef.value.close()
})
</script>

<template>
  <dialog
    ref="dialogRef"
    class="workspace-switch"
    :aria-labelledby="titleId"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <div class="workspace-switch__panel">
      <h2 :id="titleId" class="workspace-switch__title">
        {{ t('action.switch_workspace') }}
      </h2>
      <p class="workspace-switch__hint">{{ t('workspace.switch_hint') }}</p>

      <p v-if="loading" class="workspace-switch__loading" role="status">
        {{ t('common.loading') }}
      </p>

      <template v-else-if="loadErrorKey !== ''">
        <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
      </template>

      <template v-else>
        <fieldset class="workspace-switch__options" :disabled="submitting">
          <legend class="workspace-switch__legend">{{ t('action.switch_workspace') }}</legend>

          <label class="workspace-switch__option">
            <input
              v-model="selectedKey"
              type="radio"
              :name="groupName"
              value="personal"
              :disabled="submitting"
            />
            <span>{{ t('workspace.personal') }}</span>
          </label>

          <label v-for="org in options" :key="org.id" class="workspace-switch__option">
            <input
              v-model="selectedKey"
              type="radio"
              :name="groupName"
              :value="org.id"
              :disabled="submitting"
            />
            <span>
              {{ org.name }}
              <small v-if="org.tin !== ''" class="workspace-switch__tin">{{ org.tin }}</small>
            </span>
          </label>
        </fieldset>

        <p v-if="options.length === 0" class="workspace-switch__empty">
          {{ t('workspace.switch_empty') }}
        </p>

        <AppAlert v-if="errorKey !== ''" variant="error">{{ t(errorKey) }}</AppAlert>
      </template>

      <div class="workspace-switch__actions">
        <AppButton variant="ghost" :disabled="submitting" @click="close">
          {{ t('action.cancel') }}
        </AppButton>
        <AppButton
          v-if="loadErrorKey === ''"
          variant="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ t('workspace.switch_confirm') }}
        </AppButton>
        <AppButton v-else variant="primary" @click="load">
          {{ t('workspace.switch_retry') }}
        </AppButton>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.workspace-switch {
  z-index: var(--z-dialog);
  width: min(26rem, calc(100vw - 2 * var(--space-4)));
  margin: auto;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
}

.workspace-switch::backdrop {
  background-color: var(--color-scrim);
}

.workspace-switch__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.workspace-switch__title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.workspace-switch__hint,
.workspace-switch__loading,
.workspace-switch__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.workspace-switch__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.workspace-switch__legend {
  padding: 0 var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.workspace-switch__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.workspace-switch__tin {
  margin-inline-start: var(--space-2);
  color: var(--color-text-muted);
}

.workspace-switch__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
