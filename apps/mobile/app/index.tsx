import { Redirect } from 'expo-router';

/** Native launch hands off to the in-app splash, then welcome or the last shell. */
export default function RootIndex() {
  return <Redirect href="/splash" />;
}
