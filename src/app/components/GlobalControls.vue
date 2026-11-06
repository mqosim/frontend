<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useAuthSessionStore } from '@/features/auth'
import { LanguageSwitcher } from '@/features/i18n'
import { useSystemSessionStore } from '@/features/system-auth'
import ThemeToggle from '@/shared/presentation/components/ThemeToggle.vue'

const route = useRoute()
const authSession = useAuthSessionStore()
const systemSession = useSystemSessionStore()

// The landing layout embeds the language switcher and theme toggle in its own
// header action group, so the fixed root pair would duplicate them there.
const landingOwnsControls = computed(() => route.meta.layout === 'landing')

// Anonymous browsing keeps the switcher everywhere; every authenticated area
// (person/org shells, the settings page and the SYSTEM area) manages the
// language from its Settings page instead, so the switcher is hidden there.
const showLanguage = computed(() => {
  const layout = route.meta.layout
  return layout !== 'person' && layout !== 'org' && layout !== 'settings' && layout !== 'system'
})

// The SELECTED-first / Uzbek-first ordering applies only to the anonymous
// authentication flow (login, register, workspace selection, system login).
// Every authenticated surface keeps its existing order: Settings has its own
// Language section. The landing header embeds its own selector instead of using
// these root controls.
const prioritizeSelected = computed(() => route.meta.layout === 'auth')

// The regular and SYSTEM authentication contexts are independent. Resolve the
// active context from the route prefix so a SYSTEM login keeps its own
// unauthenticated controls even when a regular session is also present.
const isSystemRoute = computed(() => route.path.startsWith('/system'))

// The standalone theme control belongs to unauthenticated browsing only.
// Signed-in users change the theme from Settings → Appearance, so the root
// control is hidden for the active authentication context.
const showThemeToggle = computed(() =>
  isSystemRoute.value ? !systemSession.isAuthenticated : !authSession.isAuthenticated,
)
</script>

<!--
  Mounted once at the app root so the language switcher and theme toggle occupy
  the exact same top-right spot on every page, independent of page content and
  of the active layout. Kept first in the DOM so the controls come early in the
  tab order.
-->
<template>
  <div v-if="!landingOwnsControls" class="global-controls">
    <LanguageSwitcher v-if="showLanguage" :prioritize-selected="prioritizeSelected" />
    <ThemeToggle v-if="showThemeToggle" />
  </div>
</template>

<style scoped>
.global-controls {
  position: fixed;
  top: var(--global-controls-top);
  right: calc(var(--space-4) + env(safe-area-inset-right, 0px));
  z-index: var(--z-controls);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
