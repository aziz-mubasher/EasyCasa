import type { Cluster, ListingPin } from './types';

/** Below this zoom pins are grouped; at/above it every pin is its own marker. */
export const SINGLE_MARKER_ZOOM = 16;

/**
 * Cell size in degrees for a zoom level. Halves with each zoom step (like map
 * tiles), so clusters get finer as the user zooms in.
 */
export function cellSizeForZoom(zoom: number): number {
  const z = Math.max(0, Math.min(zoom, SINGLE_MARKER_ZOOM));
  return 360 / 2 ** z;
}

/**
 * Grid-cluster pins for the given zoom. Each occupied cell becomes one cluster
 * at the centroid of its pins; a cell with a single pin carries that listing id.
 */
export function clusterPins(pins: readonly ListingPin[], zoom: number): Cluster[] {
  if (zoom >= SINGLE_MARKER_ZOOM) {
    return pins.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      count: 1,
      listingId: p.listingId,
    }));
  }

  const cell = cellSizeForZoom(zoom);
  const buckets = new Map<
    string,
    { sumLat: number; sumLng: number; count: number; lastId: string }
  >();

  for (const p of pins) {
    const gx = Math.floor(p.lng / cell);
    const gy = Math.floor(p.lat / cell);
    const key = `${gx}:${gy}`;
    const b = buckets.get(key);
    if (b) {
      b.sumLat += p.lat;
      b.sumLng += p.lng;
      b.count += 1;
      b.lastId = p.listingId;
    } else {
      buckets.set(key, { sumLat: p.lat, sumLng: p.lng, count: 1, lastId: p.listingId });
    }
  }

  const clusters: Cluster[] = [];
  for (const b of buckets.values()) {
    clusters.push({
      lat: b.sumLat / b.count,
      lng: b.sumLng / b.count,
      count: b.count,
      listingId: b.count === 1 ? b.lastId : null,
    });
  }
  return clusters;
}
