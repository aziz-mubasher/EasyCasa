import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Body, H1, PriButton, ScreenScroll, SecButton } from '../src/components/shell/ui';
import { useFlow } from '../src/flow/FlowProvider';
import { NAV, toHref } from '../src/flow/paths';

/** Frame 31 — the draft stays; only the session is gone. */
export default function SessionExpiredScreen() {
  const router = useRouter();
  const flow = useFlow();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const backTo = slug ? `${NAV.write}/${slug}` : NAV.search;

  return (
    <ScreenScroll
      footer={
        <View style={{ gap: 10 }}>
          <PriButton
            label="Accedi di nuovo"
            onPress={() => {
              flow.setReturnTo(backTo);
              router.push(NAV.signIn);
            }}
          />
          <SecButton label="Non ora" onPress={() => router.replace(slug ? toHref(`/listing/${slug}`) : NAV.search)} />
        </View>
      }
    >
      <View style={{ padding: 24, paddingTop: 72, gap: 12 }}>
        <H1>Sessione scaduta</H1>
        <Body>Accedi di nuovo per inviare. Il messaggio che hai scritto e la tua dichiarazione restano qui.</Body>
      </View>
    </ScreenScroll>
  );
}
