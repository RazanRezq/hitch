import { qrcodegen } from './qrcodegen';

export interface QrMatrix {
  /** Number of modules per side (excludes the quiet zone). */
  size: number;
  /** modules[y][x] — true = dark module. */
  modules: boolean[][];
}

/**
 * Encode text to a QR module matrix. ECC "medium" (~15% recovery) balances
 * density and print robustness for a receipt-sized code. Dependency-free —
 * backed by the vendored Nayuki generator so no npm package is added.
 */
export function encodeQr(text: string): QrMatrix {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const size: number = qr.size;
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(qr.getModule(x, y) as boolean);
    modules.push(row);
  }
  return { size, modules };
}

/**
 * Build a single SVG path 'd' covering every dark module (1 unit each), plus the
 * total viewBox dimension including a quiet zone. `border` defaults to the
 * spec-recommended 4 modules for reliable scanning.
 */
export function qrSvgPath(m: QrMatrix, border = 4): { dimension: number; path: string } {
  const parts: string[] = [];
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (m.modules[y]![x]) parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  return { dimension: m.size + border * 2, path: parts.join('') };
}
