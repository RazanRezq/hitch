'use client';

import { useEffect, useRef } from 'react';

interface SeamlessHeroVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

/**
 * Two-video crossfade looper (ported from the design system).
 *
 * Native `<video loop>` flushes the decode pipeline and seeks the demuxer
 * back to byte 0 on every loop — a 30–200ms freeze on the last frame. We
 * run two decoders of the same `src` and crossfade A→B right before the
 * active clip ends, fully masking the seek latency so the join is invisible.
 * `loop` is intentionally omitted — we own the loop.
 */
export function SeamlessHeroVideo({ src, poster, className }: SeamlessHeroVideoProps) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef<'a' | 'b'>('a');
  const swappingRef = useRef(false);

  // Long enough to swallow a sluggish mobile decoder cold-start, short
  // enough that the viewer never registers a fade.
  const CROSSFADE_SEC = 0.45;

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    a.style.opacity = '1';
    b.style.opacity = '0';
    try {
      a.load();
    } catch {
      /* noop */
    }
    try {
      b.load();
    } catch {
      /* noop */
    }
    a.play().catch(() => {});
    // Briefly play+pause B so its first frame is decoded before the first
    // crossfade (some engines lazy-decode → black flash otherwise).
    b.play()
      .then(() => {
        b.pause();
        try {
          b.currentTime = 0;
        } catch {
          /* noop */
        }
      })
      .catch(() => {});

    const onTimeUpdate = (e: Event) => {
      if (swappingRef.current) return;
      const current = e.target as HTMLVideoElement;
      const isActive =
        (activeRef.current === 'a' && current === a) ||
        (activeRef.current === 'b' && current === b);
      if (!isActive) return;
      const dur = current.duration;
      if (!isFinite(dur) || dur <= 0) return;
      if (dur - current.currentTime > CROSSFADE_SEC) return;

      swappingRef.current = true;
      const incoming = current === a ? b : a;
      const outgoing = current;

      try {
        incoming.currentTime = 0;
      } catch {
        /* noop */
      }
      const startIncoming = incoming.play();
      if (startIncoming?.catch) startIncoming.catch(() => {});

      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / (CROSSFADE_SEC * 1000));
        const s = k * k * (3 - 2 * k); // smoothstep
        outgoing.style.opacity = String(1 - s);
        incoming.style.opacity = String(s);
        if (k < 1) {
          requestAnimationFrame(tick);
        } else {
          outgoing.pause();
          try {
            outgoing.currentTime = 0;
          } catch {
            /* noop */
          }
          outgoing.style.opacity = '0';
          incoming.style.opacity = '1';
          activeRef.current = activeRef.current === 'a' ? 'b' : 'a';
          swappingRef.current = false;
        }
      };
      requestAnimationFrame(tick);
    };

    // Safety net for coarse `timeupdate` (Safari ~250ms): hard-cut.
    const onEnded = (e: Event) => {
      if (swappingRef.current) return;
      const current = e.target as HTMLVideoElement;
      const incoming = current === a ? b : a;
      try {
        incoming.currentTime = 0;
      } catch {
        /* noop */
      }
      incoming.play().catch(() => {});
      incoming.style.opacity = '1';
      current.style.opacity = '0';
      try {
        current.currentTime = 0;
      } catch {
        /* noop */
      }
      activeRef.current = activeRef.current === 'a' ? 'b' : 'a';
    };

    a.addEventListener('timeupdate', onTimeUpdate);
    b.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('ended', onEnded);
    b.addEventListener('ended', onEnded);

    const onVis = () => {
      if (document.hidden) {
        a.pause();
        b.pause();
      } else {
        (activeRef.current === 'a' ? a : b).play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate);
      b.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('ended', onEnded);
      b.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const common = {
    src,
    poster,
    muted: true,
    playsInline: true,
    preload: 'auto' as const,
    disablePictureInPicture: true,
    'aria-hidden': true,
    tabIndex: -1,
  };

  return (
    <>
      <video ref={aRef} className={className} style={{ opacity: 1 }} {...common} />
      <video ref={bRef} className={className} style={{ opacity: 0 }} {...common} />
    </>
  );
}
