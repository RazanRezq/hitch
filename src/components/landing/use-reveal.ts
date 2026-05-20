'use client';

import { useEffect, useRef } from 'react';

/**
 * Adds the `.in` class once the element scrolls into view (one-shot), which
 * drives the `.h-reveal` opacity/translate transition. Respects reduced
 * motion: such users get the content immediately via the global CSS rule.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('in');
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
