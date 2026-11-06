import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'app.theme'

const isTheme = (value: string | null | undefined): value is Theme =>
  value === 'light' || value === 'dark'

const readStored = (): Theme | null => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

const prefersDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches

/**
 * The pre-paint script in index.html has already resolved and applied the theme,
 * so reading it back keeps this store in step with the first frame (no mismatch).
 */
const initialTheme = (): Theme => {
  const applied = document.documentElement.dataset.theme
  if (isTheme(applied)) return applied
  return readStored() ?? (prefersDark() ? 'dark' : 'light')
}

// Module-level singleton: the theme is one piece of UI state shared by the
// unauthenticated standalone toggle and the Settings → Appearance tiles, so a
// plain ref is enough (no store framework needed).
const theme = ref<Theme>(initialTheme())

const syncMetaThemeColor = (): void => {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta === null) return
  // Read the token rather than duplicating a colour literal here.
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg')
    .trim()
  if (background !== '') meta.setAttribute('content', background)
}

const apply = (next: Theme): void => {
  document.documentElement.dataset.theme = next
  syncMetaThemeColor()
}

const persist = (next: Theme): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the in-memory value stands.
  }
}

let initialised = false

export const useTheme = () => {
  if (!initialised) {
    initialised = true
    apply(theme.value)
  }

  const toggle = (): void => setTheme(theme.value === 'dark' ? 'light' : 'dark')

  // Explicit selection (Settings → Appearance); the unauthenticated standalone
  // toggle is just the flip.
  function setTheme(next: Theme): void {
    theme.value = next
    apply(next)
    persist(next)
  }

  return { theme, setTheme, toggle }
}
