/**
 * Locale-aware formatting for the SYSTEM area. Pure Intl wrappers — no new
 * dependency. `uzc` is the app's Cyrillic Uzbek locale tag and is not a valid
 * Intl tag, so it maps to `uz-Cyrl` (Latin Uzbek `uz` passes through
 * unchanged), mirroring the org dashboard's formatter.
 */
const toIntlLocale = (locale: string): string =>
  locale.toLowerCase().startsWith('uzc') ? 'uz-Cyrl' : locale

/** Locale-aware integer, e.g. `1,478` / `1 478`. */
export const formatSystemCount = (value: number, locale: string): string => {
  try {
    return new Intl.NumberFormat(toIntlLocale(locale)).format(value)
  } catch {
    return String(value)
  }
}

/** Medium date, e.g. `Oct 23, 2026` / `23-окт. 2026 г.`. */
export const formatSystemDate = (isoDate: string, locale: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return isoDate
  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day))
  } catch {
    return isoDate
  }
}

/** Medium date + short time for RFC3339 timestamps, e.g. `Oct 23, 2026, 4:05 PM`. */
export const formatSystemDateTime = (isoDateTime: string, locale: string): string => {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return isoDateTime
  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return isoDateTime
  }
}
