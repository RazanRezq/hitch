/**
 * Decorative crafted SVG art for the editorial landing (creative-freedom
 * surface per CLAUDE.md — hardcoded Iceland palette is intentional here).
 * All pure/deterministic so they render identically on server and client.
 */

export type TerrainVariant = 'reykjavik' | 'kef' | 'lagoon';

export function TerrainSVG({ variant }: { variant: TerrainVariant }) {
  if (variant === 'reykjavik') {
    return (
      <svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="rvk-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B2A3F" />
            <stop offset="60%" stopColor="#1E5577" />
            <stop offset="100%" stopColor="#4A2A8E" />
          </linearGradient>
          <radialGradient id="rvk-aurora" cx="30%" cy="20%" r="60%">
            <stop offset="0%" stopColor="#5BE9B9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#5BE9B9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="480" fill="url(#rvk-sky)" />
        <rect width="600" height="480" fill="url(#rvk-aurora)" />
        <path
          d="M -50 140 Q 200 80 400 140 T 700 130"
          stroke="#5BE9B9"
          strokeWidth="1.5"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M -50 170 Q 250 100 450 170 T 700 160"
          stroke="#7C3AED"
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 0 380 L 80 290 L 140 320 L 220 240 L 300 300 L 380 250 L 460 310 L 540 270 L 600 300 L 600 480 L 0 480 Z"
          fill="#0B2A3F"
          opacity="0.92"
        />
        <path
          d="M 0 420 L 60 360 L 130 390 L 210 340 L 300 380 L 390 350 L 470 390 L 560 360 L 600 380 L 600 480 L 0 480 Z"
          fill="#000"
          opacity="0.55"
        />
        <g opacity="0.85">
          {Array.from({ length: 18 }).map((_, i) => (
            <rect
              key={i}
              x={120 + i * 22}
              y={400 + (i % 3) * 4}
              width="2"
              height="2"
              fill="#FFB347"
            />
          ))}
        </g>
      </svg>
    );
  }
  if (variant === 'kef') {
    return (
      <svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="kef-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E5577" />
            <stop offset="100%" stopColor="#0B2A3F" />
          </linearGradient>
        </defs>
        <rect width="600" height="480" fill="url(#kef-sky)" />
        <path d="M -20 360 L 620 280" stroke="#FFB347" strokeWidth="3" opacity="0.8" />
        <path d="M -20 360 L 620 280" stroke="#FFB347" strokeWidth="1" strokeDasharray="6 14" />
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={-10 + i * 30} cy={360 - i * 4} r="2" fill="#FFB347" opacity="0.9" />
        ))}
        <rect x="0" y="380" width="600" height="100" fill="#1A1A1A" />
        <path
          d="M 0 380 Q 100 370 200 378 T 400 374 T 600 380 L 600 480 L 0 480 Z"
          fill="#0B0B0B"
        />
        <rect x="500" y="240" width="6" height="80" fill="#2A2A2A" />
        <circle cx="503" cy="232" r="6" fill="#5BE9B9" opacity="0.9" />
        <circle cx="503" cy="232" r="14" fill="#5BE9B9" opacity="0.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9DC4DB" />
          <stop offset="60%" stopColor="#4A90B8" />
          <stop offset="100%" stopColor="#1E5577" />
        </linearGradient>
        <linearGradient id="bl-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5BE9B9" />
          <stop offset="100%" stopColor="#2EC4B6" />
        </linearGradient>
      </defs>
      <rect width="600" height="480" fill="url(#bl-sky)" />
      <path
        d="M 0 250 L 80 210 L 160 230 L 260 200 L 360 220 L 460 190 L 600 220 L 600 280 L 0 280 Z"
        fill="#1A1A1A"
      />
      <path d="M 0 280 L 600 280 L 600 360 L 0 360 Z" fill="url(#bl-water)" opacity="0.85" />
      <ellipse cx="180" cy="270" rx="120" ry="20" fill="white" opacity="0.35" />
      <ellipse cx="420" cy="275" rx="140" ry="18" fill="white" opacity="0.3" />
      <ellipse cx="320" cy="262" rx="90" ry="14" fill="white" opacity="0.5" />
      <path d="M 0 360 L 600 360 L 600 480 L 0 480 Z" fill="#0B0B0B" />
      <path
        d="M 0 360 Q 80 350 160 358 T 320 354 T 480 358 T 600 360"
        fill="none"
        stroke="#2A2A2A"
        strokeWidth="2"
      />
    </svg>
  );
}

export type SilhouetteId = 'sedan' | 'suv' | 'van' | 'lux';

export function Silhouette({ id }: { id: SilhouetteId }) {
  if (id === 'sedan') {
    return (
      <svg viewBox="0 0 240 96" fill="none">
        <path
          d="M 20 70 Q 40 70 50 60 L 80 38 Q 100 28 130 28 L 170 28 Q 195 28 215 60 Q 220 70 220 72 L 220 78 L 20 78 Z"
          fill="#1A1A1A"
        />
        <circle cx="60" cy="78" r="11" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <circle cx="180" cy="78" r="11" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <path d="M 80 40 L 110 32 L 160 32 L 185 50 Z" fill="#5BE9B9" opacity="0.18" />
      </svg>
    );
  }
  if (id === 'suv') {
    return (
      <svg viewBox="0 0 240 96" fill="none">
        <path
          d="M 22 72 L 22 56 Q 22 44 35 38 L 70 22 Q 88 16 130 16 L 175 16 Q 200 16 215 36 L 220 50 L 220 78 L 22 78 Z"
          fill="#1A1A1A"
        />
        <circle cx="62" cy="78" r="13" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <circle cx="180" cy="78" r="13" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <path d="M 70 30 L 100 22 L 165 22 L 195 42 Z" fill="#5BE9B9" opacity="0.18" />
      </svg>
    );
  }
  if (id === 'van') {
    return (
      <svg viewBox="0 0 240 96" fill="none">
        <path
          d="M 22 78 L 22 32 Q 22 22 35 22 L 200 22 Q 220 22 220 42 L 220 78 Z"
          fill="#1A1A1A"
        />
        <circle cx="62" cy="78" r="12" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <circle cx="180" cy="78" r="12" fill="#0B0B0B" stroke="#5BE9B9" strokeWidth="1" />
        <rect x="40" y="32" width="50" height="22" fill="#5BE9B9" opacity="0.22" />
        <rect x="100" y="32" width="50" height="22" fill="#5BE9B9" opacity="0.22" />
        <rect x="160" y="32" width="40" height="22" fill="#5BE9B9" opacity="0.22" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 96" fill="none">
      <path
        d="M 18 72 Q 30 72 42 60 L 76 32 Q 100 22 130 22 L 168 22 Q 200 22 220 60 Q 224 72 224 74 L 224 78 L 18 78 Z"
        fill="#0B0B0B"
      />
      <circle cx="58" cy="78" r="11" fill="#0B0B0B" stroke="#FFB347" strokeWidth="1.2" />
      <circle cx="184" cy="78" r="11" fill="#0B0B0B" stroke="#FFB347" strokeWidth="1.2" />
      <path d="M 76 36 L 108 26 L 162 26 L 192 48 Z" fill="#FFB347" opacity="0.22" />
    </svg>
  );
}

export function FleetGlacier() {
  return (
    <div className="ed-fleet-glacier" aria-hidden="true">
      <svg viewBox="0 0 1200 320" preserveAspectRatio="none">
        <defs>
          <linearGradient id="glc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DCEBF3" />
            <stop offset="100%" stopColor="#9DC4DB" />
          </linearGradient>
        </defs>
        <rect width="1200" height="320" fill="url(#glc)" />
        <path
          d="M 0 240 L 120 200 L 240 230 L 360 195 L 480 220 L 600 185 L 720 215 L 840 190 L 960 225 L 1080 205 L 1200 230 L 1200 320 L 0 320 Z"
          fill="#9DC4DB"
          opacity="0.85"
        />
        <path
          d="M 0 270 L 100 250 L 220 268 L 340 245 L 460 262 L 580 240 L 700 260 L 820 244 L 940 264 L 1060 250 L 1200 268 L 1200 320 L 0 320 Z"
          fill="#4A90B8"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}

export function CoverageMap() {
  return (
    <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="cv-glow" cx="64%" cy="42%" r="40%">
          <stop offset="0%" stopColor="#5BE9B9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5BE9B9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="rgba(255,255,255,0.06)" strokeWidth="0.3">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="160" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} />
        ))}
      </g>
      <path
        d="M 18 70 C 30 32, 70 24, 102 30 C 132 36, 154 26, 178 46 C 192 60, 178 100, 152 110 C 122 120, 92 112, 62 116 C 28 120, 12 100, 18 70 Z"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.5"
      />
      <path
        d="M 50 92 Q 90 80 130 60 T 178 50"
        stroke="#5BE9B9"
        strokeWidth="0.7"
        fill="none"
        strokeDasharray="2 3"
      />
      <path
        d="M 130 60 Q 145 80 158 100"
        stroke="rgba(91,233,185,0.5)"
        strokeWidth="0.5"
        fill="none"
        strokeDasharray="1.5 2.5"
      />
      <circle cx="130" cy="60" r="48" fill="url(#cv-glow)" />
      <g fontFamily="var(--font-mono), monospace" fontSize="3.6" fill="white">
        <circle cx="50" cy="92" r="2.4" fill="#5BE9B9" />
        <text x="50" y="102" textAnchor="middle">
          KEF
        </text>
        <circle cx="130" cy="60" r="3" fill="#fff" />
        <text x="130" y="54" textAnchor="middle">
          RVK
        </text>
        <circle cx="64" cy="104" r="1.8" fill="#FFB347" />
        <text x="64" y="113" textAnchor="middle" fill="rgba(255,255,255,0.85)">
          BLU
        </text>
        <circle cx="158" cy="100" r="1.8" fill="#FFB347" />
        <text x="158" y="109" textAnchor="middle" fill="rgba(255,255,255,0.85)">
          SEL
        </text>
      </g>
    </svg>
  );
}

/**
 * Deterministic starfield — positions derived from the index (no Math.random)
 * so SSR and client markup match exactly (no hydration mismatch).
 */
export function HeroStars({ count = 20 }: { count?: number }) {
  const stars = Array.from({ length: count }).map((_, i) => {
    const a = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const b = (Math.sin(i * 78.233) * 12543.633) % 1;
    const c = (Math.sin(i * 4.531) * 9871.13) % 1;
    const round = (n: number) => Math.round(n * 1000) / 1000;
    return {
      left: round(Math.abs(a) * 100),
      top: round(Math.abs(b) * 100),
      size: round(Math.abs(c) * 1.5 + 1),
      delay: round(Math.abs(a + c) * 3),
    };
  });
  return (
    <div className="h-hero-stars" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            insetInlineStart: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
