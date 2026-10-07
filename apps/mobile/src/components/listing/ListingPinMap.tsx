import type { StyleProp, ViewStyle } from 'react-native';

export type ListingPinMapProps = {
  style?: StyleProp<ViewStyle>;
  latitude: number;
  longitude: number;
};

/**
 * TypeScript entry for ListingPinMap.{native,web}.tsx.
 * Metro resolves the platform file. The web bundle must not import react-native-maps.
 */
export function ListingPinMap(_props: ListingPinMapProps): null {
  return null;
}
