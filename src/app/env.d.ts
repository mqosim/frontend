/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional API origin override (e.g. `https://api.example.com`); leave empty for
   * the same-origin dev proxy. Must NOT include `/api/v1` — every API path already
   * starts with it.
   */
  readonly VITE_API_BASE_URL?: string
  /** Dev-only E-IMZO mock switch. Must be exactly `"true"`. */
  readonly VITE_EIMZO_MOCK?: string
  /**
   * Optional inactivity-warning override in milliseconds for the regular
   * (PERSON/ORG) context. Mostly used to shorten the timeout during QA;
   * production keeps the 20-minute default. Must be a positive number.
   */
  readonly VITE_IDLE_WARN_MS_REGULAR?: string
  /** Same as above for the SYSTEM context (10-minute default). */
  readonly VITE_IDLE_WARN_MS_SYSTEM?: string
  /** Optional warning-countdown override in milliseconds for both contexts (60-second default). */
  readonly VITE_IDLE_COUNTDOWN_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
