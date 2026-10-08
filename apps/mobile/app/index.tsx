import { Redirect } from 'expo-router';

/** EC-APP-1 design v2 entry — welcome chooser (Cerco / Vendo). */
export default function RootIndex() {
  return <Redirect href="/(welcome)" />;
}
