/**
 * Inline SVG flags for the language switcher, drawn for a 20x20 box that the
 * container clips to a circle (`border-radius: 50%` + `overflow: hidden`).
 *
 * No icon library and no emoji (emoji flags do not render on Windows). The
 * artwork is deliberately SIMPLIFIED: at 20px, stars, crescents, emblems, thin
 * lines and anything under ~3px turn into blurry noise, so each flag is only a
 * few bold, solid-colour rectangles on integer coordinates. The circle crops the
 * corners, so keep the important shapes near the centre. Keep those rules when
 * adding a flag.
 *
 * To add a language, add ONE entry to `FLAGS` keyed by its lower-case internal
 * code; anything not listed falls back to a neutral circle in `FlagIcon.vue`.
 * Lookups normalise the code first (`uz-Cyrl`/`uz_Cyrl` → `uzc`), so every
 * Uzbek form — including Uzbek Cyrillic — resolves to the Uzbekistan flag.
 */

import { fromApiLang } from '../../domain/localeCodes'

export interface FlagRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Artwork colour, theme-independent by design. */
  readonly fill: string
}

// Shared flag artwork colours (solid and saturated, not theme tokens).
const WHITE = '#FFFFFF'
const UZ_BLUE = '#0099B5'
const UZ_GREEN = '#1EB53A'
const RU_BLUE = '#0039A6'
const RU_RED = '#D52B1E'
const EN_BLUE = '#012169'
const EN_RED = '#C8102E'

export const FLAGS: Record<string, readonly FlagRect[]> = {
  // Three horizontal bands, blue/white/green. 20 is not divisible by 3, so the
  // bands are 7/6/7 to stay on whole pixels; the red separators, crescent and
  // stars are omitted.
  uz: [
    { x: 0, y: 0, w: 20, h: 7, fill: UZ_BLUE },
    { x: 0, y: 7, w: 20, h: 6, fill: WHITE },
    { x: 0, y: 13, w: 20, h: 7, fill: UZ_GREEN },
  ],
  // Three horizontal bands, white/blue/red, 7/6/7 as above.
  // Uzbek Cyrillic (`uzc`) shares the Uzbek flag artwork above.
  uzc: [
    { x: 0, y: 0, w: 20, h: 7, fill: UZ_BLUE },
    { x: 0, y: 7, w: 20, h: 6, fill: WHITE },
    { x: 0, y: 13, w: 20, h: 7, fill: UZ_GREEN },
  ],
  ru: [
    { x: 0, y: 0, w: 20, h: 7, fill: WHITE },
    { x: 0, y: 7, w: 20, h: 6, fill: RU_BLUE },
    { x: 0, y: 13, w: 20, h: 7, fill: RU_RED },
  ],
  // `en` is not tied to a country; a simplified UK-style flag: a blue field, a
  // thick white cross and a thick red cross centred on top (no diagonals).
  en: [
    { x: 0, y: 0, w: 20, h: 20, fill: EN_BLUE },
    { x: 6, y: 0, w: 8, h: 20, fill: WHITE },
    { x: 0, y: 6, w: 20, h: 8, fill: WHITE },
    { x: 8, y: 0, w: 4, h: 20, fill: EN_RED },
    { x: 0, y: 8, w: 20, h: 4, fill: EN_RED },
  ],
}

/** Case-insensitive lookup after code normalisation; `null` means "no flag, use the neutral fallback". */
export const flagFor = (code: string): readonly FlagRect[] | null =>
  FLAGS[fromApiLang(code.trim()).toLowerCase()] ?? null
