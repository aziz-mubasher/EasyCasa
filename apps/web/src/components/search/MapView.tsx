'use client';
import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ListingSummary } from '@easycasa/shared';

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function MapView({ items }: { items: ListingSummary[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      center: [12.5, 42.5], // Italy
      zoom: 5,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers: maplibregl.Marker[] = [];
    for (const l of items) {
      if (l.latitude == null || l.longitude == null) continue;
      const el = document.createElement('div');
      el.className = 'rounded-full bg-azure text-paper data text-[10px] px-2 py-1 shadow';
      el.textContent = l.price != null ? `€${Math.round(l.price / 1000)}k` : '·';
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([l.longitude, l.latitude]).addTo(m));
    }
    return () => markers.forEach((mk) => mk.remove());
  }, [items]);

  return <div ref={ref} className="h-full w-full rounded-xl2 overflow-hidden border border-line" />;
}
