<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import SettingsNav from '../components/SettingsNav.vue'
import AccountSecuritySection from './AccountSecuritySection.vue'
import AppearanceSettingsSection from './AppearanceSettingsSection.vue'
import LanguageSettingsSection from './LanguageSettingsSection.vue'
import ProfileSettingsSection from './ProfileSettingsSection.vue'

const { t } = useI18n()
const route = useRoute()

type SettingsSection = 'profile' | 'security' | 'language' | 'appearance'

// The optional `section` param addresses the sub-sections of the single
// `settings` route; anything unknown falls back to Account Security, so a stale
// link never dead-ends. The route name itself never changes (the module menu's
// and the personal header's active state depend on it).
const activeSection = computed<SettingsSection>(() => {
  const value = route.params.section
  const section = Array.isArray(value) ? value[0] : value
  if (section === 'profile' || section === 'language' || section === 'appearance') {
    return section
  }
  return 'security'
})
</script>

<template>
  <div class="settings-page">
    <SettingsNav class="settings-page__nav" />

    <div class="settings-page__main">
      <h1 class="settings-page__title">{{ t('action.settings') }}</h1>
      <p class="settings-page__subtitle">{{ t('settings.page_subtitle') }}</p>

      <ProfileSettingsSection v-if="activeSection === 'profile'" />
      <AccountSecuritySection v-else-if="activeSection === 'security'" />
      <LanguageSettingsSection v-else-if="activeSection === 'language'" />
      <AppearanceSettingsSection v-else />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  align-items: flex-start;
  gap: 17px;
  /* Centered by the authenticated shells; the width keeps the secondary nav
     and forms at a comfortable reading size on wide screens. */
  max-width: var(--content-max-width-settings);
}

/* The secondary Settings navigation: its own column beside the module menu,
   blending into the content background (no divider). */
.settings-page__nav {
  flex: none;
  width: 220px;
  padding-top: 100px;
}

.settings-page__main {
  flex: 1;
  min-width: 0;
}

.settings-page__title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text);
}

.settings-page__subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--color-text-muted);
}

@media (max-width: 63.99rem) {
  .settings-page {
    flex-direction: column;
    gap: var(--space-5);
  }

  .settings-page__nav {
    width: 100%;
    max-width: 340px;
    padding-top: 0;
  }
}
</style>
