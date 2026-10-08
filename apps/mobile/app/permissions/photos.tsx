import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll, SecButton } from '../../src/components/shell/ui';
import { useFlow } from '../../src/flow/FlowProvider';
import { publishPath } from '../../src/flow/paths';

/** Frame 33 — returns to the photo step of publish. */
export default function PhotosPermissionScreen() {
  const router = useRouter();
  const flow = useFlow();
  const done = (allow: boolean) => {
    flow.askPhotos(allow);
    router.replace(publishPath('photos'));
  };
  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 10 }}>
          <PriButton label="Consenti" onPress={() => done(true)} />
          <SecButton label="Non ora" onPress={() => done(false)} />
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 80, gap: 12 }}>
        <H1>Accesso alle foto</H1>
        <Body>Per caricare le foto della casa nel tuo annuncio. Scegli tu quali foto: carichiamo solo quelle che selezioni.</Body>
        <Body>Puoi dare accesso anche solo a foto selezionate.</Body>
      </View>
    </ScreenScroll>
  );
}
