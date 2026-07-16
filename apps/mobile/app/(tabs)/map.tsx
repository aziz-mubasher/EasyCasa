import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { Listing, SearchParams } from '@easycasa/api-client';
import EasyCasaMap from '../../src/components/MapView';
import type { MapMarker } from '../../src/components/Map';
import { useListings } from '../../src/api/hooks';

export default function MapScreen() {
  const router = useRouter();
  const [bbox, setBbox] = useState<SearchParams['bbox']>(undefined);

  const { data } = useListings(useMemo<SearchParams>(() => ({ bbox, pageSize: 200 }), [bbox]));

  const markers = useMemo<MapMarker[]>(
    () =>
      (data?.items ?? [])
        .filter((l): l is Listing & { location: NonNullable<Listing['location']> } => l.location !== null)
        .map((l) => ({ id: l.id, lat: l.location.lat, lng: l.location.lng, listing: l })),
    [data],
  );

  return (
    <View style={styles.root}>
      <EasyCasaMap
        markers={markers}
        onRegionChange={setBbox}
        onMarkerPress={(l) => router.push(`/listing/${l.slug}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
