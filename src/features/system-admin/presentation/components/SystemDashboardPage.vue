<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RouteLocationRaw } from 'vue-router'

import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

import { ADMIN_PERMISSIONS } from '../../domain/permissions'
import type { AdminPermissionCode } from '../../domain/permissions'
import { usePermissions } from '../composables/usePermissions'

/**
 * The SYSTEM landing page. It shows NO platform statistics: the backend has no
 * dashboard aggregate endpoint, and invented figures would misrepresent access.
 * Instead it offers navigation cards for exactly the areas the caller's
 * permissions open — organization data needs `tenants.read`, staff data needs
 * `system.users.read`, catalog data needs `i18n.read` and the audit chain needs
 * `audit.read`, each evaluated independently.
 */
const { t } = useI18n()
const { can } = usePermissions()

interface DashboardCard {
  readonly id: string
  readonly labelKey: string
  readonly hintKey: string
  readonly permission: AdminPermissionCode
  readonly to: RouteLocationRaw
}

const ALL_CARDS: readonly DashboardCard[] = [
  {
    id: 'organizations',
    labelKey: 'system.nav_organizations',
    hintKey: 'system.dash_hint_organizations',
    permission: ADMIN_PERMISSIONS.tenantsRead,
    to: { name: 'system-organizations' },
  },
  {
    id: 'system-users',
    labelKey: 'system.nav_system_users',
    hintKey: 'system.dash_hint_system_users',
    permission: ADMIN_PERMISSIONS.systemUsersRead,
    to: { name: 'system-system-users' },
  },
  {
    id: 'i18n',
    labelKey: 'system.nav_i18n',
    hintKey: 'system.dash_hint_i18n',
    permission: ADMIN_PERMISSIONS.i18nRead,
    to: { name: 'system-i18n' },
  },
  {
    id: 'audit',
    labelKey: 'system.nav_audit',
    hintKey: 'system.dash_hint_audit',
    permission: ADMIN_PERMISSIONS.auditRead,
    to: { name: 'system-audit' },
  },
]

const cards = computed(() => ALL_CARDS.filter((card) => can(card.permission)))

// A catalog-only administrator (the i18n Manager role) gets a minimal welcome
// and the catalog card, rather than empty organization/staff panels.
const catalogOnly = computed(
  () =>
    can(ADMIN_PERMISSIONS.i18nRead) &&
    !can(ADMIN_PERMISSIONS.tenantsRead) &&
    !can(ADMIN_PERMISSIONS.systemUsersRead) &&
    !can(ADMIN_PERMISSIONS.auditRead),
)
</script>

<template>
  <section class="sdash">
    <header class="sdash__intro">
      <p class="sdash__eyebrow">
        <span class="sdash__badge">{{ t('system.badge') }}</span>
      </p>
      <h1 class="sdash__title">{{ t('system.dash_title') }}</h1>
      <p class="sdash__subtitle">{{ t('system.dash_subtitle') }}</p>
      <p v-if="catalogOnly" class="sdash__notice">{{ t('system.dash_i18n_welcome') }}</p>
    </header>

    <div class="sdash__cards">
      <RouterLink v-for="card in cards" :key="card.id" class="sdash-card sdash-link" :to="card.to">
        <span class="sdash-link__icon" aria-hidden="true">
          <ModuleIcon :id="card.id" :size="20" />
        </span>
        <span class="sdash-link__body">
          <span class="sdash-link__label">{{ t(card.labelKey) }}</span>
          <span class="sdash-link__hint">{{ t(card.hintKey) }}</span>
        </span>
        <span class="sdash-link__arrow" aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.sdash {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width-dashboard);
  padding-top: var(--space-5);
}

.sdash__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sdash__eyebrow {
  margin: 0;
}

.sdash__badge {
  display: inline-flex;
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
}

.sdash__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.sdash__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}

.sdash__notice {
  margin: 0;
  color: var(--color-text-muted);
}

/* ── Navigation cards (the org Dashboard's card design language) ─────────── */
.sdash__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.sdash-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.sdash-link {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  color: var(--color-text);
  text-decoration: none;
}

.sdash-link:hover {
  background-color: var(--color-bg);
}

.sdash-link:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.sdash-link__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.sdash-link__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sdash-link__label {
  font-weight: 650;
}

.sdash-link__hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.sdash-link__arrow {
  flex: none;
  color: var(--color-text-muted);
}

@media (max-width: 48rem) {
  .sdash__cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
