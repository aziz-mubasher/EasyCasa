/**
 * Platform router for the map. Metro resolves `Map.native.tsx` on iOS/Android
 * and `Map.web.tsx` on web; this file only exports the shared prop contract so
 * screens can import types without pulling in a platform impl.
 *
 * Screens should import the component from './MapView', not from here.
 */
import type { Listing } from '@easycasa/api-client';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  listing: Listing;
}

export interface MapProps {
  markers: MapMarker[];
  onMarkerPress?: (listing: Listing) => void;
  /** Called (debounced by the impl) when the viewport settles. */
  onRegionChange?: (bbox: [number, number, number, number]) => void;
  initial?: { lat: number; lng: number; zoom: number };
}
