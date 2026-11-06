<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import { errorMessageKey } from '@/shared/presentation/errors/messages'
import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

import type { WorkspaceChoice } from '../../domain/entities'
import { useAuthUseCases } from '../composables/useAuthUseCases'
import { useAuthSessionStore } from '../stores/sessionStore'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthUseCases()
const session = useAuthSessionStore()

const choice = ref<WorkspaceChoice>({ kind: 'personal' })
const submitting = ref(false)
const errorKey = ref('')

const workspaces = computed(() => session.workspaces)

const submit = async (): Promise<void> => {
  submitting.value = true
  errorKey.value = ''
  const result = await auth.selectWorkspace(choice.value)
  submitting.value = false

  if (!result.ok) {
    handleError(result.error)
    return
  }
  if (result.value.kind === 'workspace_required') {
    session.setWorkspaceRequired(result.value.principal, result.value.workspaces)
    return
  }
  session.setAuthenticated(result.value.principal)
  // Land on the shell for the workspace the selection just produced (personal ->
  // PERSON home, org -> the org shell), read from the post-selection principal.
  void router.push({ name: regularDashboardRoute(result.value.principal) })
}

const handleError = (error: AppError): void => {
  if (error.kind === 'Unauthorized' || error.kind === 'Forbidden') {
    // The pending token is gone (and it has no refresh cookie), so the only way
    // forward is to sign in again.
    session.setAnonymous()
    void router.push({ name: 'login' })
    return
  }
  errorKey.value = errorMessageKey(error)
}

const backToLogin = (): void => {
  session.setAnonymous()
  void router.push({ name: 'login' })
}
</script>

<template>
  <section class="workspace">
    <header class="workspace__header">
      <h1 class="workspace__title">{{ t('auth.workspace_title') }}</h1>
      <p class="workspace__subtitle">{{ t('auth.workspace_subtitle') }}</p>
    </header>

    <form class="workspace__form" novalidate @submit.prevent="submit">
      <AppAlert v-if="errorKey" variant="error">{{ t(errorKey) }}</AppAlert>

      <fieldset class="workspace__options" :disabled="submitting">
        <legend class="workspace__legend">{{ t('auth.workspace_title') }}</legend>

        <label class="workspace__option">
          <input v-model="choice" type="radio" name="workspace" :value="{ kind: 'personal' }" />
          <span>{{ t('auth.workspace_personal') }}</span>
        </label>

        <p v-if="workspaces.length === 0" class="workspace__none">
          {{ t('auth.workspace_none') }}
        </p>

        <label v-for="workspace in workspaces" :key="workspace.id" class="workspace__option">
          <input
            v-model="choice"
            type="radio"
            name="workspace"
            :value="{ kind: 'org', orgId: workspace.id }"
          />
          <span>
            {{ workspace.name }}
            <small v-if="workspace.tin" class="workspace__tin">{{ workspace.tin }}</small>
          </span>
        </label>
      </fieldset>

      <AppButton type="submit" block :loading="submitting">
        {{ t('auth.workspace_submit') }}
      </AppButton>
    </form>

    <button class="workspace__back" type="button" @click="backToLogin">
      {{ t('auth.back_to_login') }}
    </button>
  </section>
</template>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.workspace__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.workspace__title {
  font-size: var(--font-size-xl);
}

.workspace__subtitle {
  color: var(--color-text-muted);
}

.workspace__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.workspace__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.workspace__legend {
  padding: 0 var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.workspace__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.workspace__tin {
  margin-inline-start: var(--space-2);
  color: var(--color-text-muted);
}

.workspace__none {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.workspace__back {
  align-self: start;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}
</style>
