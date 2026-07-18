import type { BBox, GeoPoint, Polygon } from './types';

export class InvalidBBoxError extends Error {}

export function validateBBox(b: BBox): BBox {
  if (
    b.minLat < -90 ||
    b.maxLat > 90 ||
    b.minLng < -180 ||
    b.maxLng > 180 ||
    b.minLat > b.maxLat ||
    b.minLng > b.maxLng
  ) {
    throw new InvalidBBoxError('Invalid bounding box');
  }
  return b;
}

export function inBBox(p: GeoPoint, b: BBox): boolean {
  return (
    p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng
  );
}

/**
 * Ray-casting point-in-polygon. The ring is treated as closed (last point
 * joins the first).
 */
export function pointInPolygon(p: GeoPoint, ring: Polygon): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const intersects =
      a.lat > p.lat !== b.lat > p.lat &&
      p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Tightest bounding box that contains the polygon (for the index pre-filter). */
export function bboxOfPolygon(ring: Polygon): BBox {
  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}
