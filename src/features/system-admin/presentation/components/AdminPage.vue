<script setup lang="ts">
/**
 * Common page frame: title/subtitle plus a vertical content rhythm. `wide`
 * opts a dense table page (the i18n catalog) into the wider frame; every other
 * page keeps the default `--content-max-width-wide` column.
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    wide?: boolean
  }>(),
  { subtitle: undefined, wide: false },
)
</script>

<template>
  <section class="admin-page" :class="{ 'admin-page--wide': wide }">
    <header class="admin-page__intro">
      <h1 class="admin-page__title">{{ title }}</h1>
      <p v-if="subtitle" class="admin-page__subtitle">{{ subtitle }}</p>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: var(--content-max-width-wide);
  padding-top: var(--space-5);
}

/* Dense catalog tables need the extra room; the wide column is the existing
   token already used by the settings pages. */
.admin-page--wide {
  max-width: var(--content-max-width-settings);
}

.admin-page__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.admin-page__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.admin-page__subtitle {
  max-width: 44rem;
  margin: 0;
  color: var(--color-text-muted);
}
</style>
