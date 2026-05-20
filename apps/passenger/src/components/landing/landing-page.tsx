'use client';

import { Header } from './header';
import { Hero } from './hero';
import {
  Coverage,
  EditorialTrips,
  Faq,
  FinalCtaFooter,
  Fleet,
  LiveConditions,
  Manifesto,
  PulledQuote,
  WordmarkSpacer,
} from './sections';

/**
 * Editorial premium landing — the composition the user landed on across the
 * design iterations: video-background hero with the booking card, wordmark
 * spacer, live conditions, trip cards, manifesto, fleet, pulled quote,
 * coverage, FAQ, and the finale/footer. Trilingual + RTL via next-intl.
 */
export function LandingPage() {
  return (
    <>
      <Header />
      <div className="ed-page">
        <Hero />
        <WordmarkSpacer />
        <LiveConditions />
        <EditorialTrips />
        <Manifesto />
        <Fleet />
        <PulledQuote />
        <Coverage />
        <Faq />
        <FinalCtaFooter />
      </div>
    </>
  );
}
