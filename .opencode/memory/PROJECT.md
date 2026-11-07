# Project

Stack and rules: see AGENTS.md.
Old backend: Go HTTP API 1.0.0 (170+ paths, /auth, /system, /admin, /master, /public). New backend: FastAPI (identity, documents, audit, notifications; superadmin and i18n modules planned).
Audit (phase 1) result: 40 API call sites, 40 distinct old endpoints: EXACT 1, ADAPTABLE 10, GAP 7, OBSOLETE 22.
Decisions: translations will be served by a new backend i18n module (languages uz, uz-Cyrl, ru, en), not static JSON. SYSTEM/admin area will be re-served by a planned backend superadmin module (keep slices, do not delete). Password/email change and /master/* undecided.
Dev: new backend origin/port UNKNOWN; refresh cookie is SameSite=none; Secure (dev implications unverified).
