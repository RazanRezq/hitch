'use client';

import { useEffect } from 'react';

/**
 * One-time, interruptible auto-scroll from the hero to the CareBand for
 * passengers who arrive via the in-vehicle QR sticker (`/qr` → `/?ref=qr`,
 * see next.config.ts). The intent: let the brand register for a beat, then
 * guide them to the "Because we care" / Report a driver section — WITHOUT
 * hijacking anyone who is already engaging with the page.
 *
 * Guardrails that make it feel like an assist rather than a takeover:
 *  - Only arms when the `ref=qr` marker is present (booking visitors untouched).
 *  - Strips the marker immediately so reloads / back-nav don't re-trigger.
 *  - Cancels the moment the user scrolls, taps, points or types.
 *  - Respects `prefers-reduced-motion` (no programmatic scroll at all).
 *  - Runs at most once per session, and only if still at the top of the page.
 */
const CARE_SCROLL_DELAY_MS = 1800;
const SESSION_KEY = 'hitch:qr-care-scroll';
const CARE_SECTION_ID = 'care';
// Cancel triggers — any sign the user has taken control of the page.
const INTERACTION_EVENTS = ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const;
// The fixed header overlays the top of the viewport, so centring is measured
// against the area below it. Falls back gracefully to full-viewport centring
// if the header isn't found.
const HEADER_SELECTOR = '.ed-header';

/** Smoothly scroll so the card is vertically centred in the area below the header. */
function scrollCardIntoCentre(el: HTMLElement) {
  const headerH = document.querySelector(HEADER_SELECTOR)?.getBoundingClientRect().height ?? 0;
  const rect = el.getBoundingClientRect();
  const elTopAbsolute = rect.top + window.scrollY;
  const available = window.innerHeight - headerH;
  // When the card is taller than the available space, fall back to pinning its
  // top just below the header (the most of it we can show).
  const gap = Math.max(0, (available - rect.height) / 2);
  const target = Math.max(0, elTopAbsolute - headerH - gap);
  window.scrollTo({ top: target, behavior: 'smooth' });
}

export function useQrCareScroll() {
  useEffect(() => {
    // QR arrivals only.
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') !== 'qr') return;

    // Drop the marker so a refresh, share, or back-nav won't fire this again
    // and the address bar stays clean.
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);

    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // If they've already started scrolling, don't yank them back.
    if (window.scrollY > 8) return;

    let cancelled = false;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort(); // detach the interaction listeners
      if (cancelled) return;
      sessionStorage.setItem(SESSION_KEY, '1');
      const el = document.getElementById(CARE_SECTION_ID);
      if (el) scrollCardIntoCentre(el);
    }, CARE_SCROLL_DELAY_MS);

    const cancel = () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    for (const evt of INTERACTION_EVENTS) {
      window.addEventListener(evt, cancel, { passive: true, signal: controller.signal });
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
}
