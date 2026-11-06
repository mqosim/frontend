<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

/**
 * Product overview: three alternating text/visual rows (workspaces, documents,
 * E-IMZO sign-in) followed by the module strip. Visuals are decorative
 * sketches of the real product surfaces; the module strip reuses the actual
 * module names and carries the development note, so nothing unfinished is
 * presented as shipped.
 */
const { t } = useI18n()

const modules = [
  { id: 'invoices', label: 'org.module_invoices' },
  { id: 'bank', label: 'org.module_bank' },
  { id: 'assets', label: 'org.module_assets' },
  { id: 'warehouse', label: 'org.module_warehouse' },
  { id: 'contracts', label: 'org.module_contracts' },
  { id: 'letters', label: 'org.module_letters' },
  { id: 'hr', label: 'org.module_hr' },
  { id: 'balance', label: 'org.module_balance' },
  { id: 'new-documents', label: 'org.module_new_documents' },
]

const documents = [
  { number: 'FR-1042', paid: true },
  { number: 'SH-0087', paid: false },
  { number: 'FR-1041', paid: true },
]
</script>

<template>
  <section id="features" class="features">
    <div class="features__intro">
      <h2 class="features__heading">{{ t('landing.features.title') }}</h2>
      <p class="features__lede">{{ t('landing.features.subtitle') }}</p>
    </div>

    <div class="features__row">
      <div class="features__text">
        <h3 class="features__title">{{ t('landing.features.workspaces.title') }}</h3>
        <p class="features__body">{{ t('landing.features.workspaces.text') }}</p>
      </div>
      <div class="features__visual" aria-hidden="true">
        <div class="features__workspace">
          <span class="features__workspace-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-1a7 7 0 0 1 14 0v1" stroke-linecap="round" />
            </svg>
          </span>
          <span class="features__workspace-name">{{ t('workspace.personal') }}</span>
        </div>
        <div class="features__workspace">
          <span class="features__workspace-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="3" width="14" height="18" rx="1.5" />
              <path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2" stroke-linecap="round" />
            </svg>
          </span>
          <span class="features__workspace-name">{{ t('workspace.unknown') }}</span>
        </div>
      </div>
    </div>

    <div class="features__row features__row--flip">
      <div class="features__text">
        <h3 class="features__title">{{ t('landing.features.documents.title') }}</h3>
        <p class="features__body">{{ t('landing.features.documents.text') }}</p>
      </div>
      <div class="features__visual" aria-hidden="true">
        <ul class="features__docs">
          <li v-for="doc in documents" :key="doc.number" class="features__doc">
            <span class="features__doc-number">{{ doc.number }}</span>
            <span
              class="features__pill"
              :class="doc.paid ? 'features__pill--paid' : 'features__pill--pending'"
            >
              {{ t(doc.paid ? 'landing.mock.paid' : 'landing.mock.pending') }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div class="features__row">
      <div class="features__text">
        <h3 class="features__title">{{ t('landing.features.signing.title') }}</h3>
        <p class="features__body">{{ t('landing.features.signing.text') }}</p>
      </div>
      <div class="features__visual" aria-hidden="true">
        <div class="features__sign">
          <span class="features__sign-icon">
            <ModuleIcon id="contracts" :size="24" />
          </span>
          <span class="features__sign-line features__sign-line--short" />
          <span class="features__sign-line" />
          <span class="features__sign-line features__sign-line--short" />
        </div>
      </div>
    </div>

    <div class="features__modules">
      <h3 class="features__modules-title">{{ t('landing.modules.title') }}</h3>
      <p class="features__modules-subtitle">{{ t('landing.modules.subtitle') }}</p>
      <ul class="features__module-grid">
        <li v-for="module in modules" :key="module.id" class="features__module">
          <ModuleIcon :id="module.id" :size="20" />
          <span>{{ t(module.label) }}</span>
        </li>
      </ul>
      <p class="features__modules-note">{{ t('landing.modules.note') }}</p>
    </div>
  </section>
</template>

<style scoped>
.features {
  max-width: 76rem;
  margin-inline: auto;
  padding: var(--space-7) var(--space-5);
  border-top: 1px solid var(--color-border);
  scroll-margin-top: 4.5rem;
}

/* ── Intro ──────────────────────────────────────────────────────────────── */
.features__intro {
  max-width: 42rem;
  margin-bottom: var(--space-7);
}

.features__heading {
  margin: 0;
  font-size: clamp(1.5rem, 1.15rem + 1.3vw, 2.125rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--color-text);
}

.features__lede {
  margin: var(--space-3) 0 0;
  font-size: var(--font-size-lg);
  line-height: 1.5;
  color: var(--color-text-muted);
}

/* ── Alternating rows ───────────────────────────────────────────────────── */
.features__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-7);
  margin-bottom: var(--space-7);
}

.features__row--flip .features__visual {
  order: -1;
}

.features__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.features__body {
  max-width: 32rem;
  margin: var(--space-2) 0 0;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.features__visual {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
}

/* Workspaces sketch: two stacked workspace cards. */
.features__workspace {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.features__workspace-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.features__workspace-icon svg {
  width: 1.125rem;
  height: 1.125rem;
}

.features__workspace-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

/* Documents sketch: compact document rows with status pills. */
.features__docs {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.features__doc {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.features__doc-number {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.features__pill {
  padding: 2px var(--space-2);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.features__pill--paid {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.features__pill--pending {
  background-color: var(--color-warning-surface);
  color: var(--color-warning);
}

/* E-IMZO sketch: the signature icon with skeleton lines. */
.features__sign {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
}

.features__sign-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: var(--radius-md);
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.features__sign-line {
  width: 100%;
  max-width: 12rem;
  height: 0.5rem;
  border-radius: 999px;
  background-color: var(--color-bg);
}

.features__sign-line--short {
  max-width: 7rem;
}

/* ── Module strip ───────────────────────────────────────────────────────── */
.features__modules {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.features__modules-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 650;
  color: var(--color-text);
}

.features__modules-subtitle {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
}

.features__module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: var(--space-2);
  margin: var(--space-5) 0 0;
  padding: 0;
  list-style: none;
}

.features__module {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: 550;
}

.features__module svg {
  color: var(--color-text-muted);
}

.features__modules-note {
  margin: var(--space-4) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 56rem) {
  .features {
    padding-inline: var(--space-4);
  }

  .features__row {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  /* Keep the reading order text first on every row when stacked. */
  .features__row--flip .features__visual {
    order: 0;
  }
}

@media (max-width: 30rem) {
  .features {
    padding-inline: var(--space-3);
  }

  .features__module-grid {
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  }
}
</style>
