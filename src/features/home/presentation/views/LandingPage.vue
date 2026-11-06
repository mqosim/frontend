<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthSessionStore } from '@/features/auth'
import { useSystemSessionStore } from '@/features/system-auth'
import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

import LandingCta from '../components/LandingCta.vue'
import LandingFeatures from '../components/LandingFeatures.vue'
import LandingHero from '../components/LandingHero.vue'
import LandingSteps from '../components/LandingSteps.vue'
import LandingTrust from '../components/LandingTrust.vue'

/**
 * The public landing page. The single primary action follows the visitor's
 * context: Dashboard when a session already exists (SYSTEM wins), otherwise
 * registration.
 */
const { t } = useI18n()
const authSession = useAuthSessionStore()
const systemSession = useSystemSessionStore()

const start = computed<{ to: string; label: string }>(() => {
  if (systemSession.isAuthenticated) return { to: 'system-dashboard', label: t('nav.dashboard') }
  if (authSession.isAuthenticated) {
    return { to: regularDashboardRoute(authSession.principal), label: t('nav.dashboard') }
  }
  return { to: 'register', label: t('landing.cta.start') }
})
</script>

<template>
  <div class="landing-page">
    <LandingHero :start-to="start.to" :start-label="start.label" />
    <LandingFeatures />
    <LandingSteps />
    <LandingTrust />
    <LandingCta :start-to="start.to" :start-label="start.label" />
  </div>
</template>
