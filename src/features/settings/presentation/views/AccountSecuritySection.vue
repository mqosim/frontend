<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'

import EimzoLinkCard from '../components/EimzoLinkCard.vue'

/**
 * The Account Security section of the Settings page. The backend does not expose
 * the email-change or password-change flows yet, so the section keeps its place
 * in the Settings navigation, shows one neutral notice instead of the two
 * forms, and offers the E-IMZO key link, which the contract does support.
 */
const { t } = useI18n()
const securityId = useId()
</script>

<template>
  <section class="security-section" :aria-labelledby="securityId">
    <h2 :id="securityId" class="security-section__title">
      {{ t('settings.security_title') }}
    </h2>
    <p class="security-section__hint">{{ t('settings.security_hint') }}</p>

    <div class="security-section__notice">
      <AppAlert variant="info">{{ t('settings.security_unavailable') }}</AppAlert>
    </div>

    <EimzoLinkCard />
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

.security-section__notice {
  margin-top: 20px;
}
</style>
