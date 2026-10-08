import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll, SecButton } from '../../src/components/shell/ui';
import { useFlow } from '../../src/flow/FlowProvider';
import { NAV } from '../../src/flow/paths';

/** Frame 32 — asked before the map. "Non ora" is not asked again this session. */
export default function LocationPermissionScreen() {
  const router = useRouter();
  const flow = useFlow();
  const done = () => {
    flow.askLocation();
    router.replace(NAV.map);
  };
  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 10 }}>
          <PriButton label="Consenti" onPress={done} />
          <SecButton label="Non ora" onPress={done} />
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 80, gap: 12 }}>
        <H1>Vedere gli annunci vicino a te?</H1>
        <Body>Usiamo la posizione solo per centrare la mappa. Non la salviamo e non la mostriamo a nessuno. Funziona solo mentre usi la mappa.</Body>
        <Body>Puoi sempre cercare per comune o zona.</Body>
      </View>
    </ScreenScroll>
  );
}
