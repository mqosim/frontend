<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

/**
 * Hero: the product promise next to a static, decorative preview of the
 * authenticated dashboard. The preview only reuses real module names and the
 * design tokens — the numbers are illustrative placeholders, clearly not real
 * customer data.
 */
defineProps<{
  startTo: string
  startLabel: string
}>()

const { t } = useI18n()

const sidebarModules = [
  { id: 'dashboard', label: 'org.module_dashboard', active: true },
  { id: 'invoices', label: 'org.module_invoices', active: false },
  { id: 'bank', label: 'org.module_bank', active: false },
  { id: 'balance', label: 'org.module_balance', active: false },
  { id: 'hr', label: 'org.module_hr', active: false },
  { id: 'new-documents', label: 'org.module_new_documents', active: false },
]

const stats = [
  { label: 'landing.mock.income', value: '24 800 000' },
  { label: 'landing.mock.expenses', value: '13 250 000' },
  { label: 'landing.mock.balance', value: '11 550 000' },
]

const bars = [42, 58, 50, 72, 64, 88, 96]

const documents = [
  { number: 'FR-1042', paid: true },
  { number: 'SH-0087', paid: false },
  { number: 'FR-1041', paid: true },
]
</script>

<template>
  <section class="hero">
    <div class="hero__copy">
      <h1 class="hero__title">{{ t('landing.hero.title') }}</h1>
      <p class="hero__subtitle">{{ t('landing.hero.subtitle') }}</p>
      <div class="hero__actions">
        <RouterLink class="hero__start" :to="{ name: startTo }">{{ startLabel }}</RouterLink>
        <a class="hero__preview" href="#features">{{ t('landing.cta.preview') }}</a>
      </div>
    </div>

    <div class="hero__window" aria-hidden="true">
      <div class="hero__frame">
        <div class="hero__sidebar">
          <span class="hero__brand"><span class="hero__brand-accent">M</span>FIN</span>
          <ul class="hero__modules">
            <li
              v-for="item in sidebarModules"
              :key="item.id"
              class="hero__module"
              :class="{ 'hero__module--active': item.active }"
            >
              <ModuleIcon :id="item.id" :size="16" />
              <span>{{ t(item.label) }}</span>
            </li>
          </ul>
        </div>

        <div class="hero__body">
          <p class="hero__body-title">{{ t('org.module_dashboard') }}</p>
          <div class="hero__stats">
            <div v-for="stat in stats" :key="stat.label" class="hero__stat">
              <span class="hero__stat-label">{{ t(stat.label) }}</span>
              <span class="hero__stat-value">{{ stat.value }}</span>
            </div>
          </div>
          <div class="hero__chart">
            <span
              v-for="(bar, index) in bars"
              :key="index"
              class="hero__bar"
              :style="{ height: `${bar}%` }"
            />
          </div>
          <p class="hero__docs-title">{{ t('landing.mock.documents') }}</p>
          <ul class="hero__docs">
            <li v-for="doc in documents" :key="doc.number" class="hero__doc">
              <span class="hero__doc-number">{{ doc.number }}</span>
              <span
                class="hero__pill"
                :class="doc.paid ? 'hero__pill--paid' : 'hero__pill--pending'"
              >
                {{ t(doc.paid ? 'landing.mock.paid' : 'landing.mock.pending') }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  /* The preview gets the larger share: translated module names and amounts
     need the room more than the copy column does. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  gap: var(--space-7);
  max-width: 76rem;
  margin-inline: auto;
  padding: var(--space-7) var(--space-5) var(--space-6);
}

/* ── Copy column ────────────────────────────────────────────────────────── */
.hero__title {
  margin: 0;
  font-size: clamp(2rem, 1.1rem + 2.9vw, 3.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--color-text);
}

.hero__subtitle {
  max-width: 30rem;
  margin: var(--space-4) 0 0;
  font-size: var(--font-size-lg);
  line-height: 1.5;
  color: var(--color-text-muted);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.hero__start {
  display: inline-flex;
  align-items: center;
  height: 2.75rem;
  padding-inline: var(--space-5);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.hero__start:hover {
  background-color: var(--color-primary-hover);
}

.hero__preview {
  display: inline-flex;
  align-items: center;
  height: 2.75rem;
  padding-inline: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.hero__preview:hover {
  background-color: var(--color-bg);
}

/* ── Product preview ────────────────────────────────────────────────────── */
.hero__window {
  min-width: 0;
}

.hero__frame {
  display: grid;
  /* Wide enough for the longest translated module name (uz/uzc/ru) at the
     13px module size; the label itself still ellipsizes as a safety net. */
  grid-template-columns: 11.5rem minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.hero__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-2);
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

/* The miniature wordmark mirrors the real sidebar's Sora ExtraBold mark; the
   size scales the same ~33% bump from the mock's 1rem base. */
.hero__brand {
  padding-inline: var(--space-2);
  font-family: var(--font-brand);
  font-size: calc(var(--font-size-md) * 1.35);
  font-weight: 800;
  color: var(--color-brand-foreground);
}

.hero__brand-accent {
  color: var(--color-brand-accent);
}

.hero__modules {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero__module {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  /* One step below --font-size-sm: the longest uz/uzc/ru module names then fit
     the 11.5rem rail without truncation. */
  font-size: 0.8125rem;
  white-space: nowrap;
}

/* Ellipsis, never hard clipping: a safety net for future locales whose names
   outgrow the rail. */
.hero__module span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero__module--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 600;
}

.hero__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
}

.hero__body-title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
}

.hero__stats {
  display: grid;
  /* Cards wrap instead of squeezing: a 6.25rem floor keeps the widest amount
     ("24 800 000") on one line in every locale, even when the preview column
     is narrow between ~900-1100px viewports. */
  grid-template-columns: repeat(auto-fit, minmax(6.25rem, 1fr));
  gap: var(--space-2);
}

.hero__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.hero__stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.hero__stat-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.hero__chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 4.5rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.hero__bar {
  flex: 1;
  min-width: 0;
  border-radius: 2px 2px 0 0;
  background-color: var(--color-info-surface);
}

.hero__bar:nth-child(6n + 6) {
  background-color: var(--color-info);
}

.hero__docs-title {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.hero__docs {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero__doc {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.hero__doc-number {
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.hero__pill {
  padding: 1px var(--space-2);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.hero__pill--paid {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.hero__pill--pending {
  background-color: var(--color-warning-surface);
  color: var(--color-warning);
}

/* ── Motion ─────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: no-preference) {
  .hero__copy,
  .hero__window {
    animation: hero-rise 0.5s ease both;
  }

  .hero__window {
    animation-delay: 0.08s;
  }

  @keyframes hero-rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 56rem) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero__subtitle {
    max-width: 40rem;
  }
}

@media (max-width: 30rem) {
  .hero {
    padding-inline: var(--space-4);
  }

  .hero__sidebar {
    display: none;
  }

  .hero__frame {
    grid-template-columns: 1fr;
  }

  /* Full-width stat rows on phones: auto-fit would leave an asymmetric
     2+1 layout at 320px. */
  .hero__stats {
    grid-template-columns: 1fr;
  }
}
</style>
