import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll, SecButton } from '../../src/components/shell/ui';
import { useFlow } from '../../src/flow/FlowProvider';
import { NAV, sentPath } from '../../src/flow/paths';

/** Frame 34 — asked after the first message, not at launch. */
export default function NotificationsPermissionScreen() {
  const router = useRouter();
  const flow = useFlow();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const done = () => {
    flow.askNotifications();
    router.replace(slug ? sentPath(slug) : NAV.profileSeeker);
  };
  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 10 }}>
          <PriButton label="Attiva le notifiche" onPress={done} />
          <SecButton label="Non ora" onPress={done} />
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 80, gap: 12 }}>
        <H1>Vuoi sapere quando risponde?</H1>
        <Body>Ti avvisiamo solo per quello che riguarda le tue case e le tue richieste. Risposte del proprietario e conferme di visita. Nuovi annunci delle ricerche che hai salvato. Niente pubblicità.</Body>
        <Body>Le puoi cambiare in Profilo › Avvisi.</Body>
      </View>
    </ScreenScroll>
  );
}
