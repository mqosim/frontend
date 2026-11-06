/**
 * Locale-aware formatting for the dashboard: currency, dates, month labels and
 * percentages. Pure Intl wrappers — no new dependency. `uzc` is the app's
 * Cyrillic Uzbek locale tag and is not a valid Intl tag, so it maps to
 * `uz-Cyrl` (Latin Uzbek `uz` passes through unchanged).
 */
const toIntlLocale = (locale: string): string =>
  locale.toLowerCase().startsWith('uzc') ? 'uz-Cyrl' : locale

/** Whole-amount currency, e.g. `UZS 12,500,000` / `12 500 000 so'm`. */
export const formatDashboardMoney = (amount: number, currency: string, locale: string): string => {
  const intlLocale = toIntlLocale(locale)
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    try {
      return `${new Intl.NumberFormat(intlLocale).format(amount)} ${currency}`
    } catch {
      return `${amount} ${currency}`
    }
  }
}

/** Compact axis/label form, e.g. `12M` / `12 млн`. */
export const formatDashboardCompact = (amount: number, locale: string): string => {
  try {
    return new Intl.NumberFormat(toIntlLocale(locale), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return String(amount)
  }
}

/** Short date, e.g. `Oct 23` / `23-окт`. */
export const formatDashboardDate = (isoDate: string, locale: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return isoDate
  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
      day: 'numeric',
      month: 'short',
    }).format(new Date(year, month - 1, day))
  } catch {
    return isoDate
  }
}

/** Short month name for a `yyyy-mm` series point, e.g. `Oct` / `окт`. */
export const formatDashboardMonth = (yearMonth: string, locale: string): string => {
  const [year, month] = yearMonth.split('-').map(Number)
  if (year === undefined || month === undefined) return yearMonth
  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), { month: 'short' }).format(
      new Date(year, month - 1, 1),
    )
  } catch {
    return yearMonth
  }
}

/** Localized signed percent, e.g. `+11.2%` / `−3,1 %` (`value` is a ratio). */
export const formatDashboardPercent = (value: number, locale: string): string => {
  try {
    return new Intl.NumberFormat(toIntlLocale(locale), {
      style: 'percent',
      maximumFractionDigits: 1,
      signDisplay: 'always',
    }).format(value)
  } catch {
    return `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(1)}%`
  }
}
