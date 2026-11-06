<template>
  <div class="auth-layout">
    <div class="auth-layout__card">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: var(--space-5);
  /* Reserve the top-right global controls so the card is never covered, even
     when it grows tall on small screens. */
  padding-top: calc(var(--global-controls-top) + var(--global-controls-height));
}

.auth-layout__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max-width);
  padding: var(--space-6);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
</style>
