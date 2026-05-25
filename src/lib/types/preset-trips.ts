/**
 * Three preset routes shown on the landing page. Coordinates are fixed
 * landmarks; the booking flow uses these as pickup/dropoff straight from
 * the URL `?preset=<id>` rather than reverse-geocoding the labels.
 *
 * - KEF: Keflavík International Airport
 * - Reykjavík: city centre (101)
 * - Blue Lagoon: Bláa Lónið spa
 */

export const PRESET_TRIP_IDS = ['kef-to-rvk', 'rvk-to-kef', 'kef-to-blue-lagoon'] as const;
export type PresetTripId = (typeof PRESET_TRIP_IDS)[number];

interface GeoLandmark {
  lat: number;
  lng: number;
  address: string;
}

const LANDMARKS = {
  kef: { lat: 63.985, lng: -22.605, address: 'Keflavík International Airport (KEF)' },
  reykjavik: { lat: 64.146, lng: -21.942, address: 'Reykjavík 101' },
  blueLagoon: { lat: 63.881, lng: -22.449, address: 'Blue Lagoon (Bláa Lónið)' },
} as const satisfies Record<string, GeoLandmark>;

interface PresetTrip {
  id: PresetTripId;
  pickup: GeoLandmark;
  dropoff: GeoLandmark;
  pickupAirportCode?: string;
}

export const PRESET_TRIPS: Record<PresetTripId, PresetTrip> = {
  'kef-to-rvk': {
    id: 'kef-to-rvk',
    pickup: LANDMARKS.kef,
    dropoff: LANDMARKS.reykjavik,
    pickupAirportCode: 'KEF',
  },
  'rvk-to-kef': {
    id: 'rvk-to-kef',
    pickup: LANDMARKS.reykjavik,
    dropoff: LANDMARKS.kef,
  },
  'kef-to-blue-lagoon': {
    id: 'kef-to-blue-lagoon',
    pickup: LANDMARKS.kef,
    dropoff: LANDMARKS.blueLagoon,
    pickupAirportCode: 'KEF',
  },
};

export function getPresetTrip(id: string | null | undefined): PresetTrip | null {
  if (!id) return null;
  if ((PRESET_TRIP_IDS as readonly string[]).includes(id)) {
    return PRESET_TRIPS[id as PresetTripId];
  }
  return null;
}
