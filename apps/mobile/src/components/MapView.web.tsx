import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

import type { MapProps } from './Map';

const DEFAULT = { lat: 41.9028, lng: 12.4964, zoom: 5 }; // Italy

/**
 * Web map uses MapLibre GL JS — the same engine as the Next.js public site —
 * so styling and behaviour stay consistent across the public and app surfaces.
 * The style URL should point at your self-hosted tiles / MapTiler key.
 */
export default function EasyCasaMap({
  markers,
  onMarkerPress,
  onRegionChange,
  initial = DEFAULT,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json', // TODO: self-hosted style
      center: [initial.lng, initial.lat],
      zoom: initial.zoom,
    });
    mapRef.current = map;

    map.on('moveend', () => {
      const b = map.getBounds();
      onRegionChange?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers when they change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = markers.map((m) => {
      const marker = new maplibregl.Marker().setLngLat([m.lng, m.lat]).addTo(map);
      marker.getElement().addEventListener('click', () => onMarkerPress?.(m.listing));
      return marker;
    });
  }, [markers, onMarkerPress]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
