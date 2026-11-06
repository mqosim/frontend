<!--
  Shared brand slot for every MFIN wordmark: Sora ExtraBold, sized ~33% above
  the original wordmark (fluid on narrow viewports). The text is deliberately
  untranslated, and this component keeps the future asset swap isolated to one
  place without changing any surrounding link or layout.
-->
<template>
  <span class="brand-logo"><span class="brand-logo__accent">M</span>FIN</span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  min-width: var(--brand-min-width);
  height: var(--global-controls-height);
  font-family: var(--font-brand);
  font-size: var(--font-size-brand);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--color-brand-foreground);
  white-space: nowrap;
}

/* The leading letter carries the brand green in both themes; "FIN" follows the
   theme-aware brand foreground (dark navy in light mode, white in dark). */
.brand-logo__accent {
  color: var(--color-brand-accent);
}
</style>
