import {
  Building2,
  Camera,
  Droplet,
  Droplets,
  Flame,
  Mountain,
  MountainSnow,
  Sparkles,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { TourId } from '@/lib/types';

/**
 * Display-only metadata for the tour catalog — duration, a decorative Iceland
 * accent gradient, and a lucide icon. NOT pricing (that's the engine) and NOT
 * copy (name/blurb live in messages/*.json under `tours.items`). The accent
 * colors are decorative for a marketing surface, so hardcoded values are
 * allowed here (CLAUDE.md Color System Rules).
 */
export interface TourMeta {
  icon: LucideIcon;
  /** Decorative gradient for the card header. */
  accent: string;
  /** Approximate tour length in hours; omitted for open-ended transfers. */
  durationHours?: number;
}

/** Curated display order — flagship scenic tours first, short city ones last. */
export const TOUR_ORDER: readonly TourId[] = [
  'golden-circle',
  'south-coast',
  'silver-circle',
  'snaefellsnes',
  'reykjanes',
  'hvammsvik-return-4h',
  'hvammsvik-one-way',
  'reykjavik-sightseeing-2h',
  'city-center',
];

export const TOUR_META: Record<TourId, TourMeta> = {
  'golden-circle': { icon: Sparkles, accent: 'linear-gradient(135deg,#F59E0B,#B45309)', durationHours: 6 },
  'south-coast': { icon: Waves, accent: 'linear-gradient(135deg,#0EA5E9,#0F172A)', durationHours: 12 },
  'silver-circle': { icon: Mountain, accent: 'linear-gradient(135deg,#5EEAD4,#0E7490)', durationHours: 6 },
  snaefellsnes: { icon: MountainSnow, accent: 'linear-gradient(135deg,#A78BFA,#4338CA)', durationHours: 12 },
  reykjanes: { icon: Flame, accent: 'linear-gradient(135deg,#FB7185,#7F1D1D)', durationHours: 5 },
  'hvammsvik-return-4h': { icon: Droplets, accent: 'linear-gradient(135deg,#2DD4BF,#155E75)', durationHours: 4 },
  'hvammsvik-one-way': { icon: Droplet, accent: 'linear-gradient(135deg,#5EEAD4,#0D9488)' },
  'reykjavik-sightseeing-2h': { icon: Camera, accent: 'linear-gradient(135deg,#34D399,#065F46)', durationHours: 2 },
  'city-center': { icon: Building2, accent: 'linear-gradient(135deg,#818CF8,#3730A3)' },
};
