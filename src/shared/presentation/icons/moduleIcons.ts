/**
 * Inline SVG icon artwork for module menus, keyed by module id.
 *
 * No icon library and no dependency: like the language flags (`flags.ts`), the
 * artwork is a small record of plain SVG shapes, all drawn on the SAME 24x24
 * grid with a single stroke style (width 2, round caps/joins, `currentColor`,
 * no fill) so the set looks consistent and soft/rounded. The geometry follows
 * the reference UI's professional outline icon family (the Lucide set), so
 * every module reads with the same visual weight. To add an icon: add ONE
 * entry to `MODULE_ICONS` keyed by the module id; anything not listed falls
 * back to a neutral shape in `ModuleIcon.vue`.
 */
export interface IconCircle {
  readonly cx: number
  readonly cy: number
  readonly r: number
}

export interface IconRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly rx?: number
  readonly ry?: number
}

export interface ModuleIconShape {
  readonly paths: readonly string[]
  readonly circles?: readonly IconCircle[]
  readonly rects?: readonly IconRect[]
}

export const MODULE_ICONS: Record<string, ModuleIconShape> = {
  // Dashboard: a house with a door, the home landing of the application.
  dashboard: {
    paths: [
      'M3 10.2a2 2 0 0 1 .71-1.53l7-5.95a2 2 0 0 1 2.58 0l7 5.95A2 2 0 0 1 21 10.2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
      'M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7',
    ],
  },
  // Invoices: a document with a folded corner and text lines.
  invoices: {
    paths: [
      'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      'M14 2v4a2 2 0 0 0 2 2h4',
      'M10 9H8',
      'M16 13H8',
      'M16 17H8',
    ],
  },
  // Bank: a classical facade — pediment over columns on a base.
  bank: {
    paths: [
      'M3 21h18',
      'M6 17.5V11',
      'M10 17.5V11',
      'M14 17.5V11',
      'M18 17.5V11',
      'M12 3l8 4.5H4Z',
    ],
  },
  // Assets: a sealed package box with its tape.
  assets: {
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'm3.3 7 8.7 5 8.7-5',
      'M12 22V12',
      'm7.5 4.27 9 5.15',
    ],
  },
  // Warehouse: a gabled storehouse with shelves inside.
  warehouse: {
    rects: [{ x: 6, y: 10, width: 12, height: 12 }],
    paths: [
      'M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.51l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z',
      'M6 18h12',
      'M6 14h12',
    ],
  },
  // Contracts: a drawn signature above a baseline.
  contracts: {
    paths: [
      'm21 17-2.16-1.87a.5.5 0 0 0-.84.37v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.55-3.99-3.97-8.5-4a1 1 0 0 0 0 5c4.15 0 4.75-11.3 5.71-13.5a2.5 2.5 0 1 1 3.31 3.28',
      'M3 21h18',
    ],
  },
  // Letters: an envelope with a soft flap.
  letters: {
    rects: [{ x: 2, y: 4, width: 20, height: 16, rx: 2 }],
    paths: ['m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  },
  // HR: two people, a full figure and a companion behind.
  hr: {
    circles: [{ cx: 9, cy: 7, r: 4 }],
    paths: [
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
      'M22 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
  },
  // Balance: a rising line chart with bars, the financial summary view.
  balance: {
    paths: [
      'M12 16v5',
      'M16 14v7',
      'M20 10v11',
      'm22 3-8.65 8.65a.5.5 0 0 1-.71 0L8.35 7.35a.5.5 0 0 0-.71 0L2 13',
    ],
  },
  // New documents: a document with a plus, for creating new paperwork.
  'new-documents': {
    paths: [
      'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      'M14 2v4a2 2 0 0 0 2 2h4',
      'M12 12v6',
      'M9 15h6',
    ],
  },
  // Apps: a 2x2 grid of tiles, the application launcher.
  apps: {
    rects: [{ x: 3, y: 3, width: 18, height: 18, rx: 2 }],
    paths: ['M3 12h18', 'M12 3v18'],
  },
  // Organizations: an office building with lit windows and a door.
  organizations: {
    rects: [{ x: 4, y: 2, width: 16, height: 20, rx: 2 }],
    paths: [
      'M9 22v-4h6v4',
      'M8 6h.01',
      'M12 6h.01',
      'M16 6h.01',
      'M8 10h.01',
      'M12 10h.01',
      'M16 10h.01',
      'M8 14h.01',
      'M12 14h.01',
      'M16 14h.01',
    ],
  },
  // Users: two people, the platform's account directory.
  users: {
    circles: [{ cx: 9, cy: 7, r: 4 }],
    paths: [
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
      'M22 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
  },
  // System users: a person with a gear, the control-plane account directory.
  'system-users': {
    paths: [
      'M10 15H6a4 4 0 0 0-4 4v2',
      'm14.305 16.53.923-.382',
      'm15.228 13.852-.923-.383',
      'm16.852 12.228-.383-.923',
      'm16.852 17.772-.383.924',
      'm19.148 12.228.383-.923',
      'm19.53 18.696-.382-.924',
      'm20.772 13.852.924-.383',
      'm20.772 16.148.924.383',
    ],
    circles: [
      { cx: 18, cy: 15, r: 3 },
      { cx: 9, cy: 7, r: 4 },
    ],
  },
  // Subscriptions: a bank card, billing and plans.
  subscriptions: {
    rects: [{ x: 2, y: 5, width: 20, height: 14, rx: 2 }],
    paths: ['M2 10h20'],
  },
  // Products: three stacked layers, the module catalogue.
  products: {
    paths: [
      'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
      'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65',
      'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65',
    ],
  },
  // Reports: axes with rising bars, analytics at a glance.
  reports: {
    paths: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  },
  // Audit: a shield with a check, the verified activity log.
  audit: {
    paths: [
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      'm9 12 2 2 4-4',
    ],
  },
}

/** Case-insensitive lookup; `null` means "no icon, use the neutral fallback". */
export const iconFor = (id: string): ModuleIconShape | null => MODULE_ICONS[id.trim()] ?? null

/** Neutral fallback: a rounded square, so a missing icon never breaks the menu. */
export const FALLBACK_ICON: ModuleIconShape = {
  paths: [],
  rects: [{ x: 5.5, y: 5.5, width: 13, height: 13, rx: 3 }],
}
