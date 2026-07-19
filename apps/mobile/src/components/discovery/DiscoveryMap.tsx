import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon as MapPolygon, type Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import type { Cluster } from '@easycasa/api-client';
import type { Bounds } from '../../api/discovery-hooks';
import { ClusterMarker } from './ClusterMarker';
import { useTheme } from '../../theme/useTheme';

export interface GeoPoint {
  lat: number;
  lng: number;
}

function regionToBounds(r: Region): Bounds {
  return {
    minLat: r.latitude - r.latitudeDelta / 2,
    maxLat: r.latitude + r.latitudeDelta / 2,
    minLng: r.longitude - r.longitudeDelta / 2,
    maxLng: r.longitude + r.longitudeDelta / 2,
  };
}

function zoomFromRegion(r: Region): number {
  return Math.max(0, Math.round(Math.log2(360 / r.longitudeDelta)));
}

/**
 * Discovery map (native). Emits (bounds, zoom) for Phase 20; tap-to-draw polygon
 * for area search. Web uses DiscoveryMap.web.tsx (MapLibre).
 */
export function DiscoveryMap({
  initialRegion,
  clusters,
  drawMode,
  onRegionChange,
  onSelectListing,
  onPolygonComplete,
}: {
  initialRegion: Region;
  clusters: Cluster[];
  drawMode: boolean;
  onRegionChange: (bounds: Bounds, zoom: number) => void;
  onSelectListing: (listingId: string) => void;
  onPolygonComplete: (polygon: GeoPoint[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const [vertices, setVertices] = useState<GeoPoint[]>([]);

  const addVertex = (e: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    if (!drawMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setVertices((v) => [...v, { lat: latitude, lng: longitude }]);
  };

  const finishPolygon = () => {
    if (vertices.length >= 3) onPolygonComplete(vertices);
    setVertices([]);
  };

  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        style={styles.fill}
        initialRegion={initialRegion}
        onRegionChangeComplete={(r) => onRegionChange(regionToBounds(r), zoomFromRegion(r))}
        onPress={addVertex}
      >
        {!drawMode &&
          clusters.map((c, i) => (
            <Marker
              key={`${c.lat}:${c.lng}:${i}`}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              onPress={() => {
                if (c.listingId) onSelectListing(c.listingId);
              }}
            >
              <ClusterMarker count={c.count} />
            </Marker>
          ))}
        {vertices.length >= 3 && (
          <MapPolygon
            coordinates={vertices.map((v) => ({ latitude: v.lat, longitude: v.lng }))}
            fillColor="rgba(59,201,168,0.15)"
            strokeColor={theme.colors.primary}
            strokeWidth={2}
          />
        )}
      </MapView>

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
  },
  drawHint: { fontSize: 13, fontWeight: '600' },
  drawBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
});
