export interface GeoCoord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function calculateDistance(from: GeoCoord, to: GeoCoord): number {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export const ICELAND_BOUNDS = {
  north: 66.6,
  south: 63.3,
  west: -24.6,
  east: -13.4,
};

export function isWithinIceland({ lat, lng }: GeoCoord): boolean {
  return (
    lat >= ICELAND_BOUNDS.south &&
    lat <= ICELAND_BOUNDS.north &&
    lng >= ICELAND_BOUNDS.west &&
    lng <= ICELAND_BOUNDS.east
  );
}
