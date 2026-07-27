import React from 'react';
import { View, type ViewProps } from 'react-native';

/** Web stub — native maps are not bundled in export:web smoke tests. */
export default function MapView(props: ViewProps) {
  return <View {...props} />;
}

export function Marker(_props: Record<string, unknown>) {
  return null;
}

export function Polygon(_props: Record<string, unknown>) {
  return null;
}

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
