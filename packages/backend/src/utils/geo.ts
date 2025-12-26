/**
 * Haversine distance calculation and bounding box utilities for GPS queries.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

/**
 * Calculate a bounding box around a point for initial SQL filtering.
 * This is an approximation that works well for small radii (< 100km).
 * @param lat Center latitude in degrees
 * @param lon Center longitude in degrees
 * @param radiusMeters Radius in meters
 * @returns Bounding box coordinates
 */
export function getBoundingBox(lat: number, lon: number, radiusMeters: number): BoundingBox {
  // Approximate degrees per meter at the equator
  const metersPerDegreeLatitude = 111000;
  // Longitude degrees vary with latitude
  const metersPerDegreeLongitude = 111000 * Math.cos((lat * Math.PI) / 180);

  const latDelta = radiusMeters / metersPerDegreeLatitude;
  const lonDelta = metersPerDegreeLongitude > 0
    ? radiusMeters / metersPerDegreeLongitude
    : 180; // Handle edge case at poles

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

/**
 * Default search radius for nearby sessions in meters.
 */
export const DEFAULT_SEARCH_RADIUS_METERS = 500;
