/**
 * Client-side QR helpers for the TOTP enrollment step.
 *
 * The QR encodes the one-time `otpauth_uri` that the backend returns from
 * `POST /system/auth/totp/enroll`. It is built entirely in the browser: the
 * library is imported dynamically so it never ships in the main or sign-in
 * chunk, and the URI is never sent anywhere, logged, or stored.
 *
 * The matrix is converted into one SVG `path` here instead of rendering one
 * node per module, so the component can draw it with plain `<svg><path></svg>`
 * — no `v-html`, no canvas, no `data:` URL and no `<img>`.
 */

/** The rendered QR: a square viewBox plus one SVG path for all dark modules. */
export interface EnrollmentQr {
  readonly size: number
  readonly path: string
}

/**
 * Builds a single SVG path for the dark modules of a square QR matrix.
 *
 * Every row is compressed into horizontal runs (`h<length>`), so a version-6
 * code becomes a few hundred path commands rather than thousands of rects.
 * Rows and columns follow the matrix order, which the caller maps to a
 * `0 0 size size` viewBox.
 */
export const toQrPath = (modules: readonly (readonly boolean[])[]): string => {
  const commands: string[] = []
  for (let y = 0; y < modules.length; y += 1) {
    const row = modules[y] ?? []
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x += 1
        continue
      }
      const start = x
      while (x < row.length && row[x]) x += 1
      const width = x - start
      commands.push(`M${start} ${y}h${width}v1h-${width}z`)
    }
  }
  return commands.join('')
}

/**
 * Encodes the enrollment URI with `uqr` (ECC M, 4-module quiet zone) and
 * returns the path plus its square viewBox size.
 *
 * Any failure — a rejected dynamic import, an unsupported/oversized payload,
 * an unexpected matrix — resolves to `null`, so the caller can fall back to
 * the text form. Nothing about the URI is logged or included in the result.
 */
export const buildEnrollmentQr = async (otpauthUri: string): Promise<EnrollmentQr | null> => {
  try {
    // Dynamic import: the QR library is only fetched when the enroll step is
    // actually shown, never as part of the sign-in chunk.
    const { encode } = await import('uqr')
    const { data } = encode(otpauthUri, { ecc: 'M', border: 4 })
    const size = data.length
    if (size === 0 || data.some((row) => row.length !== size)) return null
    const path = toQrPath(data)
    return path.length === 0 ? null : { size, path }
  } catch {
    return null
  }
}
