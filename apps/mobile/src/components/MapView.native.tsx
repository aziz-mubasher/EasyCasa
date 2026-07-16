import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, type Region as RNRegion } from 'react-native-maps';

import type { MapProps } from './Map';

const DEFAULT = { lat: 41.9028, lng: 12.4964, zoom: 6 }; // Italy

export default function EasyCasaMap({
  markers,
  onMarkerPress,
  onRegionChange,
  initial = DEFAULT,
}: MapProps) {
  const initialRegion: RNRegion = {
    latitude: initial.lat,
    longitude: initial.lng,
    latitudeDelta: 6,
    longitudeDelta: 6,
  };

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onRegionChangeComplete={(r) => {
        const west = r.longitude - r.longitudeDelta / 2;
        const east = r.longitude + r.longitudeDelta / 2;
        const south = r.latitude - r.latitudeDelta / 2;
        const north = r.latitude + r.latitudeDelta / 2;
        onRegionChange?.([west, south, east, north]);
      }}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          onPress={() => onMarkerPress?.(m.listing)}
        />
      ))}
    </MapView>
  );
}
