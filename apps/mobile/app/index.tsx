import { Redirect } from 'expo-router';

/**
 * Root entry. Without this, Expo Router picks the first route group that has an
 * index — alphabetically `(owner)` — so release builds open on My properties
 * instead of discovery.
 */
export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
