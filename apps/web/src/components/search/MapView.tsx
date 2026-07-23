'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ListingSummary } from '@easycasa/shared';
import { getMapStyleUrl, logMapStyleMisconfiguration } from '@/lib/map-config';

export function MapView({ items }: { items: ListingSummary[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    logMapStyleMisconfiguration();

    const container = ref.current;
    if (!container || map.current) return;

    const style = getMapStyleUrl();
    const instance = new maplibregl.Map({
      container,
      style,
      center: [12.5, 42.5], // Italy
      zoom: 5,
    });
    instance.addControl(new maplibregl.NavigationControl(), 'top-right');
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    instance.on('error', (event) => {
      const message = event.error?.message ?? 'unknown MapLibre error';
      console.error(`[MapView] Basemap failed to load: ${message}`);
      setMapError('Basemap failed to load — check NEXT_PUBLIC_MAP_STYLE and rebuild the web image.');
    });

    // MapLibre skips tile requests when the container has zero size at init (common after SSR/hydration).
    const resize = () => instance.resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    map.current = instance;
    return () => {
      ro.disconnect();
      instance.remove();
      map.current = null;
    };
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

  if (mapError) {
    return (
      <div
        className="h-full w-full rounded-xl2 overflow-hidden border border-line flex items-center justify-center bg-paper p-4 text-center text-sm text-muted"
        role="alert"
      >
        {mapError}
      </div>
    );
  }

  return <div ref={ref} className="h-full w-full rounded-xl2 overflow-hidden border border-line" />;
}
