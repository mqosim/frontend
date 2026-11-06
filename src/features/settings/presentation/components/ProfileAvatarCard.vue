<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppSpinner from '@/shared/presentation/components/AppSpinner.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import { useAvatarService } from '../composables/useAvatarService'
import SecurityCard from './SecurityCard.vue'
import SettingsButton from './SettingsButton.vue'
import { AVATAR_MAX_FILE_SIZE, AVATAR_MIME_TYPES } from '../../domain/avatar'
import type { AvatarServiceError, ProfileAvatar } from '../../domain/avatar'

/**
 * Profile photo management with an explicit draft/save lifecycle. The component
 * owns only the temporary preview URL; the injected avatar service owns the URL
 * of the current avatar and can later be replaced by an HTTP adapter without
 * changing this UI.
 */
const props = defineProps<{
  initials: string | null
  profileAvailable: boolean
  profileLoading: boolean
}>()

const { t } = useI18n()
const avatarService = useAvatarService()

const fileInput = ref<HTMLInputElement | null>(null)
const currentAvatar = ref<ProfileAvatar | null>(null)
const pendingFile = ref<File | null>(null)
const pendingPreviewUrl = ref<string | null>(null)
const errorKey = ref('')
const confirmRemovalOpen = ref(false)

type AvatarPhase =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'save_failed'
  | 'removal_pending'
  | 'removing'
  | 'removed'
  | 'remove_failed'
  | 'load_failed'

const phase = ref<AvatarPhase>('loading')
let previewRequest = 0

const isBusy = computed(() => phase.value === 'saving' || phase.value === 'removing')
const previewLoading = computed(
  () =>
    phase.value === 'loading' ||
    (props.profileLoading && pendingPreviewUrl.value === null && currentAvatar.value === null),
)
const previewUrl = computed(() => pendingPreviewUrl.value ?? currentAvatar.value?.url ?? null)

const statusKey = computed(() => {
  if (props.profileLoading && pendingPreviewUrl.value === null && currentAvatar.value === null) {
    return 'common.loading'
  }

  switch (phase.value) {
    case 'loading':
      return 'common.loading'
    case 'saving':
      return 'settings.avatar_saving'
    case 'saved':
      return 'settings.avatar_saved'
    case 'save_failed':
      return 'settings.avatar_save_failed'
    case 'removal_pending':
      return 'settings.avatar_removal_pending'
    case 'removing':
      return 'settings.avatar_removing'
    case 'removed':
      return 'settings.avatar_removed'
    case 'remove_failed':
      return 'settings.avatar_remove_failed'
    case 'load_failed':
      return 'settings.avatar_load_failed'
    default:
      if (pendingFile.value !== null) return 'settings.avatar_pending'
      return currentAvatar.value === null ? 'settings.avatar_none' : 'settings.avatar_active'
  }
})

const statusClass = computed(() => ({
  'avatar-card__status--pending': pendingFile.value !== null,
  'avatar-card__status--success': phase.value === 'saved' || phase.value === 'removed',
  'avatar-card__status--error':
    phase.value === 'save_failed' ||
    phase.value === 'remove_failed' ||
    phase.value === 'load_failed',
}))

const mapServiceError = (error: AvatarServiceError): string => {
  switch (error.code) {
    case 'unsupported_type':
      return 'settings.avatar_invalid_type'
    case 'file_too_large':
      return 'settings.avatar_too_large'
    case 'invalid_image':
      return 'settings.avatar_invalid_image'
    case 'load_failed':
      return 'settings.avatar_load_failed'
    case 'save_failed':
      return 'settings.avatar_save_failed'
    case 'remove_failed':
      return 'settings.avatar_remove_failed'
    default:
      return 'settings.avatar_generic_error'
  }
}

onMounted(async () => {
  try {
    const result = await avatarService.getAvatar()
    if (!result.ok) {
      phase.value = 'load_failed'
      errorKey.value = mapServiceError(result.error)
      return
    }
    currentAvatar.value = result.value
    phase.value = 'ready'
  } catch {
    phase.value = 'load_failed'
    errorKey.value = 'settings.avatar_generic_error'
  }
})

const releasePendingPreview = (): void => {
  if (pendingPreviewUrl.value === null) return
  URL.revokeObjectURL(pendingPreviewUrl.value)
  pendingPreviewUrl.value = null
}

const openFilePicker = (): void => {
  if (!isBusy.value) fileInput.value?.click()
}

const validatePreview = (url: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('The selected file is not a readable image'))
    image.src = url
  })

const onFileSelected = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file == null || isBusy.value) return

  errorKey.value = ''
  phase.value = 'ready'

  if (!AVATAR_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    errorKey.value = 'settings.avatar_invalid_type'
    return
  }
  if (file.size > AVATAR_MAX_FILE_SIZE) {
    errorKey.value = 'settings.avatar_too_large'
    return
  }

  const request = ++previewRequest
  const previewUrl = URL.createObjectURL(file)

  try {
    await validatePreview(previewUrl)
  } catch {
    URL.revokeObjectURL(previewUrl)
    if (request === previewRequest) errorKey.value = 'settings.avatar_invalid_image'
    return
  }

  if (request !== previewRequest) {
    URL.revokeObjectURL(previewUrl)
    return
  }

  releasePendingPreview()
  pendingFile.value = file
  pendingPreviewUrl.value = previewUrl
  phase.value = 'ready'
}

const cancelPending = (): void => {
  if (isBusy.value) return
  previewRequest += 1
  releasePendingPreview()
  pendingFile.value = null
  errorKey.value = ''
  phase.value = 'ready'
}

const savePending = async (): Promise<void> => {
  const file = pendingFile.value
  if (file === null || isBusy.value) return

  errorKey.value = ''
  phase.value = 'saving'

  try {
    const result = await avatarService.updateAvatar(file)
    if (!result.ok) {
      phase.value = 'save_failed'
      errorKey.value = mapServiceError(result.error)
      return
    }

    currentAvatar.value = result.value
    releasePendingPreview()
    pendingFile.value = null
    phase.value = 'saved'
  } catch {
    phase.value = 'save_failed'
    errorKey.value = 'settings.avatar_generic_error'
  }
}

const requestRemoval = (): void => {
  if (currentAvatar.value === null || pendingFile.value !== null || isBusy.value) return
  errorKey.value = ''
  phase.value = 'removal_pending'
  confirmRemovalOpen.value = true
}

const cancelRemoval = (): void => {
  if (phase.value === 'removing') return
  confirmRemovalOpen.value = false
  phase.value = 'ready'
}

const confirmRemoval = async (): Promise<void> => {
  if (currentAvatar.value === null || isBusy.value) return

  phase.value = 'removing'
  try {
    const result = await avatarService.removeAvatar()
    if (!result.ok) {
      phase.value = 'remove_failed'
      errorKey.value = mapServiceError(result.error)
      confirmRemovalOpen.value = false
      return
    }

    currentAvatar.value = null
    phase.value = 'removed'
  } catch {
    phase.value = 'remove_failed'
    errorKey.value = 'settings.avatar_generic_error'
  } finally {
    confirmRemovalOpen.value = false
  }
}

onBeforeUnmount(() => {
  previewRequest += 1
  releasePendingPreview()
})
</script>

<template>
  <SecurityCard :title="t('settings.avatar_title')" :hint="t('settings.avatar_hint')">
    <template #icon>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </template>

    <div class="avatar-card__content">
      <div class="avatar-card__preview" :aria-busy="previewLoading">
        <AppSpinner v-if="previewLoading" :size="24" decorative />

        <img
          v-else-if="previewUrl !== null"
          class="avatar-card__image"
          :src="previewUrl"
          :alt="t('settings.avatar_preview_alt')"
        />

        <span v-else-if="profileAvailable && initials !== null" class="avatar-card__initials">
          {{ initials }}
        </span>

        <svg v-else class="avatar-card__default" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>

        <span v-if="pendingFile !== null" class="avatar-card__draft-badge">
          {{ t('settings.avatar_draft_badge') }}
        </span>
      </div>

      <div class="avatar-card__details">
        <p class="avatar-card__status" :class="statusClass" aria-live="polite">
          {{ t(statusKey) }}
        </p>
        <p class="avatar-card__notice">{{ t('settings.avatar_local_notice') }}</p>
      </div>
    </div>

    <AppAlert
      v-if="phase === 'saved' || phase === 'removed'"
      variant="info"
      class="avatar-card__alert"
    >
      {{ t(phase === 'saved' ? 'settings.avatar_saved' : 'settings.avatar_removed') }}
    </AppAlert>

    <AppAlert v-if="errorKey" variant="error" class="avatar-card__alert">
      {{ t(errorKey) }}
    </AppAlert>

    <div class="avatar-card__actions">
      <template v-if="pendingFile !== null">
        <SettingsButton variant="secondary" :disabled="isBusy" @click="cancelPending">
          {{ t('action.cancel') }}
        </SettingsButton>
        <SettingsButton :loading="phase === 'saving'" :disabled="isBusy" @click="savePending">
          {{ t('settings.avatar_save') }}
        </SettingsButton>
      </template>

      <template v-else>
        <SettingsButton
          variant="secondary"
          :disabled="currentAvatar === null || isBusy"
          @click="requestRemoval"
        >
          {{ t('settings.avatar_remove') }}
        </SettingsButton>
        <SettingsButton :disabled="isBusy" @click="openFilePicker">
          {{ t(currentAvatar === null ? 'settings.avatar_select' : 'settings.avatar_change') }}
        </SettingsButton>
      </template>
    </div>

    <input
      ref="fileInput"
      class="avatar-card__file"
      type="file"
      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
      tabindex="-1"
      :aria-label="t('settings.avatar_file_label')"
      @change="onFileSelected"
    />

    <ConfirmDialog
      :open="confirmRemovalOpen"
      :title="t('settings.avatar_remove_title')"
      :message="t('settings.avatar_remove_message')"
      :confirm-label="t('settings.avatar_remove_confirm')"
      :cancel-label="t('action.cancel')"
      :loading="phase === 'removing'"
      initial-focus="cancel"
      @confirm="confirmRemoval"
      @cancel="cancelRemoval"
      @dismiss="cancelRemoval"
    />
  </SecurityCard>
</template>

<style scoped>
.avatar-card__content {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.avatar-card__preview {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  overflow: visible;
  border-radius: 50%;
  background-color: var(--color-info-surface);
  color: var(--color-primary);
}

.avatar-card__image,
.avatar-card__initials,
.avatar-card__default {
  width: 88px;
  height: 88px;
  border-radius: 50%;
}

.avatar-card__image {
  display: block;
  object-fit: cover;
}

.avatar-card__initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 25px;
  font-weight: 600;
  line-height: 1;
}

.avatar-card__default {
  width: 42px;
  height: 42px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.avatar-card__draft-badge {
  position: absolute;
  right: -5px;
  bottom: -4px;
  padding: 3px 7px;
  border: 2px solid var(--color-surface);
  border-radius: 999px;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.avatar-card__details {
  min-width: 0;
}

.avatar-card__status {
  margin: 0;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
}

.avatar-card__status--pending {
  color: var(--color-primary);
}

.avatar-card__status--success {
  color: var(--color-info);
}

.avatar-card__status--error {
  color: var(--color-danger);
}

.avatar-card__notice {
  max-width: 620px;
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 12.5px;
  line-height: 1.5;
}

.avatar-card__alert {
  margin-top: 16px;
}

.avatar-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 18px;
  margin-top: 20px;
}

.avatar-card__file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 37.49rem) {
  .avatar-card__content {
    align-items: flex-start;
    flex-direction: column;
  }

  .avatar-card__actions {
    flex-direction: column-reverse;
  }

  .avatar-card__actions > * {
    width: 100%;
  }
}
</style>
