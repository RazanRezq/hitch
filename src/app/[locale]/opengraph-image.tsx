import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { routing, type AppLocale } from '@/i18n/routing';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Hitch — Fixed-fare airport transfers in Iceland';

export function generateImageMetadata() {
  return [{ id: 'og', size, contentType, alt }];
}

// Satori needs raw font bytes to render text — its default fallback has no
// Arabic coverage and renders Latin in a generic face. Fetch DM Sans (Latin)
// and Cairo (Arabic) once per process from Google Fonts' static CDN and
// cache the bytes.
const FONT_URLS = {
  dmSans:
    'https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.20/files/dm-sans-latin-700-normal.woff',
  cairo:
    'https://cdn.jsdelivr.net/npm/@fontsource/cairo@5.0.18/files/cairo-arabic-700-normal.woff',
} as const;

let fontCache: { dmSans: ArrayBuffer; cairo: ArrayBuffer } | null = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const fetchFont = async (url: string) => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`Failed to fetch font ${url}: ${res.status}`);
    return res.arrayBuffer();
  };
  const [dmSans, cairo] = await Promise.all([
    fetchFont(FONT_URLS.dmSans),
    fetchFont(FONT_URLS.cairo),
  ]);
  fontCache = { dmSans, cairo };
  return fontCache;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as AppLocale)
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const tagline = t('tagline');
  const subline = t('ogDescription');
  const isRtl = locale === 'ar';
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          fontFamily: isRtl
            ? '"Cairo", "DM Sans"'
            : '"DM Sans", "Cairo"',
          background:
            'radial-gradient(120% 100% at 0% 0%, #2E1065 0%, transparent 55%),' +
            'radial-gradient(120% 100% at 100% 0%, #0EA5E9 0%, transparent 50%),' +
            'radial-gradient(140% 120% at 100% 100%, #14B8A6 0%, transparent 55%),' +
            'linear-gradient(135deg, #0B1026 0%, #1E1B4B 50%, #0B1026 100%)',
          color: '#FFFFFF',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        {/* aurora highlight sweep */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 900,
            height: 900,
            background:
              'radial-gradient(closest-side, rgba(124, 58, 237, 0.55), transparent 70%)',
            filter: 'blur(20px)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -160,
            width: 800,
            height: 800,
            background:
              'radial-gradient(closest-side, rgba(20, 184, 166, 0.45), transparent 70%)',
            filter: 'blur(20px)',
            display: 'flex',
          }}
        />

        {/* TOP: logo + locale chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <HitchLogo />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: 'uppercase',
              direction: 'ltr',
            }}
          >
            {locale.toUpperCase()} · ISK
          </div>
        </div>

        {/* MIDDLE: tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              textShadow: '0 6px 40px rgba(0,0,0,0.25)',
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 880,
            }}
          >
            {subline}
          </div>
        </div>

        {/* BOTTOM: route chips + brand bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            direction: 'ltr',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Chip>KEF</Chip>
            <Arrow />
            <Chip>REYKJAVÍK</Chip>
            <Arrow />
            <Chip>BLUE LAGOON</Chip>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: 4,
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
            }}
          >
            hitch.is · 64.13°N
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'DM Sans',
          data: fonts.dmSans,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Cairo',
          data: fonts.cairo,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}

function Chip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 22px',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.10)',
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: 2,
      }}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 28,
        color: 'rgba(255,255,255,0.55)',
      }}
    >
      →
    </div>
  );
}

/**
 * OG-card variant of `src/components/brand/logo.tsx`. Satori cannot render
 * SVG <text> nodes, so the wordmark is plain HTML/CSS here — the "h" / "tch"
 * letters with the road+pin glyph inserted between them as a small SVG (the
 * road sits where the "i" would be).
 */
function HitchLogo() {
  const accent = '#FFFFFF';
  const centerline = 'rgba(11, 16, 38, 0.85)';
  const wordmarkStyle = {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontWeight: 700,
    fontSize: 168,
    lineHeight: 1,
    letterSpacing: '-0.06em',
    color: accent,
    display: 'flex',
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        // Brand wordmark is LTR-only — never reorder under an RTL layout.
        direction: 'ltr',
      }}
    >
      <span style={wordmarkStyle}>h</span>
      {/* Road + map pin (the glyph that replaces the "i") */}
      <div
        style={{
          display: 'flex',
          alignSelf: 'stretch',
          alignItems: 'flex-end',
          marginLeft: -4,
          marginRight: -4,
        }}
      >
        <svg
          width={42}
          height={168}
          viewBox="0 0 30 130"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* tapered road */}
          <path
            d="M 13.5 40 L 16.5 40 L 22 116 L 8 116 Z"
            fill={accent}
          />
          {/* dashed centerline */}
          <line
            x1="15"
            y1="44"
            x2="15"
            y2="112"
            stroke={centerline}
            strokeWidth="1.8"
            strokeDasharray="5 5"
          />
          {/* map pin — teardrop with circular aperture */}
          <path
            fillRule="evenodd"
            fill={accent}
            d="M 15 2 C 21.627 2, 27 7.373, 27 14 C 27 22.5, 15 32, 15 32 C 15 32, 3 22.5, 3 14 C 3 7.373, 8.373 2, 15 2 Z M 15 9.6 A 4 4 0 1 1 14.999 9.6 Z"
          />
        </svg>
      </div>
      <span style={wordmarkStyle}>tch</span>
    </div>
  );
}
