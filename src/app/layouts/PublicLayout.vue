<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthSessionStore } from '@/features/auth'
import { useSystemSessionStore } from '@/features/system-auth'
import BrandLogo from '@/shared/presentation/components/BrandLogo.vue'
import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

const { t } = useI18n()
const authSession = useAuthSessionStore()
const systemSession = useSystemSessionStore()

// Public chrome still reflects an existing session: a signed-in visitor gets a
// single Dashboard link (SYSTEM session takes precedence) instead of the two
// guest links.
const dashboardRouteName = computed<'app-home' | 'system-dashboard' | 'org' | null>(() => {
  if (systemSession.isAuthenticated) return 'system-dashboard'
  if (authSession.isAuthenticated) return regularDashboardRoute(authSession.principal)
  return null
})
</script>

<template>
  <div
    class="public-layout"
    :class="{ 'public-layout--language-only': authSession.isAuthenticated }"
  >
    <header class="public-layout__header">
      <RouterLink class="public-layout__brand" :to="{ name: 'landing' }">
        <BrandLogo />
      </RouterLink>

      <div class="public-layout__actions">
        <nav class="public-layout__nav">
          <RouterLink
            v-if="dashboardRouteName"
            class="public-layout__link"
            :to="{ name: dashboardRouteName }"
          >
            {{ t('nav.dashboard') }}
          </RouterLink>
          <template v-else>
            <RouterLink
              class="public-layout__link public-layout__register"
              :to="{ name: 'register' }"
            >
              {{ t('nav.register') }}
            </RouterLink>
            <RouterLink class="public-layout__link" :to="{ name: 'login' }">
              {{ t('nav.login') }}
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <main id="main" tabindex="-1" class="public-layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.public-layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* A signed-in regular visitor sees the language switcher without the
   standalone theme toggle, so reclaim the toggle's reserved width. */
.public-layout--language-only {
  --global-controls-reserved: var(--global-controls-width-language);
}

.public-layout__header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  /* Top padding matches the fixed controls' offset; with a
     --global-controls-height action row this puts both on one center line. */
  padding: var(--global-controls-top) var(--space-5) var(--space-3);
  /* Stop the header actions before the fixed top-right global controls. */
  padding-right: calc(
    var(--global-controls-reserved) + var(--space-4) + env(safe-area-inset-right, 0px)
  );
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.public-layout__brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  text-decoration: none;
}

.public-layout__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-3);
}

.public-layout__nav {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--space-1);
}

.public-layout__link {
  display: inline-flex;
  align-items: center;
  height: var(--global-controls-height);
  padding-inline: var(--space-2);
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.public-layout__link:hover {
  text-decoration: underline;
}

/* On phones the reserved control area leaves no room next to the brand; Register
   stays reachable from Login and from the Home primary button. */
@media (max-width: 30rem) {
  /* Let the brand shrink so Login keeps its place at 320px in uz/ru. */
  .public-layout {
    --brand-min-width: 0;
  }

  /* The larger wordmark needs a few more px at 320px: trim the header's left
     padding and brand/nav gap slightly so it never clips. */
  .public-layout__header {
    gap: var(--space-2);
    padding-left: var(--space-4);
  }

  .public-layout__register {
    display: none;
  }
}

.public-layout__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) var(--space-5);
}
</style>
