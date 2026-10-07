import React from 'react';
import { View } from 'react-native';

import type { ListingPinMapProps } from './ListingPinMap';

/**
 * Web export cannot load react-native-maps. The pin stays on iOS and Android.
 */
export function ListingPinMap({ style }: ListingPinMapProps) {
  return <View style={style} />;
}
