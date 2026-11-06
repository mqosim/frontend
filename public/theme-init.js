/*
 * Pre-paint theme resolver.
 *
 * Kept as a blocking external script (rather than inline) so a future
 * Content-Security-Policy can forbid inline scripts without a hash/nonce.
 * It runs while <head> is parsed — before the app CSS paints — so the resolved
 * theme is applied for the very first frame and there is no flash of the wrong
 * theme. Only sets `data-theme`; colours live in tokens.css and the
 * `<meta name="theme-color">` is synced by the app from the active token.
 */
;(function () {
  try {
    var stored = localStorage.getItem('app.theme')
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    document.documentElement.dataset.theme = theme
  } catch {
    // localStorage can be unavailable (private mode); fall back to light.
    document.documentElement.dataset.theme = 'light'
  }
})()
