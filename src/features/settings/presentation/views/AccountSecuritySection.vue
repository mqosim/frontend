<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'
import type { UserProfile } from '@/shared/domain'

import ChangeEmailCard from '../components/ChangeEmailCard.vue'
import ChangePasswordCard from '../components/ChangePasswordCard.vue'

/**
 * The Account Security section of the Settings page: the reference's white panel
 * with the email-change and password-change cards.
 */
const { t } = useI18n()
const auth = useAuthUseCases()
const securityId = useId()

// The address the email-change form validates against ("must differ" rule).
const accountEmail = ref<string | null>(null)

onMounted(async () => {
  // Validates the session and supplies the current address; a failure leaves
  // the form usable for the password change and the email card falls back to
  // its "must differ" check without the current address.
  const profile = await auth.getProfile()
  if (profile.ok) accountEmail.value = profile.value.email
})

// The confirmed email change returns the refreshed profile, so the displayed
// address updates from backend data in one step.
const onEmailUpdated = (profile: UserProfile): void => {
  accountEmail.value = profile.email
}
</script>

<template>
  <section class="security-section" :aria-labelledby="securityId">
    <h2 :id="securityId" class="security-section__title">
      {{ t('settings.security_title') }}
    </h2>
    <p class="security-section__hint">{{ t('settings.security_hint') }}</p>

    <div class="security-section__cards">
      <ChangeEmailCard :current-email="accountEmail" @updated="onEmailUpdated" />
      <ChangePasswordCard />
    </div>
  </section>
</template>

<style scoped>
.security-section {
  margin-top: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.security-section__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--color-text);
}

.security-section__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.security-section__cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}
</style>
