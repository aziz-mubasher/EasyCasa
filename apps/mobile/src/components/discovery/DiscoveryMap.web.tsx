import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import maplibregl from 'maplibre-gl';
import { useTranslation } from 'react-i18next';

import type { Cluster } from '@easycasa/api-client';
import type { Bounds } from '../../api/discovery-hooks';
import { useTheme } from '../../theme/useTheme';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RegionLike {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Web discovery map (MapLibre) — same props as the native DiscoveryMap.
 */
export function DiscoveryMap({
  initialRegion,
  clusters,
  drawMode,
  onRegionChange,
  onSelectListing,
  onPolygonComplete,
}: {
  initialRegion: RegionLike;
  clusters: Cluster[];
  drawMode: boolean;
  onRegionChange: (bounds: Bounds, zoom: number) => void;
  onSelectListing: (listingId: string) => void;
  onPolygonComplete: (polygon: GeoPoint[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [vertices, setVertices] = useState<GeoPoint[]>([]);
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const onSelectRef = useRef(onSelectListing);
  onSelectRef.current = onSelectListing;
  const onRegionRef = useRef(onRegionChange);
  onRegionRef.current = onRegionChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const zoom = Math.max(0, Math.round(Math.log2(360 / initialRegion.longitudeDelta)));
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [initialRegion.longitude, initialRegion.latitude],
      zoom,
    });
    mapRef.current = map;

    const emitBounds = () => {
      const b = map.getBounds();
      onRegionRef.current(
        {
          minLat: b.getSouth(),
          maxLat: b.getNorth(),
          minLng: b.getWest(),
          maxLng: b.getEast(),
        },
        Math.round(map.getZoom()),
      );
    };
    map.on('load', emitBounds);
    map.on('moveend', emitBounds);

    map.on('click', (e) => {
      if (!drawModeRef.current) return;
      setVertices((v) => [...v, { lat: e.lngLat.lat, lng: e.lngLat.lng }]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (drawMode) return;
    for (const c of clusters) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = c.count === 1 ? '•' : String(c.count);
      el.style.cssText = [
        'border:2px solid #fff',
        `background:${theme.colors.primary}`,
        `color:${theme.colors.primaryText}`,
        'border-radius:999px',
        'min-width:34px',
        'min-height:34px',
        'font-weight:800',
        'font-size:12px',
        'cursor:pointer',
        'padding:4px 8px',
      ].join(';');
      const marker = new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
      if (c.listingId) {
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current(c.listingId as string);
        });
      }
      markersRef.current.push(marker);
    }
  }, [clusters, drawMode, theme.colors.primary, theme.colors.primaryText]);

  useEffect(() => {
    if (!drawMode) setVertices([]);
  }, [drawMode]);

  const finishPolygon = () => {
    if (vertices.length >= 3) onPolygonComplete(vertices);
    setVertices([]);
  };

  return (
    <View style={styles.fill}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {drawMode && (
        <View style={styles.drawBar}>
          <Text style={[styles.drawHint, { color: '#fff' }]}>
            {vertices.length < 3
              ? t('discovery.drawHint')
              : t('discovery.drawPoints', { count: vertices.length })}
          </Text>
          <Pressable
            onPress={finishPolygon}
            disabled={vertices.length < 3}
            style={[
              styles.drawBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: vertices.length < 3 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.colors.primaryText, fontWeight: '700' }}>
              {t('discovery.searchArea')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  drawBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 12,
    zIndex: 2,
  },
  drawHint: { fontSize: 13, fontWeight: '600' },
  drawBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
});
