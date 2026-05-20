import type { CSSProperties } from 'react';

/**
 * Hitch wordmark — canonical logo (ported from the design system's Logo.jsx).
 *
 * viewBox 190×130 — extra headroom above the letters for the pin.
 *   • Lowercase DM Sans 600 letters as SVG <text> so they inherit
 *     currentColor (renders correctly on paper, ink, and brand surfaces).
 *   • The "i" is replaced by a tapered ROAD — a 1-point-perspective
 *     trapezoid, narrow at the top, widening to the baseline.
 *   • A dashed CENTERLINE runs down the road in the surface colour,
 *     reading as highway paint. Auto-hidden below 22px.
 *   • A teardrop map PIN with a circular aperture (evenodd cut) sits
 *     above the road. Tight kerning makes the word read as one "hitch".
 */
export interface LogoProps {
  /** Pixel height. Width is derived to keep the 190:130 aspect ratio. */
  size?: number;
  /** Road + pin colour. Defaults to brand violet. */
  accent?: string;
  /**
   * Colour of the dashed road paint — match the surface BEHIND the logo so
   * the dashes read as cut out. Defaults to white (light cards / paper).
   */
  centerline?: string;
  className?: string;
  style?: CSSProperties;
}

export function Logo({
  size = 36,
  accent = 'oklch(0.5106 0.2301 276.9656)',
  centerline = '#ffffff',
  className,
  style,
}: LogoProps) {
  const w = size * (190 / 130);

  // Road geometry — tight kerning between "h" and "tch".
  const cx = 58;
  const yTop = 40;
  const yBot = 116;
  const halfTop = 1.5;
  const halfBot = 7;
  const dashHide = size < 22;

  return (
    <svg
      viewBox="0 0 190 130"
      width={w}
      height={size}
      role="img"
      aria-label="Hitch"
      className={className}
      // Brand wordmark is LTR-only content (like booking IDs / phone
      // numbers) — never reorder it under an RTL (ar) layout.
      style={{
        display: 'block',
        overflow: 'visible',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        ...style,
      }}
    >
      <g
        style={{
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 80,
          letterSpacing: '-0.04em',
          fill: 'currentColor',
        }}
      >
        <text x="0" y={yBot}>
          h
        </text>
        <text x="70" y={yBot}>
          tch
        </text>
      </g>

      {/* Tapered road — 1-point perspective trapezoid */}
      <path
        d={`M ${cx - halfTop} ${yTop} L ${cx + halfTop} ${yTop} L ${cx + halfBot} ${yBot} L ${cx - halfBot} ${yBot} Z`}
        fill={accent}
      />

      {/* Dashed centerline — highway paint, cut from the road in the
          surface colour. */}
      {!dashHide && (
        <line
          x1={cx}
          y1={yTop + 4}
          x2={cx}
          y2={yBot - 4}
          stroke={centerline}
          strokeWidth="1.4"
          strokeDasharray="5 5"
          strokeLinecap="butt"
        />
      )}

      {/* Map pin — teardrop with circular aperture (evenodd cut). */}
      <path
        fillRule="evenodd"
        fill={accent}
        transform={`translate(${cx - 50} 0)`}
        d="
          M 50 2
          C 56.627 2, 62 7.373, 62 14
          C 62 22.5, 50 32, 50 32
          C 50 32, 38 22.5, 38 14
          C 38 7.373, 43.373 2, 50 2
          Z
          M 50 9.6
          A 4 4 0 1 1 49.999 9.6
          Z
        "
      />
    </svg>
  );
}
