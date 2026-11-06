/**
 * Formats a wallet amount with the given currency for the active locale.
 * Amounts arrive as decimal strings; parsing through `Number` is only for
 * grouping/rounding presentation, and an unparseable amount is returned as-is.
 * So'm has no circulating subunit, so amounts render as whole units.
 * The app's Cyrillic Uzbek locale `uzc` is not a valid Intl tag (it silently
 * falls back to English), so it maps to `uz-Cyrl`; Latin `uz` passes through.
 */
export const formatWalletAmount = (
  amount: string,
  currencyCode: string,
  locale: string,
): string => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return amount

  const intlLocale = locale.toLowerCase().startsWith('uzc') ? 'uz-Cyrl' : locale
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    // Not a valid ISO currency code — fall back to a grouped number.
    try {
      return `${new Intl.NumberFormat(intlLocale).format(value)} ${currencyCode}`
    } catch {
      return `${amount} ${currencyCode}`
    }
  }
}
