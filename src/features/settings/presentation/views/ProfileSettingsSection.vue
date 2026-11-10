<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'

import ProfileAvatarCard from '../components/ProfileAvatarCard.vue'

/**
 * Profile settings. The account's display name comes from `/identity/me`
 * (`full_name`); the masked email is only a fallback source for initials when no
 * name is exposed. If the profile request fails, the avatar card falls back to
 * the neutral default avatar rather than inventing user details.
 */
const { t } = useI18n()
const auth = useAuthUseCases()
const titleId = useId()

const profileLoading = ref(true)
const profileName = ref<string | null>(null)
const profileEmail = ref<string | null>(null)
const profileAvailable = ref(false)

onMounted(async () => {
  try {
    const profile = await auth.getProfile()
    if (profile.ok) {
      profileName.value = profile.value.fullName ?? null
      profileEmail.value = profile.value.email
      profileAvailable.value = profile.value.fullName != null || profile.value.email !== null
    }
  } catch {
    profileAvailable.value = false
  } finally {
    profileLoading.value = false
  }
})

const initials = computed(() => {
  const name = profileName.value?.trim() ?? ''
  if (name.length > 0) {
    return name
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
  }

  const email = profileEmail.value
  if (email === null) return null

  const localPart = email.split('@')[0] ?? ''
  const words = localPart
    .split(/[._\-+]+/)
    .filter((part) => part.length > 0 && /^[a-zA-Z0-9]+$/.test(part))
    .slice(0, 2)

  if (words.length > 0) {
    return words.map((word) => word.charAt(0).toUpperCase()).join('')
  }

  const letters = localPart.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2)
  return letters.length > 0 ? letters.toUpperCase() : null
})
</script>

<template>
  <section class="profile-section" :aria-labelledby="titleId">
    <h2 :id="titleId" class="profile-section__title">{{ t('settings.profile_title') }}</h2>
    <p class="profile-section__hint">{{ t('settings.profile_hint') }}</p>

    <div class="profile-section__cards">
      <ProfileAvatarCard
        :initials="initials"
        :profile-available="profileAvailable"
        :profile-loading="profileLoading"
      />
    </div>
  </section>
</template>

<style scoped>
.profile-section {
  margin-top: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.profile-section__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--color-text);
}

.profile-section__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.profile-section__cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}
</style>
