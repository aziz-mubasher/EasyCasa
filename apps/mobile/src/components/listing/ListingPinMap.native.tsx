import React from 'react';
import MapView, { Marker } from 'react-native-maps';

import type { ListingPinMapProps } from './ListingPinMap';

/** Native listing pin. The web file does not load react-native-maps. */
export function ListingPinMap({ style, latitude, longitude }: ListingPinMapProps) {
  return (
    <MapView
      style={style}
      pointerEvents="none"
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
}
